import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decideSettlement, mergePaymentStatus, nextOrderPaymentStatus, orderAmountPaise, safeEqualText, toPaise, verifyCheckoutSignature, verifyWebhookSignature, type GatewayPayment, type OrderForSettlement } from "@/lib/payments/core";

const SECRET = "test_key_secret_not_real";
const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");

const order = (over: Partial<OrderForSettlement> = {}): OrderForSettlement => ({ payment_status: "pending", razorpay_order_id: "order_AAA", razorpay_amount: 149900, currency: "INR", razorpay_payment_id: null, ...over });
const payment = (over: Partial<GatewayPayment> = {}): GatewayPayment => ({ id: "pay_111", order_id: "order_AAA", amount: 149900, currency: "INR", status: "captured", ...over });

describe("amounts", () => {
  it("converts rupees to whole paise", () => {
    expect(toPaise(1499)).toBe(149900);
    expect(toPaise(499.5)).toBe(49950);
    expect(toPaise(0.1 + 0.2)).toBe(30); // floating point noise never leaks into the amount
    expect(Number.isInteger(toPaise(19.99))).toBe(true);
  });
  it("rejects zero, negative and non-finite amounts", () => {
    for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => toPaise(bad)).toThrow();
  });
  it("totals an order from per-unit paise", () => {
    expect(orderAmountPaise([{ unit_price: 499, quantity: 2 }, { unit_price: 250.5, quantity: 1 }])).toBe(124850);
  });
  it("rejects an empty order", () => {
    expect(() => orderAmountPaise([])).toThrow();
  });
});

describe("checkout signature", () => {
  const sig = hmac(SECRET, "order_AAA|pay_111");
  it("accepts the genuine signature", () => {
    expect(verifyCheckoutSignature("order_AAA", "pay_111", sig, SECRET)).toBe(true);
  });
  it("rejects a tampered payment id, order id, signature or wrong secret", () => {
    expect(verifyCheckoutSignature("order_AAA", "pay_222", sig, SECRET)).toBe(false);
    expect(verifyCheckoutSignature("order_BBB", "pay_111", sig, SECRET)).toBe(false);
    expect(verifyCheckoutSignature("order_AAA", "pay_111", `${sig.slice(0, -1)}0`, SECRET)).toBe(false);
    expect(verifyCheckoutSignature("order_AAA", "pay_111", sig, "another_secret")).toBe(false);
  });
  it("rejects empty and wrong-length inputs without throwing", () => {
    expect(verifyCheckoutSignature("order_AAA", "pay_111", "", SECRET)).toBe(false);
    expect(verifyCheckoutSignature("order_AAA", "pay_111", "abc", SECRET)).toBe(false);
    expect(verifyCheckoutSignature("", "", "", "")).toBe(false);
  });
});

describe("webhook signature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_111" } } } });
  const sig = hmac("whsec_test", body);
  it("accepts the exact raw body", () => {
    expect(verifyWebhookSignature(body, sig, "whsec_test")).toBe(true);
  });
  it("rejects a body that was re-serialised or altered", () => {
    expect(verifyWebhookSignature(JSON.stringify(JSON.parse(body), null, 2), sig, "whsec_test")).toBe(false);
    expect(verifyWebhookSignature(body.replace("pay_111", "pay_999"), sig, "whsec_test")).toBe(false);
  });
  it("rejects a wrong or missing secret / signature", () => {
    expect(verifyWebhookSignature(body, sig, "other")).toBe(false);
    expect(verifyWebhookSignature(body, "", "whsec_test")).toBe(false);
    expect(verifyWebhookSignature(body, sig, "")).toBe(false);
  });
});

describe("settlement decisions", () => {
  it("marks a pending order paid on a captured payment for the right order, amount and currency", () => {
    expect(decideSettlement(order(), payment())).toEqual({ action: "mark_paid" });
  });
  it("treats a repeated callback or webhook for the same payment as already paid", () => {
    expect(decideSettlement(order({ payment_status: "paid", razorpay_payment_id: "pay_111" }), payment())).toEqual({ action: "already_paid" });
  });
  it("flags a second capture on an already-paid order instead of paying twice", () => {
    expect(decideSettlement(order({ payment_status: "paid", razorpay_payment_id: "pay_111" }), payment({ id: "pay_222" }))).toEqual({ action: "duplicate_capture" });
  });
  it("rejects a tampered amount", () => {
    expect(decideSettlement(order(), payment({ amount: 100 }))).toEqual({ action: "reject", reason: "amount_mismatch" });
  });
  it("rejects a payment that belongs to a different Razorpay order", () => {
    expect(decideSettlement(order(), payment({ order_id: "order_OTHER" }))).toEqual({ action: "reject", reason: "order_mismatch" });
    expect(decideSettlement(order({ razorpay_order_id: null }), payment())).toEqual({ action: "reject", reason: "order_mismatch" });
  });
  it("rejects a currency mismatch", () => {
    expect(decideSettlement(order(), payment({ currency: "USD" }))).toEqual({ action: "reject", reason: "currency_mismatch" });
  });
  it("rejects when the order never recorded an amount to compare against", () => {
    expect(decideSettlement(order({ razorpay_amount: null }), payment())).toEqual({ action: "reject", reason: "amount_mismatch" });
  });
  it("waits on authorized payments and never marks them paid", () => {
    expect(decideSettlement(order(), payment({ status: "authorized" }))).toEqual({ action: "verifying" });
  });
  it("records a failed payment on an unpaid order", () => {
    expect(decideSettlement(order(), payment({ status: "failed" }))).toEqual({ action: "failed" });
  });
  it("ignores late failed or authorized events once the order is paid", () => {
    const paid = order({ payment_status: "paid", razorpay_payment_id: "pay_111" });
    expect(decideSettlement(paid, payment({ id: "pay_000", status: "failed" }))).toEqual({ action: "ignore" });
    expect(decideSettlement(paid, payment({ status: "authorized" }))).toEqual({ action: "ignore" });
  });
  it("a successful retry after a failure still settles the order", () => {
    expect(decideSettlement(order({ payment_status: "failed" }), payment({ id: "pay_retry" }))).toEqual({ action: "mark_paid" });
  });
});

describe("order status transitions", () => {
  it("never moves a paid or refunded order backwards", () => {
    expect(nextOrderPaymentStatus("paid", { action: "failed" })).toBe("paid");
    expect(nextOrderPaymentStatus("paid", { action: "reject", reason: "amount_mismatch" })).toBe("paid");
    expect(nextOrderPaymentStatus("refunded", { action: "mark_paid" })).toBe("refunded");
  });
  it("maps outcomes onto the order status", () => {
    expect(nextOrderPaymentStatus("pending", { action: "mark_paid" })).toBe("paid");
    expect(nextOrderPaymentStatus("pending", { action: "verifying" })).toBe("verifying");
    expect(nextOrderPaymentStatus("pending", { action: "reject", reason: "amount_mismatch" })).toBe("verifying");
    expect(nextOrderPaymentStatus("pending", { action: "failed" })).toBe("failed");
    expect(nextOrderPaymentStatus("failed", { action: "mark_paid" })).toBe("paid");
  });
  it("out-of-order webhooks converge: captured then failed, or failed then captured, both end paid", () => {
    const o1 = nextOrderPaymentStatus(nextOrderPaymentStatus("pending", { action: "mark_paid" }), { action: "failed" });
    const o2 = nextOrderPaymentStatus(nextOrderPaymentStatus("pending", { action: "failed" }), { action: "mark_paid" });
    expect([o1, o2]).toEqual(["paid", "paid"]);
  });
  it("payment rows only move forward", () => {
    expect(mergePaymentStatus("captured", "failed")).toBe("captured");
    expect(mergePaymentStatus("captured", "authorized")).toBe("captured");
    expect(mergePaymentStatus("authorized", "captured")).toBe("captured");
    expect(mergePaymentStatus(null, "failed")).toBe("failed");
  });
});

describe("safeEqualText", () => {
  it("matches equal secrets and rejects anything else", () => {
    expect(safeEqualText("abc123", "abc123")).toBe(true);
    expect(safeEqualText("abc123", "abc124")).toBe(false);
    expect(safeEqualText("abc", "abc123")).toBe(false);
    expect(safeEqualText(null, "abc")).toBe(false);
    expect(safeEqualText("", "")).toBe(false);
  });
});
