"use server";

import { refresh, updateTag } from "next/cache";
import { AuthorizationError, requireAdmin } from "@/lib/auth/staff";
import { CATALOGUE_TAG } from "@/lib/catalogue/queries";
import { prisma } from "@/lib/db";

export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

/**
 * Saves the retail price and the two sales channels for every product row on the Pricing page.
 * Retail (B2C) needs a price; wholesale (B2B) is the "Enquire now" route and never shows a price.
 * Each product must keep at least one channel so buyers always have a way to order.
 */
export async function savePrices(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    const ids = fd.getAll("ids").filter((v): v is string => typeof v === "string");
    const fields: Record<string, string> = {};
    const updates: { id: string; price: number | null; retail: boolean; quote: boolean }[] = [];

    for (const id of ids) {
      const raw = String(fd.get(`price.${id}`) ?? "").trim().replace(/,/g, "");
      const retail = fd.get(`retail.${id}`) === "on";
      const quote = fd.get(`quote.${id}`) === "on";
      const price = raw === "" ? null : Number(raw);
      if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1e7)) fields[`price.${id}`] = "Enter a valid price.";
      else if (retail && (price === null || price <= 0)) fields[`price.${id}`] = "Retail needs a price.";
      else if (!retail && !quote) fields[`quote.${id}`] = "Keep at least one channel.";
      updates.push({ id, price: price === null ? null : Math.round(price * 100) / 100, retail, quote });
    }
    if (Object.keys(fields).length) return { error: `${Object.keys(fields).length} row(s) need attention (highlighted). Nothing was saved.`, fields };

    await prisma.$transaction(updates.map((u) => prisma.product.update({ where: { id: u.id }, data: { price: u.price, retail_enabled: u.retail, quote_enabled: u.quote } })));
    updateTag(CATALOGUE_TAG);
    refresh();
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    console.error("[admin/pricing]", err);
    return { error: "Something went wrong. Please try again." };
  }
}
