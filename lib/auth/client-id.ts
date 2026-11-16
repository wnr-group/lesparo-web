import "server-only";
import { headers } from "next/headers";

/** The caller's address as the platform reports it, used only to key rate limits. */
export async function clientId() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
