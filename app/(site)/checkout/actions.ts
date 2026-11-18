"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { CATALOGUE_TAG } from "@/lib/catalogue/queries";
import { getCustomer } from "@/lib/auth/customer";
import { notifyOrderPlaced } from "@/lib/email/notifications";
import { fieldErrors } from "@/lib/services/enquiry-form";
import { expireUnpaidOrders } from "@/lib/services/order-lifecycle";
import { placeOrder } from "@/lib/services/orders";
import { orderSchema } from "@/lib/validation/order";

export type CheckoutState =
  | { status: "idle" }
  | { status: "error"; message: string; fields: Record<string, string> }
  | { status: "success"; orderNumber: string; subtotal: number; currency: string }
  /** Order saved, awaiting online payment: the browser moves on to the payment page. */
  | { status: "payment"; orderNumber: string; accessToken: string };

export async function placeOrderAction(_prev: CheckoutState, fd: FormData): Promise<CheckoutState> {
  let items: unknown = [];
  try {
    items = JSON.parse(String(fd.get("items") ?? "[]"));
  } catch {
    return { status: "error", message: "Your cart could not be read. Please review it and try again.", fields: {} };
  }
  const parsed = orderSchema.safeParse({ ...Object.fromEntries(fd.entries()), items });
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    // A filled honeypot means a bot: respond as if accepted, store nothing.
    if (fields.website) return { status: "success", orderNumber: "—", subtotal: 0, currency: "INR" };
    return { status: "error", message: fields.items ?? "Please check the highlighted fields.", fields };
  }
  const h = await headers();
  const clientId = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  let result;
  try {
    // Unpaid online orders past their deadline give their stock back before this order looks for it.
    if ((await expireUnpaidOrders()).length) updateTag(CATALOGUE_TAG);
    // A signed-in customer's order is attached to their account; guest checkout stays as it was.
    const me = await getCustomer();
    result = await placeOrder(parsed.data, clientId, me?.id ?? null);
  } catch (err) {
    console.error("[checkout]", err);
    return { status: "error", message: "We could not place your order just now. Please try again, or call us to order by phone.", fields: {} };
  }
  if (!result.ok) return { status: "error", message: result.message, fields: {} };
  // Confirmation email (deduplicated per order, so a double submit sends one).
  if (result.orderId && result.created) {
    notifyOrderPlaced(result.orderId);
    // Stock just dropped: refresh the cached shop pages so "Only N left" tags are current.
    updateTag(CATALOGUE_TAG);
  }
  if (result.paymentMethod === "razorpay" && result.accessToken) return { status: "payment", orderNumber: result.orderNumber, accessToken: result.accessToken };
  return { status: "success", orderNumber: result.orderNumber, subtotal: result.subtotal, currency: result.currency };
}
