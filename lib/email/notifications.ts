import "server-only";
import { prisma } from "@/lib/db";
import { PAYMENT_METHODS } from "@/lib/validation/order";
import { deferEmail, sendEmail, siteUrl } from "./send";
import { templates } from "./templates";

/**
 * Order and payment emails. Each is keyed by what it announces (order id, payment id, status), so a webhook that arrives twice,
 * a retried job or a staff member re-saving a form can never send the same message twice. Failed sends are retried by
 * retryFailedEmails() from the scheduled job run; the keys carry everything needed to rebuild the message.
 */
async function loadOrder(orderId: string) {
  return prisma.retailOrder.findUnique({ where: { id: orderId }, include: { items: true } });
}
type Order = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

const statusUrl = (o: Order) => (o.access_token ? `${siteUrl()}/checkout/status?o=${encodeURIComponent(o.order_number)}&t=${encodeURIComponent(o.access_token)}` : null);
const accountUrl = (o: Order) => (o.customer_id ? `${siteUrl()}/account/orders/${encodeURIComponent(o.order_number)}` : statusUrl(o));

export async function sendOrderPlaced(orderId: string) {
  const o = await loadOrder(orderId);
  if (!o) return;
  const rendered = templates.orderPlaced({
    name: o.customer_name,
    orderNumber: o.order_number,
    currency: o.currency,
    subtotal: o.subtotal,
    paymentMethod: PAYMENT_METHODS[o.payment_method as keyof typeof PAYMENT_METHODS] ?? o.payment_method,
    items: o.items.map((i) => ({ name: i.product_name, size: i.size, quantity: i.quantity, unitPrice: i.unit_price })),
    shipTo: `${o.address_line}, ${o.city}, ${o.state} ${o.postcode}`,
    siteUrl: siteUrl(),
    statusUrl: accountUrl(o),
  });
  await sendEmail({ to: o.email, rendered, template: "order_placed", key: `order_placed:${o.id}`, entityId: o.id });
}

export async function sendPaymentSuccess(orderId: string) {
  const o = await loadOrder(orderId);
  if (!o) return;
  const rendered = templates.paymentSuccess({ name: o.customer_name, orderNumber: o.order_number, currency: o.currency, amount: o.subtotal, siteUrl: siteUrl(), statusUrl: accountUrl(o) });
  await sendEmail({ to: o.email, rendered, template: "payment_success", key: `payment_success:${o.id}`, entityId: o.id });
}

export async function sendPaymentFailed(orderId: string, paymentId: string) {
  const o = await loadOrder(orderId);
  // A later successful payment makes a failure notice misleading.
  if (!o || o.payment_status === "paid" || o.payment_status === "refunded") return;
  const rendered = templates.paymentFailed({ name: o.customer_name, orderNumber: o.order_number, siteUrl: siteUrl(), statusUrl: statusUrl(o) });
  await sendEmail({ to: o.email, rendered, template: "payment_failed", key: `payment_failed:${o.id}:${paymentId}`, entityId: o.id });
}

export const NOTIFIED_STATUSES = ["confirmed", "shipped", "delivered", "cancelled"] as const;
export type NotifiedStatus = (typeof NOTIFIED_STATUSES)[number];

export async function sendOrderStatus(orderId: string, status: NotifiedStatus) {
  const o = await loadOrder(orderId);
  if (!o) return;
  const rendered = templates.orderStatus({
    name: o.customer_name,
    orderNumber: o.order_number,
    status,
    tracking: { carrier: o.tracking_carrier, number: o.tracking_number, url: o.tracking_url },
    siteUrl: siteUrl(),
    orderUrl: accountUrl(o),
  });
  await sendEmail({ to: o.email, rendered, template: "order_status", key: `order_status:${o.id}:${status}`, entityId: o.id });
}

// Fire-and-forget wrappers used from checkout, payments and admin actions.
export const notifyOrderPlaced = (orderId: string) => deferEmail(() => sendOrderPlaced(orderId));
export const notifyPaymentSuccess = (orderId: string) => deferEmail(() => sendPaymentSuccess(orderId));
export const notifyPaymentFailed = (orderId: string, paymentId: string) => deferEmail(() => sendPaymentFailed(orderId, paymentId));
export const notifyOrderStatus = (orderId: string, status: string) => {
  if ((NOTIFIED_STATUSES as readonly string[]).includes(status)) deferEmail(() => sendOrderStatus(orderId, status as NotifiedStatus));
};

const MAX_EMAIL_ATTEMPTS = 5;

/** Re-sends order emails whose last attempt failed (delay grows with each attempt). Account emails with one-time links are not retried: the customer asks for a new one. */
export async function retryFailedEmails(limit = 25) {
  const rows = await prisma.emailLog.findMany({
    where: { status: "failed", attempts: { lt: MAX_EMAIL_ATTEMPTS }, template: { in: ["order_placed", "payment_success", "payment_failed", "order_status"] } },
    orderBy: { updated_at: "asc" },
    take: limit,
    select: { idempotency_key: true, attempts: true, updated_at: true },
  });
  let retried = 0;
  for (const r of rows) {
    if (Date.now() - r.updated_at.getTime() < 2 ** r.attempts * 60_000) continue;
    const [template, id, extra] = r.idempotency_key.split(":");
    try {
      if (template === "order_placed") await sendOrderPlaced(id);
      else if (template === "payment_success") await sendPaymentSuccess(id);
      else if (template === "payment_failed" && extra) await sendPaymentFailed(id, extra);
      else if (template === "order_status" && extra && (NOTIFIED_STATUSES as readonly string[]).includes(extra)) await sendOrderStatus(id, extra as NotifiedStatus);
      retried++;
    } catch (err) {
      console.error("[email] retry failed:", err instanceof Error ? err.message : "unknown");
    }
  }
  return retried;
}
