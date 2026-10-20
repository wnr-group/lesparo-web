import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient, publicMediaUrl } from "@/lib/supabase/server";
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

const CARD_COLUMNS =
  "id, name, slug, fabric, sizes, packing, quote_enabled, retail_enabled, price, currency, created_at, categories(name, slug), product_images(storage_path, alt_text, width, height, display_order)";

type CardRow = {
  id: string;
  name: string;
  slug: string;
  fabric: string | null;
  sizes: string[];
  packing: string | null;
  quote_enabled: boolean;
  retail_enabled: boolean;
  price: number | null;
  currency: string;
  categories: { name: string; slug: string } | null;
  product_images: { storage_path: string; alt_text: string; width: number | null; height: number | null; display_order: number }[];
};

function toCard(row: CardRow): ProductCard {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    fabric: row.fabric,
    sizes: row.sizes,
    packing: row.packing,
    quoteEnabled: row.quote_enabled,
    retailEnabled: row.retail_enabled,
    price: row.price,
    currency: row.currency,
    category: row.categories,
    images: [...row.product_images]
      .sort((a, b) => a.display_order - b.display_order)
      .map((i) => ({ url: publicMediaUrl(i.storage_path)!, alt: i.alt_text || row.name, width: i.width, height: i.height })),
  };
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheCatalogue();
  const { data, error } = await createPublicClient()
    .from("categories")
    .select("id, name, slug, description, parent_id, cover_image_path, is_featured, display_order")
    .eq("is_published", true)
    .order("display_order");
  if (error) throw error;
  return data.map((c) => ({
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

/** PostgREST `or()` filter values cannot contain these characters unescaped. */
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

export async function listProducts(query: ProductQuery) {
  "use cache";
  cacheCatalogue();
  const pageSize = query.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, query.page ?? 1);
  let req = createPublicClient().from("products").select(CARD_COLUMNS, { count: "exact" }).eq("is_published", true).is("archived_at", null);

  const q = query.q ? sanitiseSearch(query.q) : "";
  if (q) {
    const words = q.split(" ").filter(Boolean);
    // Every word must match the name, fabric or SKU (prefix-friendly, unlike full-text search).
    for (const w of words) req = req.or(`name.ilike.%${w}%,fabric.ilike.%${w}%,sku.ilike.%${w}%`);
  }
  if (query.categoryIds?.length) req = req.in("category_id", query.categoryIds);
  if (query.fabric) req = req.eq("fabric", query.fabric);
  if (query.size) req = req.contains("sizes", [query.size]);

  switch (query.sort ?? "featured") {
    case "newest":
      req = req.order("created_at", { ascending: false });
      break;
    case "name-asc":
      req = req.order("name");
      break;
    case "name-desc":
      req = req.order("name", { ascending: false });
      break;
    default:
      req = req.order("is_featured", { ascending: false }).order("legacy_id", { ascending: true, nullsFirst: false });
  }

  const from = (page - 1) * pageSize;
  const { data, count, error } = await req.order("id").range(from, from + pageSize - 1);
  if (error) throw error;
  const total = count ?? 0;
  return { products: (data as unknown as CardRow[]).map(toCard), total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Distinct filter values among published products (optionally within categories). */
export async function getFacets(categoryIds?: string[]) {
  "use cache";
  cacheCatalogue();
  let req = createPublicClient().from("products").select("fabric, sizes").eq("is_published", true).is("archived_at", null);
  if (categoryIds?.length) req = req.in("category_id", categoryIds);
  const { data, error } = await req;
  if (error) throw error;
  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
  const fabrics = [...new Set(data.map((r) => r.fabric).filter((f): f is string => !!f))].sort();
  const sizes = [...new Set(data.flatMap((r) => r.sizes))].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, undefined, { numeric: true });
  });
  return { fabrics, sizes };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheCatalogue();
  const { data, error } = await createPublicClient()
    .from("products")
    .select(`${CARD_COLUMNS}, sku, description, specs, seo_title, seo_description, category_id`)
    .eq("slug", slug)
    .eq("is_published", true)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as CardRow & {
    sku: string | null;
    description: string | null;
    specs: Spec[];
    seo_title: string | null;
    seo_description: string | null;
    category_id: string | null;
  };
  return {
    ...toCard(row),
    sku: row.sku,
    description: row.description,
    specs: row.specs,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    categoryId: row.category_id,
  };
}

export async function getRelatedProducts(categoryId: string | null, excludeId: string, limit = 4) {
  "use cache";
  cacheCatalogue();
  if (!categoryId) return [];
  const { data, error } = await createPublicClient()
    .from("products")
    .select(CARD_COLUMNS)
    .eq("is_published", true)
    .is("archived_at", null)
    .eq("category_id", categoryId)
    .neq("id", excludeId)
    .order("legacy_id")
    .limit(limit);
  if (error) throw error;
  return (data as unknown as CardRow[]).map(toCard);
}

export async function getProductsBySlugs(slugs: string[]) {
  "use cache";
  cacheCatalogue();
  if (!slugs.length) return [];
  const { data, error } = await createPublicClient()
    .from("products")
    .select(CARD_COLUMNS)
    .in("slug", slugs)
    .eq("is_published", true)
    .is("archived_at", null);
  if (error) throw error;
  const cards = (data as unknown as CardRow[]).map(toCard);
  return slugs.map((s) => cards.find((c) => c.slug === s)).filter((c): c is ProductCard => !!c);
}

/** Lightweight list used by the enquiry form's product picker. */
export async function getQuotableProducts() {
  "use cache";
  cacheCatalogue();
  const { data, error } = await createPublicClient()
    .from("products")
    .select("id, name, slug, categories(name)")
    .eq("is_published", true)
    .eq("quote_enabled", true)
    .is("archived_at", null)
    .order("name");
  if (error) throw error;
  return data.map((p) => ({ id: p.id, name: p.name, slug: p.slug, category: (p.categories as { name: string } | null)?.name ?? null }));
}

export async function getHomepageContent(): Promise<HomepageContent> {
  "use cache";
  cacheLife("hours");
  cacheTag(CONTENT_TAG);
  const { data } = await createPublicClient().from("site_content").select("data").eq("key", "homepage").maybeSingle();
  const parsed = homepageSchema.safeParse(data?.data);
  return parsed.success ? parsed.data : DEFAULT_HOMEPAGE;
}

export async function getAllPublishedSlugs() {
  "use cache";
  cacheCatalogue();
  const db = createPublicClient();
  const [products, categories] = await Promise.all([
    db.from("products").select("slug, updated_at").eq("is_published", true).is("archived_at", null),
    db.from("categories").select("slug, updated_at").eq("is_published", true),
  ]);
  return { products: products.data ?? [], categories: categories.data ?? [] };
}
