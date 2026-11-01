/**
 * Creates the Supabase Storage buckets used by lib/storage.ts (idempotent), then uploads any files left in the old
 * local storage folder (storage/media, storage/attachments) to them. Files already in a bucket are overwritten
 * with the local copy; nothing is deleted locally.
 *
 *   npm run storage:setup
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { BUCKETS, saveFile, type StorageArea } from "../lib/storage";

const MB = 1024 * 1024;
const SETTINGS: Record<StorageArea, { public: boolean; file_size_limit: number; allowed_mime_types: string[] }> = {
  media: { public: true, file_size_limit: 10 * MB, allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/avif"] },
  attachments: { public: false, file_size_limit: 10 * MB, allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.");
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function ensureBucket(area: StorageArea) {
  const id = BUCKETS[area];
  const body = JSON.stringify({ id, name: id, ...SETTINGS[area] });
  const existing = await fetch(`${url}/storage/v1/bucket/${id}`, { headers });
  const res = existing.ok
    ? await fetch(`${url}/storage/v1/bucket/${id}`, { method: "PUT", headers, body })
    : await fetch(`${url}/storage/v1/bucket`, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`bucket ${id}: ${res.status} ${await res.text()}`);
  console.log(`bucket ${id}: ${existing.ok ? "updated" : "created"} (${SETTINGS[area].public ? "public" : "private"})`);
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => []);
  return entries.filter((e) => e.isFile()).map((e) => path.relative(dir, path.join(e.parentPath, e.name)).split(path.sep).join("/"));
}

async function main() {
  for (const area of Object.keys(BUCKETS) as StorageArea[]) {
    await ensureBucket(area);
    const dir = path.join(process.cwd(), "storage", area);
    const files = await listFiles(dir);
    for (const file of files) await saveFile(area, file, await readFile(path.join(dir, file)));
    console.log(`  ${files.length} local file(s) uploaded from storage/${area}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
