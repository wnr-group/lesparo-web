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
import { removeFile, saveFile } from "@/lib/storage";
import { productSchema, specSchema } from "@/lib/validation/catalogue";

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

function failure(err: unknown): ActionState {
  if (err instanceof AuthorizationError) return { error: err.message };
  if ((err as { code?: string }).code === "P2002") return { error: "That slug or SKU is already used by another product.", fields: { slug: "Already in use." } };
  console.error("[admin/products]", err);
  return { error: "Something went wrong. Please try again." };
}

function done() {
  updateTag(CATALOGUE_TAG);
  refresh();
}

export async function saveProduct(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let newId: string | null = null;
  try {
    await requireAdmin();
    let specs: unknown = [];
    try {
      specs = JSON.parse(String(fd.get("specs") ?? "[]"));
    } catch {
      return { error: "Specifications could not be read.", fields: { specs: "Invalid specifications." } };
    }
    const parsed = productSchema.safeParse({ ...Object.fromEntries(fd.entries()), specs: z.array(specSchema).safeParse(specs).success ? specs : [] });
    if (!parsed.success) return { error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
    const p = parsed.data;
    const row = {
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      category_id: p.categoryId,
      description: p.description,
      fabric: p.fabric,
      sizes: p.sizes,
      packing: p.packing,
      specs: p.specs,
      quote_enabled: p.quoteEnabled,
      retail_enabled: p.retailEnabled,
      price: p.price,
      is_published: p.isPublished,
      is_featured: p.isFeatured,
      seo_title: p.seoTitle,
      seo_description: p.seoDescription,
    };
    if (id) {
      await prisma.product.update({ where: { id: z.uuid().parse(id) }, data: row });
    } else {
      newId = (await prisma.product.create({ data: row, select: { id: true } })).id;
    }
    done();
  } catch (err) {
    return failure(err);
  }
  if (newId) redirect(`/admin/products/${newId}?created=1`);
  return { ok: true };
}

export async function setArchived(id: string, archived: boolean): Promise<ActionState> {
  try {
    await requireAdmin();
    await prisma.product.update({
      where: { id: z.uuid().parse(id) },
      data: { archived_at: archived ? new Date() : null, ...(archived && { is_published: false }) },
    });
    done();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function uploadImages(productId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const pid = z.uuid().parse(productId);
    const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return { error: "Choose at least one image." };
    if (files.length > 12) return { error: "Upload up to 12 images at a time." };

    const product = await prisma.product.findUnique({ where: { id: pid }, select: { slug: true, name: true, images: { select: { display_order: true, is_primary: true } } } });
    if (!product) return { error: "Product not found." };
    let order = Math.max(-1, ...product.images.map((i) => i.display_order)) + 1;
    let hasPrimary = product.images.some((i) => i.is_primary);

    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES) return { error: `${file.name} is larger than 10 MB.` };
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = sniffFileType(bytes);
      if (!type || type.mime === "application/pdf") return { error: `${file.name} is not a JPG, PNG or WebP image.` };
      const path = `products/${product.slug}/${randomUUID()}.${type.ext}`;
      await saveFile("media", path, bytes);
      await prisma.productImage.create({
        data: { product_id: pid, storage_path: path, alt_text: product.name, display_order: order++, is_primary: !hasPrimary },
      });
      hasPrimary = true;
    }
    done();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

export async function updateImage(imageId: string, change: { alt?: string; move?: -1 | 1; primary?: true; remove?: true }): Promise<ActionState> {
  try {
    await requireAdmin();
    const img = await prisma.productImage.findUnique({ where: { id: z.uuid().parse(imageId) } });
    if (!img) return { error: "Image not found." };

    if (change.remove) {
      await prisma.productImage.delete({ where: { id: img.id } });
      await removeFile("media", img.storage_path);
      if (img.is_primary) {
        const next = await prisma.productImage.findFirst({ where: { product_id: img.product_id }, orderBy: { display_order: "asc" }, select: { id: true } });
        if (next) await prisma.productImage.update({ where: { id: next.id }, data: { is_primary: true } });
      }
    } else if (change.primary) {
      await prisma.$transaction([
        prisma.productImage.updateMany({ where: { product_id: img.product_id, is_primary: true }, data: { is_primary: false } }),
        prisma.productImage.update({ where: { id: img.id }, data: { is_primary: true } }),
      ]);
    } else if (change.move) {
      const list = await prisma.productImage.findMany({ where: { product_id: img.product_id }, orderBy: { display_order: "asc" }, select: { id: true } });
      const idx = list.findIndex((s) => s.id === img.id);
      if (list[idx + change.move]) {
        // Re-number densely so swaps are always well-defined.
        const reordered = [...list];
        [reordered[idx], reordered[idx + change.move]] = [reordered[idx + change.move], reordered[idx]];
        await prisma.$transaction(reordered.map((s, i) => prisma.productImage.update({ where: { id: s.id }, data: { display_order: i } })));
      }
    } else if (change.alt !== undefined) {
      const alt = z.string().trim().max(200).parse(change.alt);
      await prisma.productImage.update({ where: { id: img.id }, data: { alt_text: alt } });
    }
    done();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}
