"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { AuthorizationError, requireAdmin } from "@/lib/auth/staff";
import { CATALOGUE_TAG } from "@/lib/catalogue/queries";
import { fieldErrors } from "@/lib/services/enquiry-form";
import { sniffFileType } from "@/lib/services/file-sniff";
import { createClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation/catalogue";

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

export async function saveCategory(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let newId: string | null = null;
  try {
    await requireAdmin();
    const parsed = categorySchema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) return { error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
    const c = parsed.data;
    const db = await createClient();

    if (id && c.parentId) {
      // Prevent cycles: the new parent may not be this category or one of its descendants.
      const { data: subtree } = await db.rpc("category_subtree", { root: id });
      if ((subtree as string[] | null)?.includes(c.parentId)) return { error: "A category cannot be placed inside itself.", fields: { parentId: "Choose a different parent." } };
    }

    let coverPath: string | undefined;
    const cover = fd.get("cover");
    if (cover instanceof File && cover.size > 0) {
      if (cover.size > 10 * 1024 * 1024) return { error: "Cover image must be under 10 MB.", fields: { cover: "Too large." } };
      const bytes = new Uint8Array(await cover.arrayBuffer());
      const type = sniffFileType(bytes);
      if (!type || type.mime === "application/pdf") return { error: "Cover must be a JPG, PNG or WebP image.", fields: { cover: "Unsupported file." } };
      coverPath = `categories/${c.slug}/${randomUUID()}.${type.ext}`;
      const up = await db.storage.from("product-media").upload(coverPath, bytes, { contentType: type.mime });
      if (up.error) throw up.error;
    }

    const row = {
      name: c.name,
      slug: c.slug,
      parent_id: c.parentId,
      description: c.description,
      display_order: c.displayOrder,
      is_published: c.isPublished,
      is_featured: c.isFeatured,
      ...(coverPath && { cover_image_path: coverPath }),
    };
    if (id) {
      const { error } = await db.from("categories").update(row).eq("id", z.uuid().parse(id));
      if (error) throw error;
    } else {
      const { data, error } = await db.from("categories").insert(row).select("id").single();
      if (error) throw error;
      newId = data.id;
    }
    updateTag(CATALOGUE_TAG);
    refresh();
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    if ((err as { code?: string }).code === "23505") return { error: "That slug is already used.", fields: { slug: "Already in use." } };
    console.error("[admin/categories]", err);
    return { error: "Something went wrong. Please try again." };
  }
  if (newId) redirect(`/admin/categories/${newId}`);
  return { ok: true };
}
