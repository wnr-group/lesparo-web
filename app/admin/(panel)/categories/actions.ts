"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { AuthorizationError, requireAdmin } from "@/lib/auth/staff";
import { CATALOGUE_TAG } from "@/lib/catalogue/queries";
import { prisma } from "@/lib/db";
import { fieldErrors } from "@/lib/services/enquiry-form";
import { sniffFileType } from "@/lib/services/file-sniff";
import { saveFile } from "@/lib/storage";
import { categorySchema } from "@/lib/validation/catalogue";

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

/** The category and all of its descendants. */
async function categorySubtree(root: string): Promise<string[]> {
  const all = await prisma.category.findMany({ select: { id: true, parent_id: true } });
  const walk = (id: string): string[] => [id, ...all.filter((c) => c.parent_id === id).flatMap((c) => walk(c.id))];
  return walk(root);
}

export async function saveCategory(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let newId: string | null = null;
  try {
    await requireAdmin();
    const parsed = categorySchema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) return { error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
    const c = parsed.data;

    if (id && c.parentId) {
      // Prevent cycles: the new parent may not be this category or one of its descendants.
      if ((await categorySubtree(id)).includes(c.parentId)) return { error: "A category cannot be placed inside itself.", fields: { parentId: "Choose a different parent." } };
    }

    let coverPath: string | undefined;
    const cover = fd.get("cover");
    if (cover instanceof File && cover.size > 0) {
      if (cover.size > 10 * 1024 * 1024) return { error: "Cover image must be under 10 MB.", fields: { cover: "Too large." } };
      const bytes = new Uint8Array(await cover.arrayBuffer());
      const type = sniffFileType(bytes);
      if (!type || type.mime === "application/pdf") return { error: "Cover must be a JPG, PNG or WebP image.", fields: { cover: "Unsupported file." } };
      coverPath = `categories/${c.slug}/${randomUUID()}.${type.ext}`;
      await saveFile("media", coverPath, bytes);
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
      await prisma.category.update({ where: { id: z.uuid().parse(id) }, data: row });
    } else {
      newId = (await prisma.category.create({ data: row, select: { id: true } })).id;
    }
    updateTag(CATALOGUE_TAG);
    refresh();
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    if ((err as { code?: string }).code === "P2002") return { error: "That slug is already used.", fields: { slug: "Already in use." } };
    console.error("[admin/categories]", err);
    return { error: "Something went wrong. Please try again." };
  }
  if (newId) redirect(`/admin/categories/${newId}`);
  return { ok: true };
}
