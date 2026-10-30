"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { AuthorizationError, requireAdmin, requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { reconcileOrder } from "@/lib/services/payments";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/validation/order";

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const schema = z.object({ status: z.enum(ORDER_STATUSES), paymentStatus: z.enum(PAYMENT_STATUSES) });

/**
 * Staff can move an order through fulfilment. Payment status on an online (Razorpay) order is owned by the
 * verified payment flow: staff may only record a refund once it has been paid, and every change is written to the audit log.
 * Anything else about a Razorpay payment is corrected with "Check with Razorpay", which asks Razorpay rather than trusting a typed value.
 */
export async function updateOrder(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await requireStaff();
    const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) return { error: "Choose a valid status." };
    const orderId = z.uuid().parse(id);
    const order = await prisma.retailOrder.findUnique({ where: { id: orderId }, select: { status: true, payment_status: true, payment_method: true } });
    if (!order) return { error: "Order not found." };

    const { status, paymentStatus } = parsed.data;
    const paymentChanged = paymentStatus !== order.payment_status;
    if (order.payment_method === "razorpay" && paymentChanged && !(paymentStatus === "refunded" && order.payment_status === "paid"))
      return { error: "This payment is managed through Razorpay. Use “Check with Razorpay” to refresh it, or record a refund once an order is paid." };
    if (paymentChanged && paymentStatus === "refunded" && order.payment_method === "razorpay") await requireAdmin();

    const actor = session.email ?? session.userId;
    await prisma.$transaction([
      prisma.retailOrder.update({ where: { id: orderId }, data: { status, payment_status: paymentStatus } }),
      ...(status !== order.status ? [prisma.orderAudit.create({ data: { order_id: orderId, actor, action: "order_status", from_value: order.status, to_value: status } })] : []),
      ...(paymentChanged ? [prisma.orderAudit.create({ data: { order_id: orderId, actor, action: "payment_status", from_value: order.payment_status, to_value: paymentStatus } })] : []),
    ]);
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
