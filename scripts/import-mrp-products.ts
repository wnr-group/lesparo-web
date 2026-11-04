/**
 * LOCAL-ONLY: replaces the catalogue in the LOCAL database with the client's MRP price list (data/mrp-products.json, parsed
 * from MRP.xlsx) and attaches photos from the client's Drive folders (downloaded and unzipped; pass every extracted copy).
 * Images are copied to public/local-products and referenced by a "/local-products/..." path, so nothing is uploaded to Supabase.
 * Refuses to run unless DATABASE_URL points at localhost.
 *
 *   tsx scripts/import-mrp-products.ts "<folder>" ["<folder 2>" ...] [--dry-run] [--max-images=8] [--publish-all]
 *
 * Products without a matching photo folder are created as drafts (add photos in the admin, then publish) unless --publish-all.
 * Description, fabric and packing are placeholders, edited later in the admin panel.
 */
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { slugify } from "../lib/validation/catalogue";
import { db } from "./db";

const args = process.argv.slice(2);
const sources = args.filter((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const publishAll = args.includes("--publish-all");
const maxImages = Number(args.find((a) => a.startsWith("--max-images="))?.split("=")[1] ?? 8);
if (!sources.length) throw new Error("Usage: tsx scripts/import-mrp-products.ts <folder>... [--dry-run] [--max-images=8] [--publish-all]");

const host = new URL(process.env.DATABASE_URL ?? "postgresql://none").hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) throw new Error(`Refusing to run: DATABASE_URL host is "${host}", not localhost.`);

type Row = { section: string; sno: number; name: string; size: string; mrp: number };
const rows: Row[] = JSON.parse(readFileSync(path.join(process.cwd(), "data", "mrp-products.json"), "utf8").replace(/^﻿/, ""));

// ---------------------------------------------------------------- name matching ----------------------------------------------
type Sig = { audience: "KIDS" | "BOYS" | "WOMENS" | "GENTS"; types: Set<string>; core: string; mods: string };
const STOP = new Set(["GENTS", "KIDS", "BOYS", "WOMENS", "FIT", "DON", "WITH", "WITHOUT", "OUT", "RIB", "AND", "W", "O", "P", "WO", "WOP", "WP", "PLAIN", "PRINTED", "PRINT", "SET", "OVER", "SIZE", "NECK", "V", "BLACK", "CO", "ORD"]);
const TYPES = new Set(["SHORTS", "TRACK", "JOGGER", "34TH", "TSHIRT", "HOODIES"]);
const MODS = new Set(["SLEEVELESS", "HALFSLEEVE", "FULLSLEEVE", "ZIP"]);

function signature(raw: string, sectionType?: string[], sectionAudience?: Sig["audience"]): Sig {
  let s = raw.toUpperCase();
  s = s
    .replace(/WITH\s*OUT\s*ZIP|W\.?\s*OUT\s*ZIP/g, " ")
    .replace(/WITH\s*ZIP/g, " ZIP ")
    .replace(/\bS\/LESS\b|\bS\/L\b|SLEEVE\s*LESS|SLEVE\s*LESS|SLEEVELESS/g, " SLEEVELESS ")
    .replace(/\bH\/S\b/g, " HALFSLEEVE ")
    .replace(/\bF\/S\b/g, " FULLSLEEVE ")
    .replace(/3\/4\s*TH|3\/4|34\s*TH/g, " 34TH ")
    .replace(/T\s*[.\-]?\s*SHIRTS?|TEE\s*SHIRTS?|\bTEES\b/g, " TSHIRT ")
    .replace(/G\.O\.A\.T/g, " GOAT ")
    .replace(/IRON\s*CUT/g, " IRONCUT ")
    .replace(/NEW\s*(YORK|YARK)/g, " NEWYORK ")
    .replace(/AIR\s*FORCE/g, " AIRFORCE ")
    .replace(/[^A-Z0-9]+/g, " ");
  const map: Record<string, string> = {
    GENS: "GENTS", MENS: "GENTS", MEN: "GENTS", GENST: "GENTS", GENSTS: "GENTS", HODDIES: "HOODIES", PRIEM: "PRIME", JERSEY: "JERSY",
    MILLIONAIRE: "MILLIONARE", MILLINARE: "MILLIONARE", HARLEY: "HARLY", VIIBRENT: "VIBRANT", ELEGENT: "ELEGANT", CASECADE: "CASCADE",
    SORTS: "SHORTS", TRACKS: "TRACK", HERMONIE: "HARMONY", HARMANOY: "HARMONY", VALCANO: "VOLCANO", BOXER: "SHORTS", ZIPPER: "ZIP", WOMEN: "WOMENS",
  };
  const tokens = s.split(" ").filter(Boolean).map((t) => map[t] ?? t);
  const audience = sectionAudience ?? (tokens.includes("KIDS") ? "KIDS" : tokens.includes("BOYS") ? "BOYS" : tokens.includes("WOMENS") ? "WOMENS" : "GENTS");
  const types = new Set(tokens.filter((t) => TYPES.has(t)));
  if (!types.size && sectionType) sectionType.forEach((t) => types.add(t));
  const mods = tokens.filter((t) => MODS.has(t)).sort().join(",");
  const core = tokens.filter((t) => !STOP.has(t) && !TYPES.has(t) && !MODS.has(t)).sort().join(" ");
  return { audience, types, core, mods };
}

function sectionAudience(section: string): Sig["audience"] | undefined {
  const s = section.toUpperCase().trim();
  return s.startsWith("KIDS") ? "KIDS" : s.startsWith("BOYS") ? "BOYS" : s.startsWith("WOMENS") ? "WOMENS" : s.startsWith("MENS") || s.startsWith("GENS") ? "GENTS" : undefined;
}

/** Price-list rows whose photo folders cannot be found by name alone (checked by hand), keyed by serial number. */
const OVERRIDES: Record<number, string[]> = {
  99: ["LOOM DON SHORTS", "ARROW GENTS SHORTS"],
  163: ["TITANIUM WITH PRINT"],
};

function sectionTypes(section: string): string[] {
  const s = section.toUpperCase();
  if (s.includes("3/4")) return ["34TH"];
  if (s.includes("TRACK")) return ["TRACK", "JOGGER"];
  if (s.includes("SHORTS")) return ["SHORTS"];
  if (s.includes("SHIRT")) return ["TSHIRT"];
  if (s.includes("HOODIES")) return ["HOODIES"];
  return [];
}

// ---------------------------------------------------------------- Drive folders -----------------------------------------------
const IMAGE = /\.(jpe?g|png|webp)$/i;
const SKIP = new Set(["CLIENT", "CAMON PHOTOS", "09.12.2025 NEW", "FUSION T-SHIRT - COPY"]);
const CONTAINERS = new Set(["NEW ITEMS 22.05.2025", "LASPERO 24-04-25"]);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : IMAGE.test(e.name) ? [path.join(dir, e.name)] : []));
}

type Folder = { name: string; sig: Sig; buckets: string[][] };
const folders = new Map<string, Folder>();
function addFolder(name: string, dir: string) {
  const buckets: string[][] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const own = entries.filter((e) => e.isFile() && IMAGE.test(e.name)).map((e) => path.join(dir, e.name));
  if (own.length) buckets.push(own.sort());
  for (const e of entries.filter((d) => d.isDirectory()).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
    const f = walk(path.join(dir, e.name)).sort();
    if (f.length) buckets.push(f);
  }
  if (!buckets.length) return;
  const key = name.toUpperCase().replace(/\s+/g, " ").trim();
  const existing = folders.get(key);
  if (existing) existing.buckets.push(...buckets);
  else folders.set(key, { name, sig: signature(name), buckets });
}

for (const src of sources) {
  const top = readdirSync(src, { withFileTypes: true }).filter((d) => d.isDirectory());
  const root = top.length === 1 ? path.join(src, top[0].name) : src;
  for (const e of readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const up = e.name.toUpperCase();
    if (SKIP.has(up)) continue;
    const dir = path.join(root, e.name);
    if (CONTAINERS.has(up)) {
      for (const sub of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && !/^\d+$/.test(d.name))) addFolder(sub.name, path.join(dir, sub.name));
    } else addFolder(e.name, dir);
  }
}

/** Folders whose name matches a price-list row: same audience, same core name, compatible garment type and modifiers. */
function matchFolders(row: Row): Folder[] {
  if (OVERRIDES[row.sno]) return OVERRIDES[row.sno].map((n) => folders.get(n.toUpperCase())).filter((f): f is Folder => !!f);
  const sig = signature(row.name, sectionTypes(row.section), sectionAudience(row.section));
  const hit = [...folders.values()].filter((f) => f.sig.audience === sig.audience && f.sig.core === sig.core && f.sig.mods === sig.mods);
  const strong = hit.filter((f) => f.sig.types.size && [...f.sig.types].some((t) => sig.types.has(t)));
  if (strong.length) return strong;
  // A folder with no garment word in its name (e.g. "LOOM KIDS", "MILLIONARE") is a weaker match.
  return hit.filter((f) => !f.sig.types.size && (!sig.types.size || sig.types.size > 0));
}

// ---------------------------------------------------------------- product fields ----------------------------------------------
function displayName(raw: string): string {
  const s = raw
    .replace(/\s+/g, " ")
    .replace(/\(W\.?\s*P\s*\/\s*WO\.?\s*P\)|\(WO?\.?P\/W\.?O?\.?P\)/gi, "(With/Without Print)")
    .replace(/\(W\.?\s*PRINT\)/gi, "(With Print)")
    .replace(/\(WO\.?\s*PRINT\)/gi, "(Without Print)")
    .replace(/\(?\bW\.O\.P\b\)?/gi, "Without Print")
    .replace(/\(?\bW\.P\b\)?/gi, "With Print")
    .replace(/\(?\bWO\.P\b\)?/gi, "Without Print")
    .replace(/W\.RIB & W\.OUT RIB/gi, "With & Without Rib")
    .replace(/WITH & WITH OUT RIB/gi, "With & Without Rib")
    .replace(/\bS\/LESS\b|\bS\/L\b/gi, "Sleeveless")
    .replace(/\bH\/S\b/gi, "Half Sleeve")
    .replace(/\bF\/S\b/gi, "Full Sleeve")
    .replace(/\bGENS\b/gi, "Gents")
    .replace(/\bSORTS\b/gi, "Shorts")
    .replace(/T\s*[.\-]\s*SHIRT/gi, "T-Shirt")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
  return s
    .split(" ")
    .map((w) => (/^[A-Z]+\d+$|^\d/.test(w) ? w : w === "&" || w === "/" || w === "-" ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ")
    .replace(/\b3\/4th\b/gi, "3/4th")
    .replace(/\bT-shirt\b/g, "T-Shirt")
    .replace(/\bG\.o\.a\.t\b/g, "G.O.A.T")
    .replace(/\(([a-z])/g, (_, c) => "(" + c.toUpperCase());
}

function sizesOf(size: string, name: string): string[] {
  const list = size.split(/[\s,]+/).filter(Boolean);
  // Typos in the sheet: a "23" or "31" at the start of a kids/boys ladder is 22 / 30.
  return list.map((v, i) => (i === 0 && v === "23" ? "22" : i === 0 && v === "31" ? "30" : v === "XXL" ? "2XL" : v)).filter((v, i, a) => a.indexOf(v) === i);
}

/** Category path (audience, child) from the price-list section. */
function categoryFor(row: Row): { parent: string | null; child: string | null; top?: string } {
  const s = row.section.toUpperCase().replace(/\s+/g, " ");
  if (s.startsWith("HOODIES")) return { parent: null, child: null, top: "Hoodies" };
  if (s.startsWith("NEW STYLES")) return { parent: null, child: null, top: "New Styles" };
  const parent = s.startsWith("KIDS") ? "Kids" : s.startsWith("BOYS") ? "Boys" : s.startsWith("WOMENS") ? "Women" : "Gents";
  const child = s.includes("3/4") ? "3/4th" : s.includes("TRACK") ? "Tracks" : s.includes("SHORTS") ? "Shorts" : "T-Shirt";
  return { parent, child };
}

function pickImages(buckets: string[][]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = 0; out.length < maxImages && buckets.some((b) => i < b.length); i++) {
    for (const b of buckets) {
      if (out.length >= maxImages || i >= b.length) continue;
      const hash = createHash("sha1").update(readFileSync(b[i])).digest("hex");
      if (seen.has(hash)) continue;
      seen.add(hash);
      out.push(b[i]);
    }
  }
  return out;
}

async function main() {
  const matched = rows.map((r) => ({ row: r, folders: matchFolders(r) }));
  const used = new Set(matched.flatMap((m) => m.folders.map((f) => f.name)));
  const withImages = matched.filter((m) => m.folders.length).length;
  console.log(`${rows.length} products in the price list; ${withImages} matched to photo folders, ${rows.length - withImages} without photos`);
  if (dryRun) {
    for (const m of matched) console.log(`${String(m.row.sno).padStart(3)} ${m.row.section.trim().padEnd(20)} ${m.row.name.padEnd(46)} -> ${m.folders.map((f) => f.name).join(" + ") || "(no photos)"}`);
    console.log(`\nPhoto folders not used by any product: ${[...folders.values()].filter((f) => !used.has(f.name)).map((f) => f.name).join(", ")}`);
    return;
  }

  // ---- categories: keep what exists, add Boys / Women / Hoodies / New Styles and missing leaves ----
  const cats = await db.category.findMany();
  let order = Math.max(0, ...cats.map((c) => c.display_order)) + 1;
  const ensure = async (name: string, parentId: string | null, parentSlug?: string) => {
    const found = cats.find((c) => c.name.toLowerCase() === name.toLowerCase() && c.parent_id === parentId);
    if (found) return found;
    let slug = slugify(name);
    if (parentSlug && !slug.includes(parentSlug)) slug = `${parentSlug}-${slug}`;
    const row = await db.category.create({ data: { name, slug, parent_id: parentId, display_order: order++, is_published: false, is_featured: !parentSlug } });
    cats.push(row);
    return row;
  };
  const garments = cats.find((c) => c.name === "Garments" && !c.parent_id);
  if (!garments) throw new Error("Garments category missing; run the catalogue import first.");
  const catId = async (row: Row) => {
    const { parent, child, top } = categoryFor(row);
    if (top) return (await ensure(top, garments.id)).id;
    const p = await ensure(parent!, garments.id);
    return (await ensure(child!, p.id, p.slug)).id;
  };

  const outRoot = path.join(process.cwd(), "public", "local-products");
  rmSync(outRoot, { recursive: true, force: true });
  await db.productImage.deleteMany();
  await db.product.deleteMany();
  await db.category.updateMany({ data: { cover_image_path: null } });

  const slugs = new Map<string, number>();
  let n = 0;
  let published = 0;
  for (const m of matched) {
    const { row } = m;
    let name = displayName(row.name);
    let slug = slugify(name);
    const seen = (slugs.get(slug) ?? 0) + 1;
    slugs.set(slug, seen);
    if (seen > 1) {
      name = `${name} (${seen})`;
      slug = `${slug}-${seen}`;
    }
    const files = pickImages(m.folders.flatMap((f) => f.buckets));
    const isPublished = publishAll || files.length > 0;
    n++;
    if (isPublished) published++;
    const product = await db.product.create({
      data: {
        name,
        slug,
        sku: `LSP-${String(row.sno).padStart(3, "0")}`,
        category_id: await catId(row),
        description: "Product description to be added from the admin panel.",
        fabric: "To be updated",
        sizes: sizesOf(row.size, row.name),
        packing: "To be updated",
        specs: [],
        quote_enabled: true,
        retail_enabled: true,
        price: Math.round(row.mrp),
        currency: "INR",
        is_published: isPublished,
        is_featured: isPublished && published <= 10,
      },
    });
    if (files.length) mkdirSync(path.join(outRoot, slug), { recursive: true });
    for (const [i, f] of files.entries()) {
      const rel = `${slug}/${String(i + 1).padStart(2, "0")}${path.extname(f).toLowerCase().replace(".jpeg", ".jpg")}`;
      copyFileSync(f, path.join(outRoot, rel));
      await db.productImage.create({ data: { product_id: product.id, storage_path: `/local-products/${rel}`, alt_text: `${name}${files.length > 1 ? ` — view ${i + 1}` : ""}`, display_order: i, is_primary: i === 0 } });
    }
  }

  // Category covers and visibility: a category shows only if a published product sits in its subtree.
  const all = await db.category.findMany({ include: { products: { where: { is_published: true }, include: { images: { orderBy: { display_order: "asc" }, take: 1 } }, take: 1 } } });
  const subtree = (id: string): typeof all => all.filter((c) => c.id === id).concat(all.filter((c) => c.parent_id === id).flatMap((c) => subtree(c.id)));
  for (const c of all) {
    const withProducts = subtree(c.id).flatMap((s) => s.products);
    await db.category.update({ where: { id: c.id }, data: { is_published: withProducts.length > 0, cover_image_path: withProducts.find((p) => p.images[0])?.images[0]?.storage_path ?? null } });
  }
  console.log(`done: ${n} products (${published} published with photos, ${n - published} drafts without photos)`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
