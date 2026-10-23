import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local-disk file storage (replaces Supabase Storage). Two areas under STORAGE_DIR:
 * - media/        public catalogue/site images, served by app/media/[...path]/route.ts
 * - attachments/  private enquiry files, served to staff only by
 *                 app/admin/attachments/[id]/route.ts
 * Paths stored in the database are relative to their area, e.g. "products/<slug>/01.jpg".
 */
export type StorageArea = "media" | "attachments";

const ROOT = path.resolve(process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage"));

/** Resolves a stored path inside its area, refusing anything that escapes it. */
export function resolveStoragePath(area: StorageArea, relative: string): string | null {
  const base = path.join(ROOT, area);
  const full = path.resolve(base, relative);
  return full.startsWith(base + path.sep) ? full : null;
}

export async function saveFile(area: StorageArea, relative: string, bytes: Uint8Array) {
  const full = resolveStoragePath(area, relative);
  if (!full) throw new Error(`Invalid storage path: ${relative}`);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
}

export async function readStoredFile(area: StorageArea, relative: string): Promise<Buffer | null> {
  const full = resolveStoragePath(area, relative);
  if (!full) return null;
  return readFile(full).catch(() => null);
}

export async function removeFile(area: StorageArea, relative: string) {
  const full = resolveStoragePath(area, relative);
  if (full) await rm(full, { force: true });
}

export function publicMediaUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (/^https?:\/\//.test(storagePath)) return storagePath;
  return `/media/${storagePath}`;
}
