/**
 * Uploads the site's images, videos and 3D models from /public to the public `site-assets` bucket in Supabase Storage
 * (creating the bucket if needed), keeping the same relative paths: public/hero/a.webp -> site-assets/hero/a.webp.
 * The site reads them through asset() in lib/assets.ts. Safe to re-run: existing files are overwritten.
 *
 *   npm run assets:upload              upload everything
 *   npm run assets:upload -- --dry-run list what would be uploaded
 *
 * public/local-products (the local dev copy of the catalogue photos) is skipped: catalogue photos belong in the
 * product-media bucket and are published by `npm run catalogue:publish`.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { SITE_ASSETS_BUCKET } from "../lib/assets";

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.");
const auth = { apikey: key, Authorization: `Bearer ${key}` };

const TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", svg: "image/svg+xml",
  mp4: "video/mp4", webm: "video/webm", glb: "model/gltf-binary",
};
const SKIP_DIRS = new Set(["local-products"]);

async function ensureBucket() {
  const settings = {
    id: SITE_ASSETS_BUCKET, name: SITE_ASSETS_BUCKET, public: true, file_size_limit: 50 * 1024 * 1024,
    allowed_mime_types: Object.values(TYPES),
  };
  const headers = { ...auth, "Content-Type": "application/json" };
  const existing = await fetch(`${url}/storage/v1/bucket/${SITE_ASSETS_BUCKET}`, { headers });
  const res = existing.ok
    ? await fetch(`${url}/storage/v1/bucket/${SITE_ASSETS_BUCKET}`, { method: "PUT", headers, body: JSON.stringify(settings) })
    : await fetch(`${url}/storage/v1/bucket`, { method: "POST", headers, body: JSON.stringify(settings) });
  if (!res.ok) throw new Error(`bucket ${SITE_ASSETS_BUCKET}: ${res.status} ${await res.text()}`);
  console.log(`bucket ${SITE_ASSETS_BUCKET}: ${existing.ok ? "updated" : "created"} (public)`);
}

async function listFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (dir === root && SKIP_DIRS.has(e.name)) continue;
        await walk(full);
      } else if (TYPES[e.name.split(".").pop()!.toLowerCase()]) out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  }
  await walk(root);
  return out.sort();
}

async function upload(rel: string, root: string) {
  const type = TYPES[rel.split(".").pop()!.toLowerCase()];
  const body = await readFile(path.join(root, rel));
  const res = await fetch(`${url}/storage/v1/object/${SITE_ASSETS_BUCKET}/${rel.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { ...auth, "Content-Type": type, "Cache-Control": "max-age=604800", "x-upsert": "true" },
    body: new Uint8Array(body),
  });
  if (!res.ok) throw new Error(`upload ${rel}: ${res.status} ${await res.text()}`);
}

async function main() {
  const root = path.join(process.cwd(), "public");
  const files = await listFiles(root);
  console.log(`${files.length} file(s) to upload from public/ (local-products skipped)`);
  if (dryRun) {
    for (const f of files) console.log("  " + f);
    return;
  }
  await ensureBucket();
  let next = 0;
  let done = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < files.length) {
      const f = files[next++];
      await upload(f, root);
      if (++done % 25 === 0 || done === files.length) console.log(`  ${done}/${files.length}`);
    }
  }));
  console.log("Done. Files are at " + `${url}/storage/v1/object/public/${SITE_ASSETS_BUCKET}/<path>`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
