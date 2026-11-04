/**
 * Copies the catalogue from the LOCAL database (see scripts/import-mrp-products.ts) to PRODUCTION (DATABASE_URL + Supabase Storage).
 *
 *   npm run catalogue:publish -- --backup-dir "<folder>" --dry-run
 *   npm run catalogue:publish -- --backup-dir "<folder>" --confirm-production
 *
 * 1. Backs up the live products, images, categories and homepage content to a JSON file in --backup-dir.
 * 2. Uploads the local photos to the product-media bucket under catalogue-2026/<slug>/ (new paths, so nothing cached is overwritten).
 * 3. In ONE transaction: upserts the categories, deletes the old products (those referenced by an order or enquiry are archived and
 *    renamed instead, so order history stays intact), creates the new products and images, and points the homepage at them.
 * Nothing is written before the backup file exists.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";
import { publicMediaUrl, saveFile } from "../lib/storage";
import { db as prod } from "./db";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => args.find((a) => a.startsWith(`${n}=`))?.slice(n.length + 1) ?? (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const dryRun = flag("--dry-run");
const backupDir = opt("--backup-dir");
if (!backupDir) throw new Error("--backup-dir <folder> is required");
if (!dryRun && !flag("--confirm-production")) throw new Error("Refusing to write to production without --confirm-production (or use --dry-run).");

const localUrl = process.env.LOCAL_DATABASE_URL ?? "postgresql://postgres:lesparo@localhost:5433/lesparo";
if (!["localhost", "127.0.0.1"].includes(new URL(localUrl).hostname)) throw new Error("LOCAL_DATABASE_URL must be localhost");
const prodHost = new URL(process.env.DATABASE_URL ?? "postgresql://none").hostname;
if (["localhost", "127.0.0.1"].includes(prodHost)) throw new Error("DATABASE_URL points at localhost, not production. Run with --env-file=.env.local.");
const local = new PrismaClient({ adapter: new PrismaPg({ connectionString: localUrl, max: 3 }) });

const PREFIX = "catalogue-2026";
const toBucketPath = (p: string) => p.replace(/^\/local-products\//, `${PREFIX}/`);

async function pool<T>(items: T[], size: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function main() {
  console.log(`production host: ${prodHost.replace(/^[^.]+\./, "*.")}${dryRun ? "  (DRY RUN)" : ""}`);
  const [cats, products] = await Promise.all([
    local.category.findMany({ include: { parent: { select: { slug: true } } }, orderBy: { display_order: "asc" } }),
    local.product.findMany({ include: { images: { orderBy: { display_order: "asc" } }, category: { select: { slug: true } } }, orderBy: { sku: "asc" } }),
  ]);
  const imageCount = products.reduce((n, p) => n + p.images.length, 0);
  console.log(`local: ${cats.length} categories, ${products.length} products, ${imageCount} images`);

  // ---- 1. backup ------------------------------------------------------------------------------------
  const [oldProducts, oldImages, oldCats, homepage] = await Promise.all([prod.product.findMany(), prod.productImage.findMany(), prod.category.findMany(), prod.siteContent.findUnique({ where: { key: "homepage" } })]);
  mkdirSync(backupDir!, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(backupDir!, `prod-catalogue-before-${stamp}.json`);
  writeFileSync(file, JSON.stringify({ takenAt: new Date().toISOString(), products: oldProducts, product_images: oldImages, categories: oldCats, homepage }, null, 1));
  console.log(`backup: ${oldProducts.length} products, ${oldImages.length} images, ${oldCats.length} categories -> ${file}`);

  const referenced = new Set((await prod.product.findMany({ where: { OR: [{ enquiry_items: { some: {} } }, { order_items: { some: {} } }] }, select: { id: true } })).map((p) => p.id));
  console.log(`old products: ${oldProducts.length - referenced.size} to delete, ${referenced.size} to archive (referenced by orders/enquiries)`);
  if (dryRun) return;

  // ---- 2. images ------------------------------------------------------------------------------------
  const files = products.flatMap((p) => p.images.map((i) => i.storage_path));
  let done = 0;
  await pool(files, 6, async (sp) => {
    const dest = toBucketPath(sp);
    // Files already in the bucket are skipped, so a re-run resumes; a flaky network gets a few retries per file.
    for (let attempt = 1; ; attempt++) {
      try {
        const head = await fetch(publicMediaUrl(dest)!, { method: "HEAD" }).catch(() => null);
        if (!head?.ok) await saveFile("media", dest, new Uint8Array(readFileSync(path.join(process.cwd(), "public", sp))));
        break;
      } catch (err) {
        if (attempt >= 4) throw err;
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    if (++done % 50 === 0) console.log(`  uploaded ${done}/${files.length}`);
  });
  console.log(`images: ${files.length} in bucket under ${PREFIX}/`);

  // ---- 3. database swap, one transaction ---------------------------------------------------------------
  await prod.$transaction(
    async (tx) => {
      const idBySlug = new Map<string, string>();
      for (const c of cats) {
        const data = {
          name: c.name,
          description: c.description,
          display_order: c.display_order,
          is_published: c.is_published,
          is_featured: c.is_featured,
          cover_image_path: c.cover_image_path ? toBucketPath(c.cover_image_path) : null,
          parent_id: c.parent?.slug ? (idBySlug.get(c.parent.slug) ?? null) : null,
        };
        const row = await tx.category.upsert({ where: { slug: c.slug }, create: { slug: c.slug, ...data }, update: data, select: { id: true } });
        idBySlug.set(c.slug, row.id);
      }

      const now = new Date();
      for (const p of oldProducts.filter((p) => referenced.has(p.id))) {
        await tx.product.update({ where: { id: p.id }, data: { slug: `${p.slug}-archived`, sku: null, is_published: false, is_featured: false, archived_at: p.archived_at ?? now } });
      }
      await tx.product.deleteMany({ where: { id: { notIn: [...referenced] } } });

      const rows: Prisma.ProductCreateManyInput[] = [];
      const imageRows: Prisma.ProductImageCreateManyInput[] = [];
      for (const p of products) {
        const id = randomUUID();
        rows.push({
          id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          category_id: p.category?.slug ? (idBySlug.get(p.category.slug) ?? null) : null,
          description: p.description,
          specs: p.specs as Prisma.InputJsonValue,
          fabric: p.fabric,
          sizes: p.sizes as Prisma.InputJsonValue,
          packing: p.packing,
          quote_enabled: p.quote_enabled,
          retail_enabled: p.retail_enabled,
          price: p.price,
          currency: p.currency,
          is_published: p.is_published,
          is_featured: p.is_featured,
        });
        for (const i of p.images) imageRows.push({ product_id: id, storage_path: toBucketPath(i.storage_path), alt_text: i.alt_text, display_order: i.display_order, is_primary: i.is_primary });
      }
      await tx.product.createMany({ data: rows });
      await tx.productImage.createMany({ data: imageRows });

      // Homepage: point the featured lists at the new catalogue (everything else in the content is left as it was).
      const home = ((await tx.siteContent.findUnique({ where: { key: "homepage" } }))?.data ?? {}) as Record<string, unknown>;
      const featured = products.filter((p) => p.is_published && p.is_featured && p.images.length).slice(0, 10).map((p) => p.slug);
      const featuredCats = ["gents", "kids", "boys", "women", "hoodies", "new-styles"].filter((s) => idBySlug.has(s));
      await tx.siteContent.update({ where: { key: "homepage" }, data: { data: { ...home, featuredProductSlugs: featured, featuredCategorySlugs: featuredCats } as Prisma.InputJsonValue } });
    },
    { timeout: 180_000, maxWait: 30_000 },
  );
  const [pc, ic] = await Promise.all([prod.product.count({ where: { archived_at: null } }), prod.productImage.count()]);
  console.log(`done: production now has ${pc} active products and ${ic} image rows (backup: ${file})`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await local.$disconnect();
    await prod.$disconnect();
  });
