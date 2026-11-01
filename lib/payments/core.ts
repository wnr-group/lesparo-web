/**
 * Pure payment rules: no I/O, no secrets in scope except the ones passed in. Everything that decides whether an
 * order counts as paid lives here so it can be unit-tested without a database or Razorpay.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** INR rupees to paise as an integer. Rounds half away from zero, so 499.995 never becomes a fractional paisa. */
export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees <= 0) throw new Error("Amount must be a positive number.");
  return Math.round(rupees * 100);
}

/** Order total in paise, from the stored line prices: each unit price is rounded to paise before multiplying. */
export function orderAmountPaise(lines: { unit_price: number; quantity: number }[]): number {
  const total = lines.reduce((n, l) => n + toPaise(l.unit_price) * l.quantity, 0);
  if (!Number.isSafeInteger(total) || total <= 0) throw new Error("Order total is invalid.");
  return total;
}

function safeEqualHex(expected: string, given: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Checkout callback signature: HMAC-SHA256 of `${razorpay_order_id}|${razorpay_payment_id}` with the Key Secret. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256 of the exact raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): boolean {
  if (!signature || !webhookSecret) return false;
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

export type PaymentStatus = "pending" | "verifying" | "paid" | "failed" | "refunded";

/** What we know about a payment from Razorpay (Payment entity), reduced to the fields the decision needs. */
export type GatewayPayment = { id: string; order_id: string | null; amount: number; currency: string; status: string };

export type OrderForSettlement = {
  payment_status: string;
  razorpay_order_id: string | null;
  razorpay_amount: number | null;
  currency: string;
  razorpay_payment_id: string | null;
};

export type Settlement =
  /** First confirmed capture: mark the order paid. */
  | { action: "mark_paid" }
  /** The order is already paid by this same payment (repeat callback or webhook): change nothing. */
  | { action: "already_paid" }
  /** The order is already paid by a different payment: keep the order, flag the new capture for refund. */
  | { action: "duplicate_capture" }
  /** Payment does not belong to this order, or its amount or currency differs from what we asked for. Never mark paid. */
  | { action: "reject"; reason: "order_mismatch" | "amount_mismatch" | "currency_mismatch" }
  /** Authorized but not captured yet: wait for the capture webhook. */
  | { action: "verifying" }
  | { action: "failed" }
  | { action: "ignore" };

/**
 * Decides what a Razorpay payment means for an order. Used by the checkout verification, the webhook and the
 * admin reconcile button, so all three agree.
 */
export function decideSettlement(order: OrderForSettlement, payment: GatewayPayment): Settlement {
  if (!order.razorpay_order_id || payment.order_id !== order.razorpay_order_id) return { action: "reject", reason: "order_mismatch" };
  if (order.razorpay_amount === null || payment.amount !== order.razorpay_amount) return { action: "reject", reason: "amount_mismatch" };
  if (payment.currency !== order.currency) return { action: "reject", reason: "currency_mismatch" };

  const settled = order.payment_status === "paid" || order.payment_status === "refunded";
  switch (payment.status) {
    case "captured":
      if (!settled) return { action: "mark_paid" };
      return order.razorpay_payment_id === payment.id ? { action: "already_paid" } : { action: "duplicate_capture" };
    case "authorized":
      return settled ? { action: "ignore" } : { action: "verifying" };
    case "failed":
      return settled ? { action: "ignore" } : { action: "failed" };
    default:
      return { action: "ignore" };
  }
}

/** The order-level status after a payment event, never moving a settled order backwards. */
export function nextOrderPaymentStatus(current: string, settlement: Settlement): string {
  if (current === "paid" || current === "refunded") return current;
  switch (settlement.action) {
    case "mark_paid":
      return "paid";
    case "verifying":
    case "reject":
      return "verifying";
    case "failed":
      return "failed";
    default:
      return current;
  }
}

const PAYMENT_RANK: Record<string, number> = { created: 0, failed: 1, authorized: 2, captured: 3, refunded: 4 };

/** A payment row only moves forward: a late "failed" or "authorized" event never overwrites "captured". */
export function mergePaymentStatus(current: string | null | undefined, incoming: string): string {
  if (!current) return incoming;
  return (PAYMENT_RANK[incoming] ?? 0) >= (PAYMENT_RANK[current] ?? 0) ? incoming : current;
}

/** Compare two secrets of any length without leaking where they differ. */
export function safeEqualText(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
