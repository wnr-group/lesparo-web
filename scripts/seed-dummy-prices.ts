/**
 * Puts DUMMY retail prices on every product that has none, so the retail (B2C) buy flow can be
 * tried before real prices exist. Products keep wholesale enquiries on. Real prices are edited
 * in the admin panel (Admin > Pricing); this never overwrites a price that is already set.
 *
 *   npm run prices:dummy
 */
import { db } from "./db";

/** Dummy INR price bands by category slug. A product's slug picks a stable step inside its band. */
const BANDS: Record<string, [number, number]> = {
  "gents-shorts": [349, 549],
  "gents-tracks": [499, 799],
  "gents-3-4th": [399, 599],
  "kids-shorts": [249, 399],
  "kids-tracks": [349, 549],
  "kids-3-4th": [279, 449],
  "checked-lungi": [299, 499],
  "printed-lungi": [279, 449],
  "kavi-dhothy": [349, 699],
  towels: [149, 349],
  kerchief: [49, 129],
};

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

async function main() {
  const products = await db.product.findMany({ where: { price: null }, select: { id: true, slug: true, category: { select: { slug: true } } } });
  let n = 0;
  for (const p of products) {
    const [lo, hi] = BANDS[p.category?.slug ?? ""] ?? [199, 499];
    // Steps of 10 rupees, ending in 9 (349, 359 ...) like a shelf price.
    const steps = Math.floor((hi - lo) / 10);
    const price = lo + (hash(p.slug) % (steps + 1)) * 10;
    await db.product.update({ where: { id: p.id }, data: { price, currency: "INR", retail_enabled: true } });
    n++;
  }
  console.log(`Set dummy prices on ${n} product(s); ${products.length ? "" : "none needed."}`);
}

main().finally(() => db.$disconnect());
