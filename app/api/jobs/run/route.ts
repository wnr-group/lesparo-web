import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { revalidateTag } from "next/cache";
import { CATALOGUE_TAG } from "@/lib/catalogue/queries";
import { expireUnpaidOrders } from "@/lib/services/order-lifecycle";
import { processDueJobs } from "@/lib/services/jobs";

/**
 * Processes due integration jobs (retries). Call on a schedule, e.g. Vercel Cron every
 * 10 minutes, with `Authorization: Bearer $CRON_SECRET`. Disabled when CRON_SECRET is unset.
 */
export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const ok = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return new Response("Unauthorized", { status: 401 });
  const processed = await processDueJobs();
  const expired = await expireUnpaidOrders();
  if (expired.length) revalidateTag(CATALOGUE_TAG, "max");
  return Response.json({ processed, expiredOrders: expired.length });
}
