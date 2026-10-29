import { connection } from "next/server";
import { z } from "zod";
import { clientIp, noStore, readJson } from "@/lib/payments/http";
import { createPaymentSession } from "@/lib/services/payments";

const body = z.object({ orderNumber: z.string().trim().min(3).max(40), token: z.string().trim().min(16).max(128) });

/** Creates (or reuses) the Razorpay order for an order the buyer already placed. The amount is computed on the server. */
export async function POST(request: Request) {
  await connection();
  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) return Response.json({ message: "Invalid request." }, { status: 400, headers: noStore });
  try {
    const result = await createPaymentSession(parsed.data.orderNumber, parsed.data.token, clientIp(request));
    if (!result.ok) return Response.json({ message: result.message }, { status: result.status, headers: noStore });
    return Response.json(result, { headers: noStore });
  } catch (err) {
    console.error("[razorpay/order]", err instanceof Error ? err.message : "unknown");
    return Response.json({ message: "We could not start the payment. Please try again." }, { status: 500, headers: noStore });
  }
}
