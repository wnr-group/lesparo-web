import "server-only";
import Razorpay from "razorpay";
import type { GatewayPayment } from "./core";

export type RazorpayConfig = { keyId: string; keySecret: string; webhookSecret: string | null };

/** Null when the Key ID and Key Secret are not both set, which keeps online payment switched off. */
export function razorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null };
}

export const razorpayEnabled = () => razorpayConfig() !== null;

export type GatewayOrder = { id: string; amount: number; currency: string };

/** The slice of Razorpay the app uses. Tests pass a fake; production uses the official SDK. */
export interface RazorpayGateway {
  createOrder(input: { amount: number; currency: string; receipt: string; notes: Record<string, string> }): Promise<GatewayOrder>;
  fetchPayment(paymentId: string): Promise<GatewayPayment>;
  fetchOrderPayments(orderId: string): Promise<GatewayPayment[]>;
}

const TIMEOUT_MS = 15_000;

function withTimeout<T>(work: Promise<T>, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Razorpay ${what} timed out`)), TIMEOUT_MS);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

type RawPayment = { id: string; order_id?: string | null; amount: number | string; currency: string; status: string };
const toGatewayPayment = (p: RawPayment): GatewayPayment => ({ id: p.id, order_id: p.order_id ?? null, amount: Number(p.amount), currency: p.currency, status: p.status });

export function createGateway(config: RazorpayConfig): RazorpayGateway {
  const client = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
  return {
    async createOrder(input) {
      const o = await withTimeout(client.orders.create({ amount: input.amount, currency: input.currency, receipt: input.receipt, notes: input.notes }), "order creation");
      return { id: o.id, amount: Number(o.amount), currency: o.currency };
    },
    async fetchPayment(paymentId) {
      return toGatewayPayment((await withTimeout(client.payments.fetch(paymentId), "payment lookup")) as RawPayment);
    },
    async fetchOrderPayments(orderId) {
      const res = await withTimeout(client.orders.fetchPayments(orderId), "order payments lookup");
      return (res.items as RawPayment[]).map(toGatewayPayment);
    },
  };
}
