"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { AuthorizationError, requireAdmin, requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { releaseStock } from "@/lib/inventory/stock";
import { updateTag } from "next/cache";
import { CATALOGUE_TAG } from "@/lib/catalogue/queries";
import { notifyOrderStatus } from "@/lib/email/notifications";
import { reconcileOrder } from "@/lib/services/payments";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/validation/order";

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const schema = z.object({
  status: z.enum(ORDER_STATUSES),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  trackingCarrier: optionalText(80),
  trackingNumber: optionalText(80),
  trackingUrl: optionalText(500).refine((v) => v === null || /^https?:\/\//i.test(v), "Use a full link starting with https://"),
});

/**
 * Staff can move an order through fulfilment. Payment status on an online (Razorpay) order is owned by the
 * verified payment flow: staff may only record a refund once it has been paid, and every change is written to the audit log.
 * Anything else about a Razorpay payment is corrected with "Check with Razorpay", which asks Razorpay rather than trusting a typed value.
 */
export async function updateOrder(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await requireStaff();
    const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) return { error: parsed.error.issues.some((i) => i.path[0] === "trackingUrl") ? "The tracking link must start with https://" : "Choose a valid status." };
    const orderId = z.uuid().parse(id);
    const order = await prisma.retailOrder.findUnique({ where: { id: orderId }, select: { status: true, payment_status: true, payment_method: true } });
    if (!order) return { error: "Order not found." };


    const { status, paymentStatus } = parsed.data;
    const paymentChanged = paymentStatus !== order.payment_status;
    // Cancelling returned the order's units to stock. Reopening it would leave a live order with no stock behind it,
    // so a cancelled order stays cancelled: place a new order instead.
    if (order.status === "cancelled" && status !== "cancelled") return { error: "A cancelled order cannot be reopened because its stock was returned. Place a new order instead." };
    if (order.payment_method === "razorpay" && paymentChanged && !(paymentStatus === "refunded" && order.payment_status === "paid"))
      return { error: "This payment is managed through Razorpay. Use “Check with Razorpay” to refresh it, or record a refund once an order is paid." };
    if (paymentChanged && paymentStatus === "refunded" && order.payment_method === "razorpay") await requireAdmin();

    const actor = session.email ?? session.userId;
    const cancelling = status === "cancelled" && order.status !== "cancelled";
    // One transaction: the status change, its audit entries and (for a cancellation) the units going back to stock all succeed
    // or all fail together. A failure can never leave an order cancelled with its stock still taken.
    await prisma.$transaction(async (tx) => {
      await tx.retailOrder.update({ where: { id: orderId }, data: { status, payment_status: paymentStatus, tracking_carrier: parsed.data.trackingCarrier, tracking_number: parsed.data.trackingNumber, tracking_url: parsed.data.trackingUrl } });
      if (status !== order.status) await tx.orderAudit.create({ data: { order_id: orderId, actor, action: "order_status", from_value: order.status, to_value: status } });
      if (paymentChanged) await tx.orderAudit.create({ data: { order_id: orderId, actor, action: "payment_status", from_value: order.payment_status, to_value: paymentStatus } });
      if (cancelling) await releaseStock(tx, orderId, actor);
    });
    // The customer is told once per status (the email key includes the status), after the change is saved.
    if (status !== order.status) notifyOrderStatus(orderId, status);
    // The cancelled order's units are back on sale, so the shop tags update straight away.
    if (cancelling) updateTag(CATALOGUE_TAG);
    refresh();
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    console.error("[admin/orders]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

/** Asks Razorpay what happened to this order's payments and applies it with the same rules as the webhook. */
export async function reconcileOrderAction(id: string): Promise<ActionState> {
  try {
    const session = await requireStaff();
    const orderId = z.uuid().parse(id);
    const result = await reconcileOrder(orderId);
    if (!result.ok) return { error: result.message };
    await prisma.orderAudit.create({ data: { order_id: orderId, actor: session.email ?? session.userId, action: "reconcile", from_value: null, to_value: result.message } });
    refresh();
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    console.error("[admin/orders/reconcile]", err);
    return { error: "Something went wrong. Please try again." };
  }
}
