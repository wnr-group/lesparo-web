import Link from "next/link";
import { getFacets, listProducts, SORTS, type SortKey } from "@/lib/catalogue/queries";
import { EmptyState } from "@/components/ui/primitives";
import { CatalogueFilters } from "./catalogue-filters";
import { ProductGrid } from "./product-card";

type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 80) || undefined;

export async function CatalogueBrowser({
  searchParams,
  basePath,
  categoryIds,
  showSearch = true,
}: {
  searchParams: Promise<SearchParams>;
  basePath: string;
  categoryIds?: string[];
  showSearch?: boolean;
}) {
  const sp = await searchParams;
  const q = one(sp.q);
  const fabric = one(sp.fabric);
  const size = one(sp.size);
  const sortParam = one(sp.sort);
  const sort: SortKey = sortParam && sortParam in SORTS ? (sortParam as SortKey) : "featured";
  const page = Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1);

  const [result, facets] = await Promise.all([listProducts({ q, fabric, size, sort, page, categoryIds }), getFacets(categoryIds)]);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (fabric) params.set("fabric", fabric);
    if (size) params.set("size", size);
    if (sort !== "featured") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    return `${basePath}${params.size ? `?${params}` : ""}`;
  };

  return (
    <>
      <CatalogueFilters basePath={basePath} q={q} fabric={fabric} size={size} sort={sort} fabrics={facets.fabrics} sizes={facets.sizes} sorts={SORTS} showSearch={showSearch} />
      <p className="mt-6 text-sm text-muted" role="status">
        {result.total === 1 ? "1 product" : `${result.total} products`}
        {q && <> for “{q}”</>}
      </p>
      <div className="mt-6">
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
      </div>
      {result.pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-1">
          {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={pageHref(p)}
              aria-current={p === result.page ? "page" : undefined}
              className={`flex size-10 items-center justify-center rounded-full text-sm font-semibold ${p === result.page ? "bg-ink text-paper" : "hover:bg-[#f2f3f5]"}`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

export function CatalogueSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-[4.6rem] border-y border-line" />
      <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="aspect-[513/655] bg-linen" />
            <div className="mt-4 h-3 w-1/3 bg-linen" />
            <div className="mt-2 h-4 w-2/3 bg-linen" />
          </div>
        ))}
      </div>
    </div>
  );
}
