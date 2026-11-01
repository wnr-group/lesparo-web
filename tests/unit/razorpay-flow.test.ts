/**
 * The payment flow against a real (temporary) SQLite database with every migration applied, and a fake Razorpay.
 * No network and no real money: the gateway is a controllable stub.
 */
import { execSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { GatewayPayment } from "@/lib/payments/core";
import type { RazorpayGateway } from "@/lib/payments/razorpay";

vi.mock("server-only", () => ({}));

const KEY_SECRET = "test_key_secret_not_real";
const WEBHOOK_SECRET = "test_webhook_secret_not_real";
const dir = mkdtempSync(join(tmpdir(), "lesparo-pay-"));

type Svc = typeof import("@/lib/services/payments");
type Db = typeof import("@/lib/db");
let svc: Svc;
let prisma: Db["prisma"];

/** A controllable stand-in for Razorpay. */
class FakeGateway implements RazorpayGateway {
  created: { amount: number; currency: string; receipt: string }[] = [];
  payments = new Map<string, GatewayPayment>();
  failCreate = false;
  failFetch = false;
  async createOrder(input: { amount: number; currency: string; receipt: string }) {
    if (this.failCreate) throw new Error("timeout");
    this.created.push(input);
    return { id: `order_${this.created.length}_${randomUUID().slice(0, 6)}`, amount: input.amount, currency: input.currency };
  }
  async fetchPayment(id: string) {
    if (this.failFetch) throw new Error("timeout");
    const p = this.payments.get(id);
    if (!p) throw new Error("not found");
    return p;
  }
  async fetchOrderPayments(orderId: string) {
    return [...this.payments.values()].filter((p) => p.order_id === orderId);
  }
}

let gw: FakeGateway;
let ip = 0;
const client = () => `10.0.0.${++ip}`;

beforeAll(async () => {
  const url = `file:${join(dir, "test.db").replace(/\\/g, "/")}`;
  process.env.DATABASE_URL = url;
  Object.assign(process.env, { NEXT_PUBLIC_SITE_URL: "http://localhost:3000", RATE_LIMIT_SALT: "test-salt-123456", RAZORPAY_KEY_ID: "rzp_test_dummy", RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET });
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  prisma = (await import("@/lib/db")).prisma;
  svc = await import("@/lib/services/payments");
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
  gw = new FakeGateway();
});

async function makeOrder(over: { method?: string; unitPrice?: number; quantity?: number; paymentStatus?: string } = {}) {
  const token = `tok_${randomUUID().replace(/-/g, "")}`;
  const n = `ORD-T-${randomUUID().slice(0, 8)}`;
  const order = await prisma.retailOrder.create({
    data: {
      order_number: n,
      idempotency_key: randomUUID(),
      customer_name: "Test Buyer",
      email: "buyer@example.com",
      phone: "9000000000",
      address_line: "1 Test Street",
      city: "Erode",
      state: "Tamil Nadu",
      postcode: "638001",
      payment_method: over.method ?? "razorpay",
      payment_status: over.paymentStatus ?? "pending",
      access_token: token,
      subtotal: (over.unitPrice ?? 499) * (over.quantity ?? 2),
      items: { create: [{ product_name: "Test Shorts", size: "M", quantity: over.quantity ?? 2, unit_price: over.unitPrice ?? 499 }] },
    },
  });
  return { order, token, number: n };
}

/** Starts payment for an order and returns the Razorpay order id. */
async function start(number: string, token: string) {
  const s = await svc.createPaymentSession(number, token, client(), gw);
  if (!s.ok || s.alreadyPaid) throw new Error("expected a payment session");
  return s;
}

function capture(session: { razorpayOrderId: string; amount: number }, over: Partial<GatewayPayment> = {}) {
  const p: GatewayPayment = { id: `pay_${randomUUID().slice(0, 8)}`, order_id: session.razorpayOrderId, amount: session.amount, currency: "INR", status: "captured", ...over };
  gw.payments.set(p.id, p);
  return p;
}
const sign = (orderId: string, paymentId: string) => createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
const verifyInput = (number: string, token: string, session: { razorpayOrderId: string }, p: GatewayPayment, signature?: string) => ({ orderNumber: number, token, razorpayOrderId: session.razorpayOrderId, razorpayPaymentId: p.id, razorpaySignature: signature ?? sign(session.razorpayOrderId, p.id) });
const row = (id: string) => prisma.retailOrder.findUniqueOrThrow({ where: { id } });

describe("creating the Razorpay order", () => {
  it("computes the amount on the server from stored prices, in paise", async () => {
    const { number, token } = await makeOrder({ unitPrice: 499.5, quantity: 3 });
    const s = await start(number, token);
    expect(s.amount).toBe(149850);
    expect(gw.created[0]).toMatchObject({ amount: 149850, currency: "INR", receipt: number });
    expect(s.keyId).toBe("rzp_test_dummy");
    expect(JSON.stringify(s)).not.toContain(KEY_SECRET);
  });

  it("reuses the same Razorpay order on repeat calls instead of creating duplicates", async () => {
    const { number, token } = await makeOrder();
    const a = await start(number, token);
    const b = await start(number, token);
    expect(b.razorpayOrderId).toBe(a.razorpayOrderId);
    expect(gw.created).toHaveLength(1);
  });

  it("refuses a wrong token, an unknown order and a cash-on-delivery order", async () => {
    const { number, token } = await makeOrder();
    expect(await svc.createPaymentSession(number, "x".repeat(24), client(), gw)).toMatchObject({ ok: false, status: 404 });
    expect(await svc.createPaymentSession("ORD-NOPE-1", token, client(), gw)).toMatchObject({ ok: false, status: 404 });
    const cod = await makeOrder({ method: "cod" });
    expect(await svc.createPaymentSession(cod.number, cod.token, client(), gw)).toMatchObject({ ok: false, status: 400 });
  });

  it("survives a Razorpay timeout: the order stays saved and a retry works", async () => {
    const { order, number, token } = await makeOrder();
    gw.failCreate = true;
    expect(await svc.createPaymentSession(number, token, client(), gw)).toMatchObject({ ok: false, status: 502 });
    expect((await row(order.id)).razorpay_order_id).toBeNull();
    gw.failCreate = false;
    expect((await svc.createPaymentSession(number, token, client(), gw)).ok).toBe(true);
  });

  it("does not start a second payment for an order that is already paid", async () => {
    const { number, token } = await makeOrder({ paymentStatus: "paid" });
    expect(await svc.createPaymentSession(number, token, client(), gw)).toEqual({ ok: true, alreadyPaid: true });
    expect(gw.created).toHaveLength(0);
  });

  it("rate limits payment creation", async () => {
    const { number, token } = await makeOrder();
    const same = "203.0.113.7";
    let last;
    for (let i = 0; i < 22; i++) last = await svc.createPaymentSession(number, token, same, gw);
    expect(last).toMatchObject({ ok: false, status: 429 });
  });
});

describe("verifying the checkout callback", () => {
  it("marks the order paid only after a valid signature and a captured payment of the right amount", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s);
    expect(await svc.verifyCheckoutPayment(verifyInput(number, token, s, p), client(), gw)).toEqual({ ok: true, paymentStatus: "paid" });
    const after = await row(order.id);
    expect(after).toMatchObject({ payment_status: "paid", payment_verified: true, razorpay_payment_id: p.id });
    expect(after.paid_at).not.toBeNull();
  });

  it("is idempotent: a duplicate callback neither errors nor creates a second payment record", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s);
    const input = verifyInput(number, token, s, p);
    await svc.verifyCheckoutPayment(input, client(), gw);
    expect(await svc.verifyCheckoutPayment(input, client(), gw)).toEqual({ ok: true, paymentStatus: "paid" });
    expect(await prisma.payment.count({ where: { order_id: order.id } })).toBe(1);
  });

  it("rejects an invalid signature and leaves the order unpaid", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s);
    const res = await svc.verifyCheckoutPayment(verifyInput(number, token, s, p, "0".repeat(64)), client(), gw);
    expect(res).toMatchObject({ ok: false, status: 400 });
    expect((await row(order.id)).payment_status).toBe("pending");
  });

  it("rejects a callback naming a different Razorpay order (order-ID substitution)", async () => {
    const a = await makeOrder();
    const b = await makeOrder();
    const sa = await start(a.number, a.token);
    const sb = await start(b.number, b.token);
    const pb = capture(sb);
    // A genuine signature for B's payment, submitted against A's order.
    const res = await svc.verifyCheckoutPayment({ orderNumber: a.number, token: a.token, razorpayOrderId: sb.razorpayOrderId, razorpayPaymentId: pb.id, razorpaySignature: sign(sb.razorpayOrderId, pb.id) }, client(), gw);
    expect(res).toMatchObject({ ok: false, status: 400 });
    expect((await row(a.order.id)).payment_status).toBe("pending");
    expect(sa.razorpayOrderId).not.toBe(sb.razorpayOrderId);
  });

  it("refuses to mark an order paid when the captured amount differs (tampered amount)", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s, { amount: 100 });
    const res = await svc.verifyCheckoutPayment(verifyInput(number, token, s, p), client(), gw);
    expect(res).toMatchObject({ ok: false, status: 400 });
    const after = await row(order.id);
    expect(after.payment_status).not.toBe("paid");
    expect(after.payment_status).toBe("verifying");
  });

  it("refuses a wrong buyer token", async () => {
    const { number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s);
    expect(await svc.verifyCheckoutPayment(verifyInput(number, "y".repeat(24), s, p), client(), gw)).toMatchObject({ ok: false });
  });

  it("keeps an authorized-but-not-captured payment as verifying, not paid", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s, { status: "authorized" });
    expect(await svc.verifyCheckoutPayment(verifyInput(number, token, s, p), client(), gw)).toEqual({ ok: true, paymentStatus: "verifying" });
    expect((await row(order.id)).payment_status).toBe("verifying");
  });

  it("falls back to verifying when Razorpay cannot be reached after a valid signature", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s);
    gw.failFetch = true;
    expect(await svc.verifyCheckoutPayment(verifyInput(number, token, s, p), client(), gw)).toEqual({ ok: true, paymentStatus: "verifying" });
    expect((await row(order.id)).payment_status).toBe("verifying");
  });

  it("lets a failed attempt be retried on the same order, then settles", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const failed = capture(s, { status: "failed" });
    await svc.verifyCheckoutPayment(verifyInput(number, token, s, failed), client(), gw);
    expect((await row(order.id)).payment_status).toBe("failed");
    const again = await start(number, token);
    expect(again.razorpayOrderId).toBe(s.razorpayOrderId);
    expect(gw.created).toHaveLength(1);
    expect((await row(order.id)).payment_status).toBe("pending");
    const ok = capture(again);
    expect(await svc.verifyCheckoutPayment(verifyInput(number, token, again, ok), client(), gw)).toEqual({ ok: true, paymentStatus: "paid" });
  });

  it("flags a second capture on an already-paid order as a duplicate instead of paying twice", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const first = capture(s);
    await svc.verifyCheckoutPayment(verifyInput(number, token, s, first), client(), gw);
    const second = capture(s);
    await svc.verifyCheckoutPayment(verifyInput(number, token, s, second), client(), gw);
    const after = await row(order.id);
    expect(after.razorpay_payment_id).toBe(first.id);
    expect((await prisma.payment.findUniqueOrThrow({ where: { razorpay_payment_id: second.id } })).duplicate).toBe(true);
  });
});

describe("webhooks", () => {
  const send = (event: string, payment: GatewayPayment, eventId = `evt_${randomUUID().slice(0, 8)}`, secret = WEBHOOK_SECRET) => {
    const body = JSON.stringify({ event, payload: { payment: { entity: { ...payment, method: "upi" } } } });
    return svc.processWebhook(body, createHmac("sha256", secret).update(body).digest("hex"), eventId);
  };

  it("rejects a bad signature without touching the order", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s);
    expect(await send("payment.captured", p, "evt_bad", "wrong-secret")).toMatchObject({ status: 400 });
    expect((await row(order.id)).payment_status).toBe("pending");
    void number;
    void token;
  });

  it("settles on payment.captured even when the browser never called back", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s);
    expect(await send("payment.captured", p)).toMatchObject({ status: 200 });
    expect(await row(order.id)).toMatchObject({ payment_status: "paid", payment_verified: true });
  });

  it("deduplicates a repeated delivery of the same event", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s);
    await send("payment.captured", p, "evt_same");
    expect(await send("payment.captured", p, "evt_same")).toEqual({ status: 200, body: "duplicate" });
    expect(await prisma.payment.count({ where: { order_id: order.id } })).toBe(1);
    expect(await prisma.paymentEvent.count({ where: { event_id: "evt_same" } })).toBe(1);
  });

  it("webhook before the frontend callback, then the callback: one paid order, one payment", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s);
    await send("payment.captured", p);
    expect(await svc.verifyCheckoutPayment(verifyInput(number, token, s, p), client(), gw)).toEqual({ ok: true, paymentStatus: "paid" });
    expect(await prisma.payment.count({ where: { order_id: order.id } })).toBe(1);
  });

  it("callback before the webhook, then the webhook: nothing changes", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s);
    await svc.verifyCheckoutPayment(verifyInput(number, token, s, p), client(), gw);
    await send("payment.captured", p);
    expect((await row(order.id)).payment_status).toBe("paid");
    expect(await prisma.payment.count({ where: { order_id: order.id } })).toBe(1);
  });

  it("handles out-of-order delivery: a late payment.failed never un-pays a paid order", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s);
    await send("payment.captured", p);
    await send("payment.failed", { ...p, status: "failed" });
    expect((await row(order.id)).payment_status).toBe("paid");
    expect((await prisma.payment.findUniqueOrThrow({ where: { razorpay_payment_id: p.id } })).status).toBe("captured");
  });

  it("payment.failed on an unpaid order records the failure; a later capture still pays it", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const bad = capture(s, { status: "failed" });
    await send("payment.failed", bad);
    expect((await row(order.id)).payment_status).toBe("failed");
    const good = capture(s);
    await send("payment.captured", good);
    expect((await row(order.id)).payment_status).toBe("paid");
  });

  it("does not mark a webhook capture with the wrong amount as paid", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    const p = capture(s, { amount: 1 });
    await send("payment.captured", p);
    expect((await row(order.id)).payment_status).toBe("verifying");
    void number;
    void token;
  });

  it("acknowledges unknown orders and unhandled events without error", async () => {
    const stray: GatewayPayment = { id: "pay_stray", order_id: "order_unknown", amount: 100, currency: "INR", status: "captured" };
    expect(await send("payment.captured", stray)).toMatchObject({ status: 200 });
    expect(await send("refund.created", stray)).toMatchObject({ status: 200 });
  });
});

describe("what a buyer can see", () => {
  it("returns order status without address, phone or email, and only for the right token", async () => {
    const { number, token } = await makeOrder();
    const view = await svc.getOrderStatusView(number, token);
    expect(view).toMatchObject({ orderNumber: number, paymentStatus: "pending", currency: "INR" });
    const text = JSON.stringify(view);
    for (const secret of ["1 Test Street", "9000000000", "buyer@example.com", token, "Erode"]) expect(text).not.toContain(secret);
    expect(await svc.getOrderStatusView(number, "z".repeat(24))).toBeNull();
  });
});

describe("staff reconcile", () => {
  it("settles an order from Razorpay's own records", async () => {
    const { order, number, token } = await makeOrder();
    const s = await start(number, token);
    capture(s);
    expect((await svc.reconcileOrder(order.id, gw)).ok).toBe(true);
    expect((await row(order.id)).payment_status).toBe("paid");
  });
});
