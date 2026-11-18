/**
 * Stock safety against a real throwaway Postgres (TEST_DATABASE_URL). Skipped when none is configured.
 * NEVER point TEST_DATABASE_URL at a real database: these tests create and delete products and orders.
 *
 *   docker run -d --name lesparo-test-pg -e POSTGRES_PASSWORD=test -e POSTGRES_DB=lesparo -p 55432:5432 postgres:16
 *   TEST_DATABASE_URL=postgresql://postgres:test@localhost:55432/lesparo npx vitest run tests/unit/inventory-safety.test.ts
 */
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife() {}, cacheTag() {}, updateTag() {}, refresh() {}, revalidateTag() {} }));
vi.mock("next/navigation", () => ({ redirect() {} }));
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), connection: async () => {} }));
vi.mock("@/lib/email/notifications", () => ({ notifyOrderStatus() {}, notifyOrderPlaced() {}, notifyPaymentSuccess() {}, notifyPaymentFailed() {}, retryFailedEmails: async () => 0 }));
const auth = vi.hoisted(() => ({ session: null as null | { userId: string; email: string; isAdmin: boolean } }));
vi.mock("@/lib/auth/staff", () => {
  class AuthorizationError extends Error {}
  return {
    AuthorizationError,
    requireStaff: async () => {
      if (!auth.session) throw new AuthorizationError("no session");
      return auth.session;
    },
    requireAdmin: async () => {
      if (!auth.session?.isAdmin) throw new AuthorizationError("admin only");
      return auth.session;
    },
  };
});

const DB = process.env.TEST_DATABASE_URL;
type Db = typeof import("@/lib/db");
let prisma: Db["prisma"];
let orders: typeof import("@/lib/services/orders");
let stock: typeof import("@/lib/inventory/stock");
let inv: typeof import("@/app/admin/(panel)/inventory/actions");
let ordAct: typeof import("@/app/admin/(panel)/orders/actions");
let life: typeof import("@/lib/services/order-lifecycle");
let pay: typeof import("@/lib/services/payments");
let ip = 0;
const client = () => `10.8.0.${++ip}`;
const admin = () => (auth.session = { userId: "a1", email: "admin@x", isAdmin: true });
const sales = () => (auth.session = { userId: "s1", email: "sales@x", isAdmin: false });

async function product(stockBySize: Record<string, number>, threshold = 3) {
  const sizes = Object.keys(stockBySize).filter((s) => s !== "");
  const p = await prisma.product.create({ data: { name: `P ${randomUUID().slice(0, 5)}`, slug: `p-${randomUUID()}`, is_published: true, retail_enabled: true, price: 500, sizes, track_inventory: true, low_stock_threshold: threshold } });
  for (const [size, quantity] of Object.entries(stockBySize)) await prisma.productStock.create({ data: { product_id: p.id, size, quantity } });
  return p;
}
const qty = async (id: string, size = "M") => (await prisma.productStock.findUniqueOrThrow({ where: { product_id_size: { product_id: id, size } } })).quantity;
const input = (productId: string, o: { quantity?: number; size?: string | null; method?: "cod" | "razorpay" } = {}) => ({
  idempotencyKey: randomUUID(), customerName: "Test Buyer", email: "b@example.com", phone: "9000000000", addressLine: "1 Test Street", city: "Erode", state: "TN", postcode: "638001", notes: null,
  paymentMethod: o.method ?? "cod", items: [{ productId, size: o.size === undefined ? "M" : o.size, quantity: o.quantity ?? 1 }],
});
const place = async (productId: string, o: Parameters<typeof input>[1] = {}) => {
  const r = await orders.placeOrder(input(productId, o), client());
  if (!r.ok || !r.orderId) throw new Error(`order failed: ${r.ok ? "no id" : r.message}`);
  return r as typeof r & { orderId: string };
};
const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const setStatus = (orderId: string, status: string) => ordAct.updateOrder(orderId, {}, fd({ status, paymentStatus: "pending", trackingCarrier: "", trackingNumber: "", trackingUrl: "" }));

describe.skipIf(!DB)("stock safety (real Postgres)", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = DB!;
    Object.assign(process.env, { NEXT_PUBLIC_SITE_URL: "http://localhost:3000", RATE_LIMIT_SALT: "salt-123456", RAZORPAY_KEY_ID: "rzp_test_x", RAZORPAY_KEY_SECRET: "k_secret", RAZORPAY_WEBHOOK_SECRET: "wh_secret" });
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: DB!, DIRECT_URL: DB! }, stdio: "pipe" });
    prisma = (await import("@/lib/db")).prisma;
    orders = await import("@/lib/services/orders");
    stock = await import("@/lib/inventory/stock");
    inv = await import("@/app/admin/(panel)/inventory/actions");
    ordAct = await import("@/app/admin/(panel)/orders/actions");
    life = await import("@/lib/services/order-lifecycle");
    pay = await import("@/lib/services/payments");
    await prisma.rateLimit.deleteMany();
  }, 120_000);
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  describe("baseline: what already worked must keep working", () => {
    it("the last unit goes to exactly one of two simultaneous buyers", async () => {
      const p = await product({ M: 1 });
      const r = await Promise.all([orders.placeOrder(input(p.id), client()), orders.placeOrder(input(p.id), client())]);
      expect(r.filter((x) => x.ok).length).toBe(1);
      expect(await qty(p.id)).toBe(0);
    });
    it("cannot buy more than is on hand", async () => {
      const p = await product({ M: 2 });
      expect((await orders.placeOrder(input(p.id, { quantity: 3 }), client())).ok).toBe(false);
      expect(await qty(p.id)).toBe(2);
    });
    it("sales staff cannot change stock", async () => {
      const p = await product({ M: 5 });
      sales();
      const r = await inv.saveStock(p.id, {}, fd({ track: "on", threshold: "3", "qty:M": "999", "was:M": "5" }));
      expect(r.ok).toBeUndefined();
      expect(await qty(p.id)).toBe(5);
    });
  });

  describe("cancelling twice at once restocks once (H2)", () => {
    it("two simultaneous releases return the units once", async () => {
      const p = await product({ M: 5 });
      const o = await place(p.id, { quantity: 2 });
      expect(await qty(p.id)).toBe(3);
      await Promise.all([prisma.$transaction((tx) => stock.releaseStock(tx, o.orderId, "a")), prisma.$transaction((tx) => stock.releaseStock(tx, o.orderId, "b"))]);
      expect(await qty(p.id)).toBe(5);
      expect(await prisma.stockMovement.count({ where: { order_id: o.orderId, reason: "order_cancelled" } })).toBe(1);
    });
    it("ten simultaneous releases still return the units once", async () => {
      const p = await product({ M: 5 });
      const o = await place(p.id, { quantity: 2 });
      await Promise.all(Array.from({ length: 10 }, (_, i) => prisma.$transaction((tx) => stock.releaseStock(tx, o.orderId, `x${i}`))));
      expect(await qty(p.id)).toBe(5);
    });
    it("one after the other still restocks once", async () => {
      const p = await product({ M: 5 });
      const o = await place(p.id, { quantity: 2 });
      await prisma.$transaction((tx) => stock.releaseStock(tx, o.orderId, "a"));
      await prisma.$transaction((tx) => stock.releaseStock(tx, o.orderId, "b"));
      expect(await qty(p.id)).toBe(5);
    });
    it("two staff cancelling the same order at once restock once", async () => {
      const p = await product({ M: 5 });
      const o = await place(p.id, { quantity: 2 });
      sales();
      await Promise.all([setStatus(o.orderId, "cancelled"), setStatus(o.orderId, "cancelled")]);
      expect(await qty(p.id)).toBe(5);
    });
  });

  describe("a cancelled order cannot be reopened (H4)", () => {
    it("refuses to reopen and leaves stock alone", async () => {
      const p = await product({ M: 2 });
      const o = await place(p.id);
      sales();
      expect((await setStatus(o.orderId, "cancelled")).ok).toBe(true);
      expect(await qty(p.id)).toBe(2);
      const again = await setStatus(o.orderId, "confirmed");
      expect(again.ok).toBeUndefined();
      expect(again.error).toMatch(/cannot be reopened/);
      expect((await prisma.retailOrder.findUniqueOrThrow({ where: { id: o.orderId } })).status).toBe("cancelled");
      expect(await qty(p.id)).toBe(2);
    });
    it("normal progress still works: new -> confirmed -> shipped -> delivered, stock untouched", async () => {
      const p = await product({ M: 4 });
      const o = await place(p.id);
      sales();
      for (const s of ["confirmed", "shipped", "delivered"]) expect((await setStatus(o.orderId, s)).ok).toBe(true);
      expect(await qty(p.id)).toBe(3);
    });
    it("saving a cancelled order as cancelled (for example to add tracking notes) is still allowed and does not restock again", async () => {
      const p = await product({ M: 2 });
      const o = await place(p.id);
      sales();
      await setStatus(o.orderId, "cancelled");
      expect((await setStatus(o.orderId, "cancelled")).ok).toBe(true);
      expect(await qty(p.id)).toBe(2);
    });
  });

  describe("cancelling and returning stock happen together (M1)", () => {
    it("a cancellation that fails while returning stock leaves the order not cancelled", async () => {
      const INT_MAX = 2147483647;
      const p = await product({ M: INT_MAX - 1 });
      const o = await place(p.id, { quantity: 2 });
      // Force the stock write in the cancellation to fail: the column is a 32-bit integer.
      await prisma.productStock.update({ where: { product_id_size: { product_id: p.id, size: "M" } }, data: { quantity: INT_MAX } });
      sales();
      const r = await setStatus(o.orderId, "cancelled");
      expect(r.ok).toBeUndefined();
      const after = await prisma.retailOrder.findUniqueOrThrow({ where: { id: o.orderId } });
      expect(after.status).toBe("new");
      expect(await prisma.orderAudit.count({ where: { order_id: o.orderId, to_value: "cancelled" } })).toBe(0);
      expect(await qty(p.id)).toBe(INT_MAX);
    });
    it("once the problem is gone the same cancellation can be retried and returns the stock", async () => {
      const p = await product({ M: 10 });
      const o = await place(p.id, { quantity: 2 });
      sales();
      expect((await setStatus(o.orderId, "cancelled")).ok).toBe(true);
      expect(await qty(p.id)).toBe(10);
      expect(await prisma.orderAudit.count({ where: { order_id: o.orderId, to_value: "cancelled" } })).toBe(1);
    });
  });

  describe("saving stock cannot overwrite sales or lose history (H1, M2, M5)", () => {
    const save = (id: string, o: Record<string, string>) => inv.saveStock(id, {}, fd({ track: "on", threshold: "3", ...o }));

    it("a stale form that only changes the threshold leaves sales alone", async () => {
      const p = await product({ M: 5 });
      admin();
      await place(p.id, { quantity: 2 }); // the admin's page still says 5
      const r = await save(p.id, { threshold: "4", "qty:M": "5", "was:M": "5" });
      expect(r.ok).toBe(true);
      expect(await qty(p.id)).toBe(3);
      expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).low_stock_threshold).toBe(4);
    });

    it("an edit made from a stale page is refused, and nothing in that save is applied", async () => {
      const p = await product({ M: 5, L: 5 });
      admin();
      await place(p.id, { quantity: 2 }); // M is now 3
      const r = await save(p.id, { threshold: "9", "qty:M": "20", "was:M": "5", "qty:L": "7", "was:L": "5" });
      expect(r.ok).toBeUndefined();
      expect(r.error).toMatch(/changed from 5 to 3/);
      expect(await qty(p.id)).toBe(3);
      expect(await qty(p.id, "L")).toBe(5);
      expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).low_stock_threshold).toBe(3);
    });

    it("an edit from an up-to-date page is applied and logged with the true before and after", async () => {
      const p = await product({ M: 5 });
      admin();
      const r = await save(p.id, { "qty:M": "12", "was:M": "5", note: "delivery" });
      expect(r.ok).toBe(true);
      expect(await qty(p.id)).toBe(12);
      const m = await prisma.stockMovement.findFirstOrThrow({ where: { product_id: p.id } });
      expect([m.delta, m.quantity_after, m.reason, m.note, m.actor]).toEqual([7, 12, "adjustment", "delivery", "admin@x"]);
    });

    it("two admins saving at once: one wins, the other is told, and the history adds up", async () => {
      const p = await product({ M: 10 });
      admin();
      const [a, b] = await Promise.all([save(p.id, { "qty:M": "20", "was:M": "10" }), save(p.id, { "qty:M": "30", "was:M": "10" })]);
      expect([a.ok, b.ok].filter(Boolean).length).toBe(1);
      expect([a.error, b.error].filter(Boolean)[0]).toMatch(/changed from 10 to/);
      const final = await qty(p.id);
      expect([20, 30]).toContain(final);
      const moves = await prisma.stockMovement.findMany({ where: { product_id: p.id } });
      expect(moves.length).toBe(1);
      expect(10 + moves.reduce((n, m) => n + m.delta, 0)).toBe(final);
    });

    it("saving twice with the same values changes nothing the second time", async () => {
      const p = await product({ M: 5 });
      admin();
      await save(p.id, { "qty:M": "9", "was:M": "5" });
      const again = await save(p.id, { "qty:M": "9", "was:M": "9" });
      expect(again.ok).toBe(true);
      expect(await prisma.stockMovement.count({ where: { product_id: p.id } })).toBe(1);
    });

    it("a blank quantity is an error, not zero", async () => {
      const p = await product({ M: 8 });
      admin();
      const r = await save(p.id, { "qty:M": "", "was:M": "8" });
      expect(r.ok).toBeUndefined();
      expect(r.fields?.["qty:M"]).toMatch(/Enter a number/);
      expect(await qty(p.id)).toBe(8);
    });

    it("negative, fractional and missing was-values are refused", async () => {
      const p = await product({ M: 8 });
      admin();
      expect((await save(p.id, { "qty:M": "-1", "was:M": "8" })).ok).toBeUndefined();
      expect((await save(p.id, { "qty:M": "2.5", "was:M": "8" })).ok).toBeUndefined();
      const noWas = await inv.saveStock(p.id, {}, fd({ track: "on", threshold: "3", "qty:M": "9" }));
      expect(noWas.error).toMatch(/out of date/);
      expect(await qty(p.id)).toBe(8);
    });

    it("a size with no stock row yet can be set for the first time and is logged as the initial count", async () => {
      const p = await prisma.product.create({ data: { name: "New", slug: `n-${randomUUID()}`, is_published: true, sizes: ["M"], track_inventory: false } });
      admin();
      const r = await save(p.id, { "qty:M": "6", "was:M": "0" });
      expect(r.ok).toBe(true);
      expect(await qty(p.id)).toBe(6);
      expect((await prisma.stockMovement.findFirstOrThrow({ where: { product_id: p.id } })).reason).toBe("initial");
    });

    it("sales staff and signed-out visitors still cannot save", async () => {
      const p = await product({ M: 5 });
      sales();
      expect((await save(p.id, { "qty:M": "99", "was:M": "5" })).ok).toBeUndefined();
      auth.session = null;
      expect((await save(p.id, { "qty:M": "99", "was:M": "5" })).ok).toBeUndefined();
      expect(await qty(p.id)).toBe(5);
    });
  });

  describe("unpaid online orders give their stock back (H3)", () => {
    const later = (mins: number) => new Date(Date.now() + mins * 60_000);
    const gateway = () => ({
      createOrder: async (i: { amount: number; currency: string }) => ({ id: `order_${randomUUID().slice(0, 8)}`, amount: i.amount, currency: i.currency }),
      fetchPayment: async (): Promise<never> => {
        throw new Error("n/a");
      },
      fetchOrderPayments: async () => [],
    });

    it("an online order takes stock and gets a payment deadline about 30 minutes out", async () => {
      const p = await product({ M: 5 });
      const o = await place(p.id, { quantity: 2, method: "razorpay" });
      expect(await qty(p.id)).toBe(3);
      const row = await prisma.retailOrder.findUniqueOrThrow({ where: { id: o.orderId } });
      const mins = (row.payment_due_at!.getTime() - Date.now()) / 60000;
      expect(mins).toBeGreaterThan(25);
      expect(mins).toBeLessThan(31);
    });

    it("cash on delivery orders have no deadline and are never expired", async () => {
      const p = await product({ M: 5 });
      const o = await place(p.id, { method: "cod" });
      expect((await prisma.retailOrder.findUniqueOrThrow({ where: { id: o.orderId } })).payment_due_at).toBeNull();
      expect(await life.expireUnpaidOrders(later(24 * 60))).not.toContain(o.orderId);
      expect(await qty(p.id)).toBe(4);
    });

    it("nothing happens before the deadline", async () => {
      const p = await product({ M: 5 });
      const o = await place(p.id, { method: "razorpay" });
      expect(await life.expireUnpaidOrders(new Date())).not.toContain(o.orderId);
      expect(await qty(p.id)).toBe(4);
    });

    it("after the deadline the order is cancelled, the stock returns once, and it is logged as the system", async () => {
      const p = await product({ M: 5 });
      const o = await place(p.id, { quantity: 3, method: "razorpay" });
      expect(await life.expireUnpaidOrders(later(31))).toContain(o.orderId);
      expect((await prisma.retailOrder.findUniqueOrThrow({ where: { id: o.orderId } })).status).toBe("cancelled");
      expect(await qty(p.id)).toBe(5);
      expect(await life.expireUnpaidOrders(later(31))).not.toContain(o.orderId);
      expect(await qty(p.id)).toBe(5);
      expect((await prisma.orderAudit.findFirstOrThrow({ where: { order_id: o.orderId, actor: "system" } })).to_value).toMatch(/cancelled/);
    });

    it("two releases at the same moment return the stock once", async () => {
      const p = await product({ M: 5 });
      const o = await place(p.id, { quantity: 2, method: "razorpay" });
      await Promise.all([life.expireUnpaidOrders(later(31)), life.expireUnpaidOrders(later(31)), life.expireUnpaidOrders(later(31))]);
      expect(await qty(p.id)).toBe(5);
      expect(await prisma.stockMovement.count({ where: { order_id: o.orderId, reason: "order_cancelled" } })).toBe(1);
    });

    it("a failed payment is released too once the deadline passes", async () => {
      const p = await product({ M: 5 });
      const o = await place(p.id, { method: "razorpay" });
      await prisma.retailOrder.update({ where: { id: o.orderId }, data: { payment_status: "failed" } });
      expect(await life.expireUnpaidOrders(later(31))).toContain(o.orderId);
      expect(await qty(p.id)).toBe(5);
    });

    it("a paid order and an order waiting for capture are never cancelled", async () => {
      const p = await product({ M: 5 });
      const paid = await place(p.id, { method: "razorpay" });
      const waiting = await place(p.id, { method: "razorpay" });
      await prisma.retailOrder.update({ where: { id: paid.orderId }, data: { payment_status: "paid" } });
      await prisma.retailOrder.update({ where: { id: waiting.orderId }, data: { payment_status: "verifying" } });
      const done = await life.expireUnpaidOrders(later(120));
      expect(done).not.toContain(paid.orderId);
      expect(done).not.toContain(waiting.orderId);
      expect(await qty(p.id)).toBe(3);
    });

    it("an order that is already cancelled is not released a second time", async () => {
      const p = await product({ M: 5 });
      const o = await place(p.id, { method: "razorpay" });
      sales();
      await setStatus(o.orderId, "cancelled");
      expect(await qty(p.id)).toBe(5);
      await life.expireUnpaidOrders(later(31));
      expect(await qty(p.id)).toBe(5);
    });

    it("a buyer who starts paying gets a fresh window", async () => {
      const p = await product({ M: 5 });
      const o = await place(p.id, { method: "razorpay" });
      await prisma.retailOrder.update({ where: { id: o.orderId }, data: { payment_due_at: later(1) } });
      const row = await prisma.retailOrder.findUniqueOrThrow({ where: { id: o.orderId } });
      const s = await pay.createPaymentSession(row.order_number, row.access_token!, client(), gateway() as never);
      expect(s.ok).toBe(true);
      const after = await prisma.retailOrder.findUniqueOrThrow({ where: { id: o.orderId } });
      expect((after.payment_due_at!.getTime() - Date.now()) / 60000).toBeGreaterThan(25);
    });

    it("the freed unit can be bought by someone else", async () => {
      const p = await product({ M: 1 });
      const first = await place(p.id, { method: "razorpay" });
      expect((await orders.placeOrder(input(p.id), client())).ok).toBe(false);
      await life.expireUnpaidOrders(later(31));
      expect((await orders.placeOrder(input(p.id), client())).ok).toBe(true);
      expect((await prisma.retailOrder.findUniqueOrThrow({ where: { id: first.orderId } })).status).toBe("cancelled");
    });

    it("the release job route runs it (with the secret) and is closed without it", async () => {
      process.env.CRON_SECRET = "cron-secret-for-tests-0123456789";
      const route = await import("@/app/api/jobs/run/route");
      const p = await product({ M: 5 });
      const o = await place(p.id, { method: "razorpay" });
      await prisma.retailOrder.update({ where: { id: o.orderId }, data: { payment_due_at: new Date(Date.now() - 1000) } });
      const denied = await route.GET(new Request("http://x/api/jobs/run"));
      expect(denied.status).toBe(401);
      expect(await qty(p.id)).toBe(4);
      const ok = await route.GET(new Request("http://x/api/jobs/run", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
      expect(ok.status).toBe(200);
      expect((await ok.json()).expiredOrders).toBeGreaterThanOrEqual(1);
      expect(await qty(p.id)).toBe(5);
    });
  });
});
