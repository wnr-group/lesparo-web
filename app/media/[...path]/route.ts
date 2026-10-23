import { readStoredFile } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

/** Serves public catalogue/site images from local storage (see lib/storage.ts). */
export async function GET(_request: Request, ctx: RouteContext<"/media/[...path]">) {
  const { path } = await ctx.params;
  const relative = path.join("/");
  const type = TYPES[relative.split(".").pop()?.toLowerCase() ?? ""];
  const bytes = type ? await readStoredFile("media", relative) : null;
  if (!bytes) return new Response("Not found", { status: 404 });
  // Uploads always get a fresh random name, so a stored path never changes content.
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
}
