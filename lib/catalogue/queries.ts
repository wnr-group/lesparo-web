import "server-only";
import type { Prisma } from "@prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/db";
import { publicMediaUrl } from "@/lib/storage";
import { DEFAULT_HOMEPAGE, homepageSchema, type HomepageContent } from "@/lib/validation/content";
import type { Spec } from "./legacy-description";

/** Every catalogue read is tagged; admin mutations call updateTag(CATALOGUE_TAG). */
export const CATALOGUE_TAG = "catalogue";
export const CONTENT_TAG = "site-content";

function cacheCatalogue() {
  cacheLife("hours");
  cacheTag(CATALOGUE_TAG);
}

export const PAGE_SIZE = 24;
export const SORTS = { featured: "Featured", newest: "Newest", "name-asc": "Name, A–Z", "name-desc": "Name, Z–A" } as const;
export type SortKey = keyof typeof SORTS;

export type ProductImage = { url: string; alt: string; width: number | null; height: number | null };

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  fabric: string | null;
  sizes: string[];
  packing: string | null;
  quoteEnabled: boolean;
  retailEnabled: boolean;
  price: number | null;
  currency: string;
  category: { name: string; slug: string } | null;
  images: ProductImage[];
};

export type ProductDetail = ProductCard & {
  sku: string | null;
  description: string | null;
  specs: Spec[];
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  coverUrl: string | null;
  isFeatured: boolean;
  displayOrder: number;
};

export type CategoryNode = Category & { children: CategoryNode[] };

const CARD_INCLUDE = {
  category: { select: { name: true, slug: true } },
  images: { orderBy: { display_order: "asc" }, select: { storage_path: true, alt_text: true, width: true, height: true } },
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof CARD_INCLUDE }>;

/** Published and not archived. */
const VISIBLE = { is_published: true, archived_at: null } satisfies Prisma.ProductWhereInput;

/** Reads a Json column holding string[] (sizes). */
export function jsonStrings(v: Prisma.JsonValue): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function toCard(row: CardRow): ProductCard {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    fabric: row.fabric,
    sizes: jsonStrings(row.sizes),
    packing: row.packing,
    quoteEnabled: row.quote_enabled,
    retailEnabled: row.retail_enabled,
    price: row.price,
    currency: row.currency,
    category: row.category,
    images: row.images.map((i) => ({ url: publicMediaUrl(i.storage_path)!, alt: i.alt_text || row.name, width: i.width, height: i.height })),
  };
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheCatalogue();
  const rows = await prisma.category.findMany({ where: { is_published: true }, orderBy: { display_order: "asc" } });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    parentId: c.parent_id,
    coverUrl: publicMediaUrl(c.cover_image_path),
    isFeatured: c.is_featured,
    displayOrder: c.display_order,
  }));
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  "use cache";
  cacheCatalogue();
  const all = await getCategories();
  const build = (parentId: string | null): CategoryNode[] =>
    all.filter((c) => c.parentId === parentId).map((c) => ({ ...c, children: build(c.id) }));
  return build(null);
}

export async function getCategoryBySlug(slug: string) {
  "use cache";
  cacheCatalogue();
  const all = await getCategories();
  const category = all.find((c) => c.slug === slug);
  if (!category) return null;
  const trail: Category[] = [];
  for (let c: Category | undefined = category; c; c = all.find((p) => p.id === c!.parentId)) trail.unshift(c);
  const descendants = (id: string): string[] => [id, ...all.filter((c) => c.parentId === id).flatMap((c) => descendants(c.id))];
  return { category, trail, subtreeIds: descendants(category.id), children: all.filter((c) => c.parentId === category.id) };
}

/** Normalises free-text search input: strips punctuation, collapses spaces, caps length. */
export function sanitiseSearch(q: string): string {
  return q.replace(/[,()%*\\:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export type ProductQuery = {
  q?: string;
  categoryIds?: string[];
  fabric?: string;
  size?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
};

/** Every word must match the name, fabric or SKU (substring, case-insensitive for ASCII). */
export function searchWhere<T extends string>(q: string, fields: T[]) {
  return q
    .split(" ")
    .filter(Boolean)
    .map((w) => ({ OR: fields.map((f) => ({ [f]: { contains: w } }) as Record<T, { contains: string }>) }));
}

export async function listProducts(query: ProductQuery) {
  "use cache";
  cacheCatalogue();
  const pageSize = query.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, query.page ?? 1);
  const q = query.q ? sanitiseSearch(query.q) : "";

  let rows = await prisma.product.findMany({
    where: {
      ...VISIBLE,
      AND: q ? searchWhere(q, ["name", "fabric", "sku"]) : undefined,
      ...(query.categoryIds?.length && { category_id: { in: query.categoryIds } }),
      ...(query.fabric && { fabric: query.fabric }),
    },
    include: CARD_INCLUDE,
  });
  // Sizes are a JSON list: filter in memory (the catalogue is small).
  if (query.size) rows = rows.filter((r) => jsonStrings(r.sizes).includes(query.size!));

  const byId = (a: CardRow, b: CardRow) => a.id.localeCompare(b.id);
  const sorters: Record<SortKey, (a: CardRow, b: CardRow) => number> = {
    newest: (a, b) => b.created_at.getTime() - a.created_at.getTime() || byId(a, b),
    "name-asc": (a, b) => a.name.localeCompare(b.name) || byId(a, b),
    "name-desc": (a, b) => b.name.localeCompare(a.name) || byId(a, b),
    featured: (a, b) => Number(b.is_featured) - Number(a.is_featured) || (a.legacy_id ?? Infinity) - (b.legacy_id ?? Infinity) || byId(a, b),
  };
  rows.sort(sorters[query.sort ?? "featured"]);

  const total = rows.length;
  const from = (page - 1) * pageSize;
  return { products: rows.slice(from, from + pageSize).map(toCard), total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Distinct filter values among published products (optionally within categories). */
export async function getFacets(categoryIds?: string[]) {
  "use cache";
  cacheCatalogue();
  const data = await prisma.product.findMany({
    where: { ...VISIBLE, ...(categoryIds?.length && { category_id: { in: categoryIds } }) },
    select: { fabric: true, sizes: true },
  });
  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
  const fabrics = [...new Set(data.map((r) => r.fabric).filter((f): f is string => !!f))].sort();
  const sizes = [...new Set(data.flatMap((r) => jsonStrings(r.sizes)))].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, undefined, { numeric: true });
  });
  return { fabrics, sizes };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheCatalogue();
  const row = await prisma.product.findFirst({ where: { ...VISIBLE, slug }, include: CARD_INCLUDE });
  if (!row) return null;
  return {
    ...toCard(row),
    sku: row.sku,
    description: row.description,
    specs: (Array.isArray(row.specs) ? row.specs : []) as Spec[],
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    categoryId: row.category_id,
  };
}

export async function getRelatedProducts(categoryId: string | null, excludeId: string, limit = 4) {
  "use cache";
  cacheCatalogue();
  if (!categoryId) return [];
  const rows = await prisma.product.findMany({
    where: { ...VISIBLE, category_id: categoryId, id: { not: excludeId } },
    include: CARD_INCLUDE,
    orderBy: { legacy_id: "asc" },
    take: limit,
  });
  return rows.map(toCard);
}

export async function getProductsBySlugs(slugs: string[]) {
  "use cache";
  cacheCatalogue();
  if (!slugs.length) return [];
  const rows = await prisma.product.findMany({ where: { ...VISIBLE, slug: { in: slugs } }, include: CARD_INCLUDE });
  const cards = rows.map(toCard);
  return slugs.map((s) => cards.find((c) => c.slug === s)).filter((c): c is ProductCard => !!c);
}

/** Lightweight list used by the enquiry form's product picker. */
export async function getQuotableProducts() {
  "use cache";
  cacheCatalogue();
  const rows = await prisma.product.findMany({
    where: { ...VISIBLE, quote_enabled: true },
    select: { id: true, name: true, slug: true, category: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return rows.map((p) => ({ id: p.id, name: p.name, slug: p.slug, category: p.category?.name ?? null }));
}

export async function getHomepageContent(): Promise<HomepageContent> {
  "use cache";
  cacheLife("hours");
  cacheTag(CONTENT_TAG);
  const row = await prisma.siteContent.findUnique({ where: { key: "homepage" } });
  const parsed = homepageSchema.safeParse(row?.data);
  return parsed.success ? parsed.data : DEFAULT_HOMEPAGE;
}

export async function getAllPublishedSlugs() {
  "use cache";
  cacheCatalogue();
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: VISIBLE, select: { slug: true, updated_at: true } }),
    prisma.category.findMany({ where: { is_published: true }, select: { slug: true, updated_at: true } }),
  ]);
  const iso = (rows: { slug: string; updated_at: Date }[]) => rows.map((r) => ({ slug: r.slug, updated_at: r.updated_at.toISOString() }));
  return { products: iso(products), categories: iso(categories) };
}
