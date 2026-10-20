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
import { productSchema, specSchema } from "@/lib/validation/catalogue";

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

function failure(err: unknown): ActionState {
  if (err instanceof AuthorizationError) return { error: err.message };
  const e = err as { code?: string; message?: string };
  if (e.code === "23505") return { error: "That slug or SKU is already used by another product.", fields: { slug: "Already in use." } };
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
    const db = await createClient();
    if (id) {
      const { error } = await db.from("products").update(row).eq("id", z.uuid().parse(id));
      if (error) throw error;
    } else {
      const { data, error } = await db.from("products").insert(row).select("id").single();
      if (error) throw error;
      newId = data.id;
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
    const db = await createClient();
    const { error } = await db
      .from("products")
      .update({ archived_at: archived ? new Date().toISOString() : null, ...(archived && { is_published: false }) })
      .eq("id", z.uuid().parse(id));
    if (error) throw error;
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

    const db = await createClient();
    const { data: product } = await db.from("products").select("slug, name, product_images(display_order, is_primary)").eq("id", pid).single();
    if (!product) return { error: "Product not found." };
    let order = Math.max(-1, ...product.product_images.map((i) => i.display_order)) + 1;
    let hasPrimary = product.product_images.some((i) => i.is_primary);

    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES) return { error: `${file.name} is larger than 10 MB.` };
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = sniffFileType(bytes);
      if (!type || type.mime === "application/pdf") return { error: `${file.name} is not a JPG, PNG or WebP image.` };
      const path = `products/${product.slug}/${randomUUID()}.${type.ext}`;
      const up = await db.storage.from("product-media").upload(path, bytes, { contentType: type.mime });
      if (up.error) throw up.error;
      const { error } = await db.from("product_images").insert({
        product_id: pid,
        storage_path: path,
        alt_text: product.name,
        display_order: order++,
        is_primary: !hasPrimary,
      });
      if (error) throw error;
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
    const db = await createClient();
    const { data: img } = await db.from("product_images").select("*").eq("id", z.uuid().parse(imageId)).single();
    if (!img) return { error: "Image not found." };

    if (change.remove) {
      const { error } = await db.from("product_images").delete().eq("id", img.id);
      if (error) throw error;
      await db.storage.from("product-media").remove([img.storage_path]);
      if (img.is_primary) {
        const { data: next } = await db.from("product_images").select("id").eq("product_id", img.product_id).order("display_order").limit(1).maybeSingle();
        if (next) await db.from("product_images").update({ is_primary: true }).eq("id", next.id);
      }
    } else if (change.primary) {
      await db.from("product_images").update({ is_primary: false }).eq("product_id", img.product_id).eq("is_primary", true);
      const { error } = await db.from("product_images").update({ is_primary: true }).eq("id", img.id);
      if (error) throw error;
    } else if (change.move) {
      const { data: siblings } = await db.from("product_images").select("id, display_order").eq("product_id", img.product_id).order("display_order");
      const list = siblings ?? [];
      const idx = list.findIndex((s) => s.id === img.id);
      const swap = list[idx + change.move];
      if (swap) {
        // Re-number densely so swaps are always well-defined.
        const reordered = [...list];
        [reordered[idx], reordered[idx + change.move]] = [reordered[idx + change.move], reordered[idx]];
        for (const [i, s] of reordered.entries()) await db.from("product_images").update({ display_order: i }).eq("id", s.id);
      }
    } else if (change.alt !== undefined) {
      const alt = z.string().trim().max(200).parse(change.alt);
      const { error } = await db.from("product_images").update({ alt_text: alt }).eq("id", img.id);
      if (error) throw error;
    }
    done();
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}
