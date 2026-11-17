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
      const r = await inv.saveStock(p.id, {}, fd({ track: "on", threshold: "3", "qty:M": "999" }));
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
});
