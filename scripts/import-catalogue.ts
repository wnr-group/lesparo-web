/**
 * Imports data/live-catalogue.json (from crawl-live-catalogue.ts) into the local database.
 *
 * - Idempotent: categories and products are upserted by their PrestaShop legacy_id.
 * - Images are downloaded from lesparo.com into storage/media/ (already-downloaded files are kept).
 * - The live site's 4th-level "product line" categories (one product each) are folded into
 *   their parent; their URLs are redirected to the product instead.
 * - Writes data/legacy-redirects.json, consumed by next.config.ts.
 *
 *   npm run catalogue:import            (uses .env.local)
 *   npm run catalogue:import -- --skip-images
 */
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseLegacyDescription } from "../lib/catalogue/legacy-description";
import { DEFAULT_HOMEPAGE } from "../lib/validation/content";
import { slugify } from "../lib/validation/catalogue";
import { db } from "./db";

type LiveCategory = { legacyId: number; name: string; legacyUrl: string; parentLegacyId: number | null; depth: number; productLegacyIds: number[] };
type LiveProduct = {
  legacyId: number;
  name: string;
  slug: string;
  legacyUrl: string;
  reference: string;
  descriptionHtml: string;
  features: { name: string; value: string }[];
  images: { url: string; position: number; cover: boolean; legend: string }[];
};
type Snapshot = { categories: LiveCategory[]; deadCategories: { legacyUrl: string }[]; products: LiveProduct[] };

/** Category depth kept as real categories; deeper live categories are per-product lines. */
const MAX_CATEGORY_DEPTH = 3;
/** Products shown under "New Arrivals" on the live homepage, in order. */
const LIVE_HOMEPAGE_PRODUCTS = [28, 34, 36, 38, 39, 40, 41, 42, 43, 35];

const MEDIA_DIR = path.resolve(process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage"), "media");
const skipImages = process.argv.includes("--skip-images");

function displayName(raw: string): string {
  const name = raw
    .replace(/\s+/g, " ")
    .replace(/3\/4\s*th/gi, "3/4th")
    .trim();
  // The live catalogue mixes ALL CAPS and Title Case; normalise ALL CAPS words only.
  return name.replace(/\b[A-Z][A-Z']+\b/g, (w) => (w.length <= 2 ? w : w.charAt(0) + w.slice(1).toLowerCase()));
}

function pathOf(u: string) {
  return new URL(u).pathname;
}

async function download(url: string, storagePath: string): Promise<boolean> {
  const file = path.join(MEDIA_DIR, storagePath);
  if (await access(file).then(() => true, () => false)) return true;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  image ${url}: ${res.status}`);
    return false;
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function main() {
  const snap: Snapshot = JSON.parse(await readFile(path.join(process.cwd(), "data", "live-catalogue.json"), "utf8"));
  const byLegacy = new Map(snap.categories.map((c) => [c.legacyId, c]));
  const kept = snap.categories.filter((c) => c.depth <= MAX_CATEGORY_DEPTH);

  // Products listed anywhere in a kept category's subtree.
  const subtreeProducts = (cat: LiveCategory): Set<number> => {
    const ids = new Set(cat.productLegacyIds);
    for (const child of snap.categories.filter((c) => c.parentLegacyId === cat.legacyId)) subtreeProducts(child).forEach((id) => ids.add(id));
    return ids;
  };

  // ---- categories -------------------------------------------------------------------
  const usedSlugs = new Set<string>();
  const categoryIds = new Map<number, string>();
  for (const cat of kept.sort((a, b) => a.depth - b.depth)) {
    // Third-level names repeat across parents (Gents/Shorts, Kids/Shorts): qualify them
    // with the parent unless the name already does (Printed Lungi, Kavi Dhothy).
    let slug = slugify(displayName(cat.name));
    if (cat.depth === MAX_CATEGORY_DEPTH && cat.parentLegacyId) {
      const parentSlug = slugify(byLegacy.get(cat.parentLegacyId)!.name);
      if (!slug.includes(parentSlug)) slug = `${parentSlug}-${slug}`;
    }
    if (usedSlugs.has(slug)) throw new Error(`duplicate category slug ${slug}`);
    usedSlugs.add(slug);
    const productCount = subtreeProducts(cat).size;
    const data = {
      legacy_url: cat.legacyUrl,
      name: displayName(cat.name),
      slug,
      parent_id: cat.parentLegacyId ? (categoryIds.get(cat.parentLegacyId) ?? null) : null,
      display_order: snap.categories.indexOf(cat),
      is_published: productCount > 0,
      is_featured: cat.depth === 2,
    };
    const row = await db.category.upsert({ where: { legacy_id: cat.legacyId }, create: { legacy_id: cat.legacyId, ...data }, update: data, select: { id: true } });
    categoryIds.set(cat.legacyId, row.id);
  }
  console.log(`categories: ${categoryIds.size} upserted`);

  // Deepest kept category that lists each product.
  const productCategory = new Map<number, number>();
  for (const cat of kept.sort((a, b) => a.depth - b.depth)) {
    for (const pid of subtreeProducts(cat)) productCategory.set(pid, cat.legacyId);
  }

  // ---- products ----------------------------------------------------------------------
  const productSlugs = new Map<number, string>();
  for (const p of snap.products) {
    const parsed = parseLegacyDescription(p.descriptionHtml);
    const fabric = p.features.find((f) => f.name === "Fabric")?.value ?? null;
    const specs = [
      ...p.features.filter((f) => f.name !== "Fabric").map((f) => ({ label: f.name, value: f.value })),
      ...parsed.specs.filter((s) => s.label !== "Packing"),
      ...parsed.features.map((f) => ({ label: "Feature", value: f })),
    ];
    const slug = slugify(p.slug) || slugify(p.name);
    const catLegacy = productCategory.get(p.legacyId);
    const data = {
      legacy_url: p.legacyUrl,
      name: displayName(p.name),
      slug,
      sku: p.reference || null,
      category_id: catLegacy ? (categoryIds.get(catLegacy) ?? null) : null,
      description: null,
      fabric,
      specs,
      sizes: parsed.sizes,
      packing: parsed.packing,
      quote_enabled: true,
      retail_enabled: false,
      is_published: true,
      is_featured: LIVE_HOMEPAGE_PRODUCTS.includes(p.legacyId),
    };
    const row = await db.product.upsert({ where: { legacy_id: p.legacyId }, create: { legacy_id: p.legacyId, ...data }, update: data, select: { id: true } });
    productSlugs.set(p.legacyId, slug);

    if (!skipImages) {
      await db.productImage.deleteMany({ where: { product_id: row.id } });
      const images = [...p.images].sort((a, b) => a.position - b.position);
      for (const [i, img] of images.entries()) {
        const storagePath = `products/${slug}/${String(i + 1).padStart(2, "0")}.jpg`;
        if (!(await download(img.url, storagePath))) continue;
        await db.productImage.create({
          data: {
            product_id: row.id,
            storage_path: storagePath,
            alt_text: `${displayName(p.name)}${images.length > 1 ? ` — view ${i + 1}` : ""}`,
            width: 513,
            height: 655,
            display_order: i,
            is_primary: i === 0,
          },
        });
      }
    }
    console.log(`product ${p.legacyId} ${p.name} -> /products/${slug}`);
  }

  // ---- category covers: first image of the first product in the subtree --------------
  for (const cat of kept) {
    const first = [...subtreeProducts(cat)].map((id) => productSlugs.get(id)).find(Boolean);
    if (!first) continue;
    await db.category.updateMany({ where: { legacy_id: cat.legacyId, cover_image_path: null }, data: { cover_image_path: `products/${first}/01.jpg` } });
  }

  // ---- homepage content (only created if missing; admins own it afterwards) -----------
  const topLevel = kept.filter((c) => c.depth === 2).map((c) => slugify(c.name));
  await db.siteContent.upsert({
    where: { key: "homepage" },
    create: {
      key: "homepage",
      data: {
        ...DEFAULT_HOMEPAGE,
        featuredCategorySlugs: [...new Set(topLevel)].slice(0, 8),
        featuredProductSlugs: LIVE_HOMEPAGE_PRODUCTS.map((id) => productSlugs.get(id)).filter((s): s is string => !!s),
      },
    },
    update: {},
  });

  // ---- redirects ----------------------------------------------------------------------
  const redirects: { source: string; destination: string }[] = [];
  const categorySlug = async (legacyId: number) => (await db.category.findUniqueOrThrow({ where: { legacy_id: legacyId }, select: { slug: true } })).slug;

  for (const cat of snap.categories) {
    let destination: string;
    if (cat.depth <= MAX_CATEGORY_DEPTH) {
      destination = `/collections/${await categorySlug(cat.legacyId)}`;
    } else {
      const products = [...subtreeProducts(cat)];
      let ancestor = cat;
      while (ancestor.depth > MAX_CATEGORY_DEPTH) ancestor = byLegacy.get(ancestor.parentLegacyId!)!;
      destination = products.length === 1 ? `/products/${productSlugs.get(products[0])}` : `/collections/${await categorySlug(ancestor.legacyId)}`;
    }
    redirects.push({ source: pathOf(cat.legacyUrl), destination });
  }
  for (const p of snap.products) redirects.push({ source: pathOf(p.legacyUrl), destination: `/products/${productSlugs.get(p.legacyId)}` });
  for (const dead of snap.deadCategories) redirects.push({ source: pathOf(dead.legacyUrl), destination: "/shop" });

  const unique = [...new Map(redirects.map((r) => [r.source, r])).values()];
  await writeFile(path.join(process.cwd(), "data", "legacy-redirects.json"), JSON.stringify(unique, null, 2) + "\n");
  console.log(`redirects: ${unique.length} written to data/legacy-redirects.json`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
