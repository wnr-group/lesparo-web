import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { decideSettlement, mergePaymentStatus, nextOrderPaymentStatus, orderAmountPaise, safeEqualText, verifyCheckoutSignature, verifyWebhookSignature, type GatewayPayment, type Settlement } from "@/lib/payments/core";
import { createGateway, razorpayConfig, type RazorpayGateway } from "@/lib/payments/razorpay";
import { hitRateLimit, rateLimitKey } from "@/lib/services/enquiries";

/** Never include card, UPI or signature data in a log line: ids and short reasons only. */
const log = (msg: string, extra?: Record<string, string | number | boolean | null>) => console.warn(`[razorpay] ${msg}`, extra ?? "");

function gateway(): RazorpayGateway | null {
  const config = razorpayConfig();
  return config ? createGateway(config) : null;
}

/** Looks the order up by its number and checks the buyer's secret in constant time. Null for both "no such order" and "wrong token". */
async function findOrderForBuyer(orderNumber: string, token: string) {
  const order = await prisma.retailOrder.findUnique({ where: { order_number: orderNumber }, include: { items: true } });
  if (!order || !safeEqualText(order.access_token, token)) return null;
  return order;
}

type OrderRow = NonNullable<Awaited<ReturnType<typeof findOrderForBuyer>>>;

// ---------------------------------------------------------------------------
// 1. Create (or reuse) the Razorpay order for an existing internal order
// ---------------------------------------------------------------------------

export type PaymentSession =
  | { ok: true; alreadyPaid: true }
  | { ok: true; alreadyPaid: false; keyId: string; razorpayOrderId: string; amount: number; currency: string; name: string; description: string; prefill: { name: string; email: string; contact: string } }
  | { ok: false; status: number; message: string };

export async function createPaymentSession(orderNumber: string, token: string, clientId: string, gw: RazorpayGateway | null = gateway()): Promise<PaymentSession> {
  const config = razorpayConfig();
  if (!config || !gw) return { ok: false, status: 503, message: "Online payment is not available right now. Please call us to complete your order." };
  if (!(await hitRateLimit(rateLimitKey(`pay-create:${clientId}`), 20, 600))) return { ok: false, status: 429, message: "Too many attempts. Please wait a few minutes and try again." };

  const order = await findOrderForBuyer(orderNumber, token);
  if (!order) return { ok: false, status: 404, message: "We could not find that order." };
  if (order.payment_method !== "razorpay") return { ok: false, status: 400, message: "This order is not set up for online payment." };
  if (order.payment_status === "paid" || order.payment_status === "refunded") return { ok: true, alreadyPaid: true };
  if (order.status === "cancelled") return { ok: false, status: 409, message: "This order was cancelled." };
  if (order.currency !== "INR") return { ok: false, status: 400, message: "Online payment supports INR orders only." };

  let razorpayOrderId = order.razorpay_order_id;
  let amount = order.razorpay_amount;

  if (!razorpayOrderId || amount === null) {
    // The amount is rebuilt from the stored line prices, which were read from the database when the order was placed.
    const computed = orderAmountPaise(order.items);
    let created;
    try {
      created = await gw.createOrder({ amount: computed, currency: "INR", receipt: order.order_number, notes: { order_number: order.order_number } });
    } catch (err) {
      log("order creation failed", { order: order.order_number, reason: err instanceof Error ? err.message : "unknown" });
      return { ok: false, status: 502, message: "The payment service did not respond. Your order is saved; please try again in a moment." };
    }
    // Two tabs can race here: only the first write wins, the loser reuses the winner's Razorpay order.
    const won = await prisma.retailOrder.updateMany({ where: { id: order.id, razorpay_order_id: null }, data: { razorpay_order_id: created.id, razorpay_amount: computed } });
    if (won.count === 1) {
      razorpayOrderId = created.id;
      amount = computed;
    } else {
      const fresh = await prisma.retailOrder.findUnique({ where: { id: order.id }, select: { razorpay_order_id: true, razorpay_amount: true } });
      razorpayOrderId = fresh?.razorpay_order_id ?? null;
      amount = fresh?.razorpay_amount ?? null;
    }
    if (!razorpayOrderId || amount === null) return { ok: false, status: 500, message: "We could not start the payment. Please try again." };
  }

  // A fresh attempt after a failure: show the order as awaiting payment again.
  if (order.payment_status === "failed") await prisma.retailOrder.updateMany({ where: { id: order.id, payment_status: "failed" }, data: { payment_status: "pending" } });

  return {
    ok: true,
    alreadyPaid: false,
    keyId: config.keyId,
    razorpayOrderId,
    amount,
    currency: order.currency,
    name: "LESPARO",
    description: `Order ${order.order_number}`,
    prefill: { name: order.customer_name, email: order.email, contact: order.phone },
  };
}

// ---------------------------------------------------------------------------
// Shared settlement: used by checkout verification, webhooks and admin reconcile
// ---------------------------------------------------------------------------

type OrderForApply = Pick<OrderRow, "id" | "payment_status" | "razorpay_order_id" | "razorpay_amount" | "currency" | "razorpay_payment_id">;

/** Records the payment attempt and moves the order forward according to decideSettlement. Safe to call any number of times. */
async function applyPayment(order: OrderForApply, payment: GatewayPayment, extra: { method?: string | null; errorCode?: string | null; errorDescription?: string | null } = {}): Promise<Settlement> {
  return prisma.$transaction(async (tx) => {
    // Re-read inside the transaction so two concurrent deliveries decide against the same, latest state.
    const current = await tx.retailOrder.findUnique({ where: { id: order.id }, select: { payment_status: true, razorpay_order_id: true, razorpay_amount: true, currency: true, razorpay_payment_id: true } });
    if (!current) return { action: "ignore" } as Settlement;
    const settlement = decideSettlement(current, payment);
    if (settlement.action === "reject" && settlement.reason === "order_mismatch") {
      // Not ours: store nothing against this order.
      log("payment does not belong to order", { order: order.id, payment: payment.id });
      return settlement;
    }

    const existing = await tx.payment.findUnique({ where: { razorpay_payment_id: payment.id }, select: { status: true, duplicate: true } });
    const status = mergePaymentStatus(existing?.status, payment.status);
    await tx.payment.upsert({
      where: { razorpay_payment_id: payment.id },
      create: { order_id: order.id, razorpay_order_id: payment.order_id ?? "", razorpay_payment_id: payment.id, amount: payment.amount, currency: payment.currency, status, method: extra.method ?? null, error_code: extra.errorCode ?? null, error_description: extra.errorDescription ?? (settlement.action === "reject" ? settlement.reason : null), duplicate: settlement.action === "duplicate_capture" },
      update: { status, method: extra.method ?? undefined, error_code: extra.errorCode ?? undefined, error_description: extra.errorDescription ?? undefined, duplicate: existing?.duplicate || settlement.action === "duplicate_capture" },
    });

    const next = nextOrderPaymentStatus(current.payment_status, settlement);
    if (settlement.action === "mark_paid") {
      await tx.retailOrder.update({ where: { id: order.id }, data: { payment_status: "paid", payment_verified: true, razorpay_payment_id: payment.id, paid_at: new Date() } });
    } else if (next !== current.payment_status) {
      await tx.retailOrder.update({ where: { id: order.id }, data: { payment_status: next } });
    }
    if (settlement.action === "reject") log("payment rejected", { order: order.id, payment: payment.id, reason: settlement.reason });
    if (settlement.action === "duplicate_capture") log("duplicate capture: refund needed", { order: order.id, payment: payment.id });
    return settlement;
  });
}

// ---------------------------------------------------------------------------
// 2. Verify the Checkout callback
// ---------------------------------------------------------------------------

export type VerifyInput = { orderNumber: string; token: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string };
export type VerifyResult = { ok: true; paymentStatus: string } | { ok: false; status: number; message: string };

export async function verifyCheckoutPayment(input: VerifyInput, clientId: string, gw: RazorpayGateway | null = gateway()): Promise<VerifyResult> {
  const config = razorpayConfig();
  if (!config || !gw) return { ok: false, status: 503, message: "Online payment is not available right now." };
  if (!(await hitRateLimit(rateLimitKey(`pay-verify:${clientId}`), 30, 600))) return { ok: false, status: 429, message: "Too many attempts. Please wait a few minutes." };

  const order = await findOrderForBuyer(input.orderNumber, input.token);
  // The Razorpay order id comes from our record, never from the browser: a callback for some other order is rejected.
  if (!order || !order.razorpay_order_id || order.razorpay_order_id !== input.razorpayOrderId) return { ok: false, status: 400, message: "This payment does not match the order." };

  // Repeat callback for a payment we already settled: report the stored result.
  if (order.payment_status === "paid" && order.razorpay_payment_id === input.razorpayPaymentId) return { ok: true, paymentStatus: "paid" };

  if (!verifyCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature, config.keySecret)) {
    log("invalid checkout signature", { order: order.order_number });
    return { ok: false, status: 400, message: "We could not verify this payment. If money was deducted, it will be reconciled automatically or refunded." };
  }

  // The signature proves the callback is genuine; the payment's real state and amount still come from Razorpay.
  let payment: GatewayPayment;
  try {
    payment = await gw.fetchPayment(input.razorpayPaymentId);
  } catch (err) {
    log("payment lookup failed after valid signature", { order: order.order_number, reason: err instanceof Error ? err.message : "unknown" });
    await prisma.retailOrder.updateMany({ where: { id: order.id, payment_status: { in: ["pending", "failed"] } }, data: { payment_status: "verifying" } });
    return { ok: true, paymentStatus: "verifying" };
  }

  const settlement = await applyPayment(order, payment);
  if (settlement.action === "reject") return { ok: false, status: 400, message: "This payment does not match the order." };
  const fresh = await prisma.retailOrder.findUnique({ where: { id: order.id }, select: { payment_status: true } });
  return { ok: true, paymentStatus: fresh?.payment_status ?? "verifying" };
}

// ---------------------------------------------------------------------------
// 3. Webhooks
// ---------------------------------------------------------------------------

export type WebhookResult = { status: number; body: string };

type WebhookPayload = {
  event?: string;
  payload?: { payment?: { entity?: Record<string, unknown> }; order?: { entity?: Record<string, unknown> } };
};

const str = (v: unknown) => (typeof v === "string" ? v : null);

export async function processWebhook(rawBody: string, signature: string, eventIdHeader: string | null): Promise<WebhookResult> {
  const config = razorpayConfig();
  if (!config?.webhookSecret) return { status: 503, body: "webhook not configured" };
  // The signature is checked against the exact bytes received, before any parsing.
  if (!verifyWebhookSignature(rawBody, signature, config.webhookSecret)) return { status: 400, body: "invalid signature" };

  let data: WebhookPayload;
  try {
    data = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return { status: 400, body: "invalid payload" };
  }
  const type = data.event ?? "unknown";
  const entity = data.payload?.payment?.entity;
  const eventId = eventIdHeader || `body:${createHash("sha256").update(rawBody).digest("hex")}`;
  const razorpayPaymentId = str(entity?.id);
  const razorpayOrderId = str(entity?.order_id) ?? str(data.payload?.order?.entity?.id);

  const seen = await prisma.paymentEvent.findUnique({ where: { event_id: eventId }, select: { processed_at: true } });
  if (seen?.processed_at) return { status: 200, body: "duplicate" };
  if (!seen) {
    try {
      await prisma.paymentEvent.create({ data: { event_id: eventId, event_type: type, razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId } });
    } catch {
      // A parallel delivery of the same event inserted it first; carry on, applyPayment is idempotent.
    }
  }

  let outcome = "ignored";
  const handled = ["payment.captured", "payment.failed", "payment.authorized", "order.paid"];
  if (handled.includes(type) && entity && razorpayPaymentId && razorpayOrderId) {
    const order = await prisma.retailOrder.findUnique({ where: { razorpay_order_id: razorpayOrderId }, select: { id: true, payment_status: true, razorpay_order_id: true, razorpay_amount: true, currency: true, razorpay_payment_id: true } });
    if (!order) {
      outcome = "unknown_order";
    } else {
      const payment: GatewayPayment = { id: razorpayPaymentId, order_id: razorpayOrderId, amount: Number(entity.amount), currency: str(entity.currency) ?? "", status: str(entity.status) ?? "" };
      const settlement = await applyPayment(order, payment, { method: str(entity.method), errorCode: str(entity.error_code), errorDescription: str(entity.error_description) });
      outcome = settlement.action === "reject" ? `rejected:${settlement.reason}` : settlement.action;
    }
  }

  await prisma.paymentEvent.updateMany({ where: { event_id: eventId }, data: { processed_at: new Date(), outcome } });
  return { status: 200, body: "ok" };
}

// ---------------------------------------------------------------------------
// 4. What the buyer may see about an order (no address, phone or email)
// ---------------------------------------------------------------------------

export type OrderStatusView = {
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  currency: string;
  subtotal: number;
  items: { name: string; size: string | null; quantity: number; unitPrice: number }[];
};

export async function getOrderStatusView(orderNumber: string, token: string): Promise<OrderStatusView | null> {
  const order = await findOrderForBuyer(orderNumber, token);
  if (!order) return null;
  return {
    orderNumber: order.order_number,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    status: order.status,
    currency: order.currency,
    subtotal: order.subtotal,
    items: order.items.map((i) => ({ name: i.product_name, size: i.size, quantity: i.quantity, unitPrice: i.unit_price })),
  };
}

// ---------------------------------------------------------------------------
// 5. Staff reconcile: ask Razorpay what really happened on this order
// ---------------------------------------------------------------------------

export async function reconcileOrder(orderId: string, gw: RazorpayGateway | null = gateway()): Promise<{ ok: boolean; message: string }> {
  if (!gw) return { ok: false, message: "Razorpay is not configured." };
  const order = await prisma.retailOrder.findUnique({ where: { id: orderId }, select: { id: true, payment_status: true, razorpay_order_id: true, razorpay_amount: true, currency: true, razorpay_payment_id: true } });
  if (!order?.razorpay_order_id) return { ok: false, message: "This order has no Razorpay payment to reconcile." };
  let payments: GatewayPayment[];
  try {
    payments = await gw.fetchOrderPayments(order.razorpay_order_id);
  } catch {
    return { ok: false, message: "Razorpay did not respond. Try again shortly." };
  }
  // Captured payments first, so a paid order is settled before any failed attempt is recorded.
  const sorted = [...payments].sort((a, b) => Number(b.status === "captured") - Number(a.status === "captured"));
  for (const p of sorted) await applyPayment((await prisma.retailOrder.findUnique({ where: { id: orderId }, select: { id: true, payment_status: true, razorpay_order_id: true, razorpay_amount: true, currency: true, razorpay_payment_id: true } })) ?? order, p);
  const after = await prisma.retailOrder.findUnique({ where: { id: orderId }, select: { payment_status: true } });
  return { ok: true, message: `Checked ${payments.length} payment${payments.length === 1 ? "" : "s"} with Razorpay. Payment status: ${after?.payment_status}.` };
}
