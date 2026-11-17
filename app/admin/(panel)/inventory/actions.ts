"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { AuthorizationError, requireAdmin } from "@/lib/auth/staff";
import { CATALOGUE_TAG, jsonStrings } from "@/lib/catalogue/queries";
import { prisma } from "@/lib/db";
import { sizeKey } from "@/lib/inventory/stock";

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const qty = z.coerce.number().int("Whole numbers only.").min(0, "Cannot be negative.").max(1_000_000, "Too large.");

/**
 * Saves a product's inventory settings and per-size counts. Every changed count is written to the movement log with who changed it.
 * Sizes come from the product itself, never from the form, so a crafted post cannot invent sizes.
 */
export async function saveStock(productId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await requireAdmin();
    const id = z.uuid().parse(productId);
    const product = await prisma.product.findUnique({ where: { id }, select: { sizes: true, stock: { select: { size: true, quantity: true } } } });
    if (!product) return { error: "Product not found." };

    const track = fd.get("track") === "on";
    const threshold = qty.safeParse(fd.get("threshold"));
    if (!threshold.success) return { error: "Please check the highlighted fields.", fields: { threshold: threshold.error.issues[0].message } };

    const sizes = jsonStrings(product.sizes);
    const keys = sizes.length ? sizes : [""];
    const next = new Map<string, number>();
    const fields: Record<string, string> = {};
    for (const k of keys) {
      const parsed = qty.safeParse(fd.get(`qty:${k}`) || 0);
      if (!parsed.success) fields[`qty:${k}`] = parsed.error.issues[0].message;
      else next.set(k, parsed.data);
    }
    if (Object.keys(fields).length) return { error: "Please check the highlighted fields.", fields };

    const note = String(fd.get("note") ?? "").trim().slice(0, 200) || null;
    const actor = session.email ?? session.userId;
    const before = new Map(product.stock.map((r) => [r.size, r.quantity]));

    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { track_inventory: track, low_stock_threshold: threshold.data } });
      for (const [size, quantity] of next) {
        const prev = before.get(sizeKey(size));
        if (prev === quantity) continue;
        await tx.productStock.upsert({ where: { product_id_size: { product_id: id, size } }, create: { product_id: id, size, quantity }, update: { quantity } });
        await tx.stockMovement.create({ data: { product_id: id, size, delta: quantity - (prev ?? 0), quantity_after: quantity, reason: prev === undefined ? "initial" : "adjustment", note, actor } });
      }
    });
    updateTag(CATALOGUE_TAG);
    refresh();
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    console.error("[admin/inventory]", err);
    return { error: "Something went wrong. Please try again." };
  }
}
