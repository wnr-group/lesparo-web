"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { AuthorizationError, requireAdmin } from "@/lib/auth/staff";
import { CATALOGUE_TAG, jsonStrings } from "@/lib/catalogue/queries";
import { prisma } from "@/lib/db";

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const qty = z.coerce.number().int("Whole numbers only.").min(0, "Cannot be negative.").max(1_000_000, "Too large.");

/** Thrown inside the save transaction so everything it already wrote is rolled back. */
class StockConflict extends Error {}

/** A required whole number: a blank field is an error, never silently zero. */
function whole(raw: FormDataEntryValue | null) {
  if (raw === null || String(raw).trim() === "") return { success: false as const, message: "Enter a number (0 or more)." };
  const r = qty.safeParse(String(raw).trim());
  return r.success ? { success: true as const, value: r.data } : { success: false as const, message: r.error.issues[0].message };
}

/**
 * Saves a product's inventory settings and per-size counts.
 *  - Sizes come from the product itself, never from the form, so a crafted post cannot invent sizes.
 *  - Each size's form carries the quantity the admin saw (`was:SIZE`). A size left unchanged is not touched, so saving the
 *    threshold with an old page can never overwrite sales made since. A size that was changed is applied only if the stock
 *    is still what the admin saw; otherwise the whole save is refused and they reload.
 *  - The product row is locked and the current counts are read inside the transaction, so two admins saving at once queue up
 *    and every movement records the true change (new minus what was really there).
 */
export async function saveStock(productId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await requireAdmin();
    const id = z.uuid().parse(productId);
    const product = await prisma.product.findUnique({ where: { id }, select: { sizes: true } });
    if (!product) return { error: "Product not found." };

    const track = fd.get("track") === "on";
    const threshold = whole(fd.get("threshold"));
    const fields: Record<string, string> = {};
    if (!threshold.success) fields.threshold = threshold.message;

    const keys = jsonStrings(product.sizes).length ? jsonStrings(product.sizes) : [""];
    const wanted = new Map<string, { next: number; was: number }>();
    for (const k of keys) {
      const next = whole(fd.get(`qty:${k}`));
      const was = whole(fd.get(`was:${k}`));
      if (!next.success) fields[`qty:${k}`] = next.message;
      else if (!was.success) return { error: "This page is out of date. Reload it and try again." };
      else wanted.set(k, { next: next.value, was: was.value });
    }
    if (Object.keys(fields).length) return { error: "Please check the highlighted fields.", fields };

    const note = String(fd.get("note") ?? "").trim().slice(0, 200) || null;
    const actor = session.email ?? session.userId;

    await prisma.$transaction(async (tx) => {
      // Saves on the same product queue here.
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${id} FOR UPDATE`;
      await tx.product.update({ where: { id }, data: { track_inventory: track, low_stock_threshold: threshold.success ? threshold.value : 0 } });
      const rows = await tx.productStock.findMany({ where: { product_id: id }, select: { size: true, quantity: true } });
      const current = new Map(rows.map((r) => [r.size, r.quantity]));
      for (const [size, { next, was }] of wanted) {
        if (next === was) continue; // not changed by this admin: leave whatever the stock is now
        const now = current.get(size);
        if ((now ?? 0) !== was) throw new StockConflict(`Stock for ${size || "this product"} changed from ${was} to ${now ?? 0} since you opened this page. Reload to see the latest numbers, then try again.`);
        await tx.productStock.upsert({ where: { product_id_size: { product_id: id, size } }, create: { product_id: id, size, quantity: next }, update: { quantity: next } });
        await tx.stockMovement.create({ data: { product_id: id, size, delta: next - (now ?? 0), quantity_after: next, reason: now === undefined ? "initial" : "adjustment", note, actor } });
      }
    });
    updateTag(CATALOGUE_TAG);
    refresh();
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    if (err instanceof StockConflict) {
      refresh();
      return { error: err.message };
    }
    console.error("[admin/inventory]", err);
    return { error: "Something went wrong. Please try again." };
  }
}
