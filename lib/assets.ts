/**
 * Site images, videos and 3D models live in the public `site-assets` bucket in Supabase Storage (not in /public),
 * under the same relative paths they used to have: asset("/hero/banner-gents.webp"). Upload them with `npm run assets:upload`.
 * Safe to import from client components: it only needs the public project URL, which is inlined at build time.
 */
export const SITE_ASSETS_BUCKET = "site-assets";

const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");

export function asset(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const clean = path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${SITE_ASSETS_BUCKET}/${clean}`;
}
