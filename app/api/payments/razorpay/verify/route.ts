import { connection } from "next/server";
import { z } from "zod";
import { clientIp, noStore, readJson } from "@/lib/payments/http";
import { verifyCheckoutPayment } from "@/lib/services/payments";

const body = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  token: z.string().trim().min(16).max(128),
  razorpay_order_id: z.string().trim().min(5).max(64),
  razorpay_payment_id: z.string().trim().min(5).max(64),
  razorpay_signature: z.string().trim().min(10).max(256),
});

/** Verifies the Checkout callback on the server. Nothing the browser says counts as payment until this succeeds. */
export async function POST(request: Request) {
  await connection();
  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ message: "Invalid request." }, { status: 400, headers: noStore });
  const d = parsed.data;
  try {
    const result = await verifyCheckoutPayment(
      { orderNumber: d.orderNumber, token: d.token, razorpayOrderId: d.razorpay_order_id, razorpayPaymentId: d.razorpay_payment_id, razorpaySignature: d.razorpay_signature },
      clientIp(request),
    );
    if (!result.ok) return Response.json({ message: result.message }, { status: result.status, headers: noStore });
    return Response.json({ paymentStatus: result.paymentStatus }, { headers: noStore });
  } catch (err) {
    console.error("[razorpay/verify]", err instanceof Error ? err.message : "unknown");
    return Response.json({ message: "We could not confirm the payment just now. If money was deducted it will be reconciled automatically." }, { status: 500, headers: noStore });
  }
}
