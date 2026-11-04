import "server-only";

/**
 * File storage in Supabase Storage (the same project as the database), over its REST API with the server-only secret key.
 * Two areas, each a bucket (created by scripts/setup-storage.ts):
 * - media        public catalogue/site images in `product-media`, linked by their public URL
 * - attachments  private enquiry files in `enquiry-attachments`, served to staff only by
 *                app/admin/attachments/[id]/route.ts
 * Paths stored in the database are relative to their bucket, e.g. "products/<slug>/01.jpg".
 */
export type StorageArea = "media" | "attachments";

export const BUCKETS: Record<StorageArea, string> = { media: "product-media", attachments: "enquiry-attachments" };

const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", pdf: "application/pdf" };

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("File storage needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY. See .env.example.");
  return { url: url.replace(/\/+$/, ""), headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

/** Encodes a stored path for a storage URL, refusing anything that could escape its bucket. */
function objectPath(relative: string): string | null {
  const parts = relative.split("/");
  if (!relative || parts.some((p) => p === "" || p === "." || p === ".." || p.includes("\\"))) return null;
  return parts.map(encodeURIComponent).join("/");
}

export async function saveFile(area: StorageArea, relative: string, bytes: Uint8Array) {
  const p = objectPath(relative);
  const type = TYPES[relative.split(".").pop()?.toLowerCase() ?? ""];
  if (!p || !type) throw new Error(`Invalid storage path: ${relative}`);
  const { url, headers } = config();
  const res = await fetch(`${url}/storage/v1/object/${BUCKETS[area]}/${p}`, {
    method: "POST",
    // Uploads always get a fresh random name, so overwriting only happens on re-imports of the same image.
    headers: { ...headers, "Content-Type": type, "Cache-Control": "max-age=31536000", "x-upsert": "true" },
    body: new Uint8Array(bytes),
  });
  if (!res.ok) throw new Error(`Storage upload failed for ${relative}: ${res.status} ${await res.text()}`);
}

export async function readStoredFile(area: StorageArea, relative: string): Promise<Buffer | null> {
  const p = objectPath(relative);
  if (!p) return null;
  const { url, headers } = config();
  const res = await fetch(`${url}/storage/v1/object/${BUCKETS[area]}/${p}`, { headers, cache: "no-store" }).catch(() => null);
  return res?.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

export async function removeFile(area: StorageArea, relative: string) {
  if (!objectPath(relative)) return;
  const { url, headers } = config();
  const res = await fetch(`${url}/storage/v1/object/${BUCKETS[area]}`, {
    method: "DELETE",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [relative] }),
  });
  if (!res.ok) throw new Error(`Storage delete failed for ${relative}: ${res.status} ${await res.text()}`);
}

export function publicMediaUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (/^https?:\/\//.test(storagePath)) return storagePath;
  // Local development: images imported from disk are served from /public (scripts/import-drive-products.ts).
  if (storagePath.startsWith("/local-products/")) return storagePath;
  const p = objectPath(storagePath);
  return p ? `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKETS.media}/${p}` : null;
}
