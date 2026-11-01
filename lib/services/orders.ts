import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { razorpayEnabled } from "@/lib/payments/razorpay";
import { hitRateLimit, rateLimitKey } from "@/lib/services/enquiries";
import type { OrderInput } from "@/lib/validation/order";

export type PlaceOrderResult = { ok: true; orderNumber: string; subtotal: number; currency: string; paymentMethod: string; accessToken: string | null } | { ok: false; message: string };

/**
 * Creates a retail order. Prices, names and availability are read from the database here; nothing the
 * browser sends about money is trusted. Idempotent on idempotencyKey so a double submit places one order.
 */
export async function placeOrder(input: OrderInput, clientId: string): Promise<PlaceOrderResult> {
  const existing = await prisma.retailOrder.findUnique({ where: { idempotency_key: input.idempotencyKey }, select: { order_number: true, subtotal: true, currency: true, payment_method: true, access_token: true } });
  if (existing) return { ok: true, orderNumber: existing.order_number, subtotal: existing.subtotal, currency: existing.currency, paymentMethod: existing.payment_method, accessToken: existing.access_token };

  if (input.paymentMethod === "razorpay" && !razorpayEnabled()) return { ok: false, message: "Online payment is not available right now. Please choose cash on delivery or call us." };

  if (!(await hitRateLimit(rateLimitKey(`order:${clientId}`), 10, 3600))) return { ok: false, message: "Too many orders from this connection. Please try again later." };

  const ids = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, is_published: true, archived_at: null, retail_enabled: true, price: { not: null } },
    select: { id: true, name: true, price: true, currency: true, sizes: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: { product_id: string; product_name: string; size: string | null; quantity: number; unit_price: number }[] = [];
  for (const item of input.items) {
    const p = byId.get(item.productId);
    if (!p || p.price === null) return { ok: false, message: "A product in your cart is no longer available for direct purchase. Please review your cart." };
    const sizes = Array.isArray(p.sizes) ? (p.sizes as string[]) : [];
    const size = item.size || null;
    if (sizes.length && (!size || !sizes.includes(size))) return { ok: false, message: `Please choose a valid size for ${p.name}.` };
    lines.push({ product_id: p.id, product_name: p.name, size, quantity: item.quantity, unit_price: p.price });
  }
  const subtotal = lines.reduce((n, l) => n + l.unit_price * l.quantity, 0);
  const currency = products[0]?.currency ?? "INR";
  if (input.paymentMethod === "razorpay" && currency !== "INR") return { ok: false, message: "Online payment supports INR orders only." };
  // The buyer's private key to this order's status and payment page.
  const accessToken = randomBytes(24).toString("base64url");

  const order = await prisma.$transaction(async (tx) => {
    const counter = await tx.counter.upsert({ where: { name: "order_number" }, create: { name: "order_number", value: 1 }, update: { value: { increment: 1 } } });
    const year = new Intl.DateTimeFormat("en-IN", { year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date());
    return tx.retailOrder.create({
      data: {
        order_number: `ORD-${year}-${String(counter.value).padStart(5, "0")}`,
        idempotency_key: input.idempotencyKey,
        customer_name: input.customerName,
        email: input.email,
        phone: input.phone,
        address_line: input.addressLine,
        city: input.city,
        state: input.state,
        postcode: input.postcode,
        notes: input.notes,
        payment_method: input.paymentMethod,
        access_token: accessToken,
        currency,
        subtotal,
        items: { create: lines },
      },
      select: { order_number: true },
    });
  });
  return { ok: true, orderNumber: order.order_number, subtotal, currency, paymentMethod: input.paymentMethod, accessToken };
}
