/**
 * Imports data/live-catalogue.json (from crawl-live-catalogue.ts) into Supabase.
 *
 * - Idempotent: categories and products are upserted by their PrestaShop legacy_id.
 * - Images are copied from lesparo.com into the `product-media` bucket.
 * - The live site's 4th-level "product line" categories (one product each) are folded into
 *   their parent; their URLs are redirected to the product instead.
 * - Writes data/legacy-redirects.json, consumed by next.config.ts.
 *
 *   npm run catalogue:import            (uses .env.local)
 *   npm run catalogue:import -- --skip-images
 */
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseLegacyDescription } from "../lib/catalogue/legacy-description";
import { DEFAULT_HOMEPAGE } from "../lib/validation/content";
import { slugify } from "../lib/validation/catalogue";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
const db = createClient(url, key, { auth: { persistSession: false } });
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

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function mustRow<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<NonNullable<T>> {
  const data = await must(p, what);
  if (data === null || data === undefined) throw new Error(`${what}: no row returned`);
  return data;
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
    const row = await mustRow(
      db
        .from("categories")
        .upsert(
          {
            legacy_id: cat.legacyId,
            legacy_url: cat.legacyUrl,
            name: displayName(cat.name),
            slug,
            parent_id: cat.parentLegacyId ? (categoryIds.get(cat.parentLegacyId) ?? null) : null,
            display_order: snap.categories.indexOf(cat),
            is_published: productCount > 0,
            is_featured: cat.depth === 2,
          },
          { onConflict: "legacy_id" },
        )
        .select("id")
        .single(),
      `category ${cat.name}`,
    );
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
    const row = await mustRow(
      db
        .from("products")
        .upsert(
          {
            legacy_id: p.legacyId,
            legacy_url: p.legacyUrl,
            name: displayName(p.name),
            slug,
            sku: p.reference || null,
            category_id: catLegacy ? categoryIds.get(catLegacy) : null,
            description: null,
            fabric,
            specs,
            sizes: parsed.sizes,
            packing: parsed.packing,
            quote_enabled: true,
            retail_enabled: false,
            is_published: true,
            is_featured: LIVE_HOMEPAGE_PRODUCTS.includes(p.legacyId),
          },
          { onConflict: "legacy_id" },
        )
        .select("id")
        .single(),
      `product ${p.name}`,
    );
    productSlugs.set(p.legacyId, slug);

    if (!skipImages) {
      await must(db.from("product_images").delete().eq("product_id", row.id), "clear images");
      const images = [...p.images].sort((a, b) => a.position - b.position);
      for (const [i, img] of images.entries()) {
        const res = await fetch(img.url);
        if (!res.ok) {
          console.warn(`  image ${img.url}: ${res.status}`);
          continue;
        }
        const storagePath = `products/${slug}/${String(i + 1).padStart(2, "0")}.jpg`;
        await must(
          db.storage.from("product-media").upload(storagePath, Buffer.from(await res.arrayBuffer()), { contentType: "image/jpeg", upsert: true }),
          `upload ${storagePath}`,
        );
        await must(
          db.from("product_images").insert({
            product_id: row.id,
            storage_path: storagePath,
            alt_text: `${displayName(p.name)}${images.length > 1 ? ` — view ${i + 1}` : ""}`,
            width: 513,
            height: 655,
            display_order: i,
            is_primary: i === 0,
          }),
          "insert image",
        );
      }
    }
    console.log(`product ${p.legacyId} ${p.name} -> /products/${slug}`);
  }

  // ---- category covers: first image of the first product in the subtree --------------
  for (const cat of kept) {
    const first = [...subtreeProducts(cat)].map((id) => productSlugs.get(id)).find(Boolean);
    if (!first) continue;
    await must(
      db.from("categories").update({ cover_image_path: `products/${first}/01.jpg` }).eq("legacy_id", cat.legacyId).is("cover_image_path", null),
      "cover",
    );
  }

  // ---- homepage content (only created if missing; admins own it afterwards) -----------
  const topLevel = kept.filter((c) => c.depth === 2).map((c) => slugify(c.name));
  await must(
    db.from("site_content").upsert(
      {
        key: "homepage",
        data: {
          ...DEFAULT_HOMEPAGE,
          featuredCategorySlugs: [...new Set(topLevel)].slice(0, 8),
          featuredProductSlugs: LIVE_HOMEPAGE_PRODUCTS.map((id) => productSlugs.get(id)).filter(Boolean),
        },
      },
      { onConflict: "key", ignoreDuplicates: true },
    ),
    "homepage content",
  );

  // ---- redirects ----------------------------------------------------------------------
  const redirects: { source: string; destination: string }[] = [];
  const categorySlug = async (legacyId: number) =>
    (await mustRow(db.from("categories").select("slug").eq("legacy_id", legacyId).single(), "slug")).slug;

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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
