import "server-only";

export const clientIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

/** JSON responses that browsers and proxies must not cache: they carry per-order payment state. */
export const noStore = { "Cache-Control": "no-store" };

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
