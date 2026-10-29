import { connection } from "next/server";
import { processWebhook } from "@/lib/services/payments";

/**
 * Razorpay webhook receiver (payment.captured, payment.failed, payment.authorized, order.paid).
 * The body is read as raw text: the signature covers those exact bytes, so it must not be parsed first.
 * Responds 2xx for anything handled or deliberately ignored, 400 for a bad signature, 5xx so Razorpay retries on our own failures.
 */
export async function POST(request: Request) {
  await connection();
  const raw = await request.text();
  try {
    const result = await processWebhook(raw, request.headers.get("x-razorpay-signature") ?? "", request.headers.get("x-razorpay-event-id"));
    return new Response(result.body, { status: result.status });
  } catch (err) {
    console.error("[razorpay/webhook]", err instanceof Error ? err.message : "unknown");
    return new Response("error", { status: 500 });
  }
}
