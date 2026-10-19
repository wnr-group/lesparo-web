import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
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
  return Response.json({ processed });
}
