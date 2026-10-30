import Link from "next/link";
import { getCategoryBySlug, getFacets, listProducts, SORTS, type SortKey } from "@/lib/catalogue/queries";
import { EmptyState } from "@/components/ui/primitives";
import { CatalogueFilters, type CategoryOption } from "./catalogue-filters";
import { ProductGrid } from "./product-card";

type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 80) || undefined;
const money = (v: string | undefined) => {
  const n = v === undefined ? NaN : Number.parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export async function CatalogueBrowser({
  searchParams,
  basePath,
  categoryIds,
  categoryOptions = [],
  showSearch = true,
}: {
  searchParams: Promise<SearchParams>;
  basePath: string;
  categoryIds?: string[];
  /** The categories offered in the Category filter. */
  categoryOptions?: CategoryOption[];
  showSearch?: boolean;
}) {
  const sp = await searchParams;
  const q = one(sp.q);
  const category = one(sp.category);
  const fabric = one(sp.fabric);
  const size = one(sp.size);
  const min = one(sp.min);
  const max = one(sp.max);
  const sortParam = one(sp.sort);
  const sort: SortKey = sortParam && sortParam in SORTS ? (sortParam as SortKey) : "featured";
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);

  // A chosen category narrows the page's own set of categories (never widens it).
  let scope = categoryIds;
  const picked = category ? await getCategoryBySlug(category) : null;
  if (picked) scope = categoryIds ? picked.subtreeIds.filter((id) => categoryIds.includes(id)) : picked.subtreeIds;

  const [result, facets] = await Promise.all([listProducts({ q, fabric, size, minPrice: money(min), maxPrice: money(max), sort, page, categoryIds: scope }), getFacets(categoryIds)]);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (fabric) params.set("fabric", fabric);
    if (size) params.set("size", size);
    if (min) params.set("min", min);
    if (max) params.set("max", max);
    if (sort !== "featured") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    return `${basePath}${params.size ? `?${params}` : ""}`;
  };

  return (
    <CatalogueFilters
      basePath={basePath}
      q={q}
      category={category}
      fabric={fabric}
      size={size}
      min={min}
      max={max}
      sort={sort}
      categories={categoryOptions}
      fabrics={facets.fabrics}
      sizes={facets.sizes}
      price={facets.price}
      sorts={SORTS}
      showSearch={showSearch}
      total={result.total}
    >
      {result.products.length ? (
        <ProductGrid products={result.products} priorityCount={4} />
      ) : (
        <EmptyState
          title="Nothing matches yet"
          action={
            <Link href={basePath} className="link-draw text-sm font-medium">
              Clear filters
            </Link>
          }
        >
          Try a different word or fewer filters — or tell us what you need and our team will help.{" "}
          <Link href="/wholesale#enquire" className="underline">
            Send an enquiry
          </Link>
          .
        </EmptyState>
      )}
      {result.pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-1">
          {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={pageHref(p)}
              aria-current={p === result.page ? "page" : undefined}
              className={`flex size-10 items-center justify-center text-sm font-semibold transition-colors ${p === result.page ? "bg-ink text-paper" : "hover:bg-paper"}`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </CatalogueFilters>
  );
}

export function CatalogueSkeleton() {
  return (
    <div aria-hidden className="animate-pulse lg:grid lg:grid-cols-[14.5rem_1fr] lg:gap-10">
      <div className="hidden h-96 bg-linen/60 lg:block" />
      <div>
        <div className="h-12 rounded-full bg-linen" />
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}>
              <div className="aspect-[4/5] bg-linen" />
              <div className="mt-3 h-3 w-1/3 bg-linen" />
              <div className="mt-2 h-4 w-2/3 bg-linen" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
