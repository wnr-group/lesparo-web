import "server-only";
import { headers } from "next/headers";
import { hitRateLimit, rateLimitKey } from "@/lib/services/enquiries";

/** The caller's address as seen by the proxy, for rate limiting only (it is hashed with a secret salt before storage). */
export async function callerId(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Fixed-window limits for the sign-in and password-reset forms, per caller address and per target email, so a
 * password-guessing run against one account or from one address is slowed down. Returns true while within limits.
 */
export async function withinAuthLimits(action: "login" | "reset", email: string, max: number, windowSeconds: number): Promise<boolean> {
  const byCaller = await hitRateLimit(rateLimitKey(`admin-${action}:ip:${await callerId()}`), max, windowSeconds);
  const byEmail = await hitRateLimit(rateLimitKey(`admin-${action}:email:${email.toLowerCase()}`), max, windowSeconds);
  return byCaller && byEmail;
}
