"use client";

import clsx from "clsx";
import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";

export type CategoryOption = { slug: string; name: string; depth: number };

type Props = {
  basePath: string;
  q?: string;
  category?: string;
  fabric?: string;
  size?: string;
  min?: string;
  max?: string;
  sort: string;
  categories: CategoryOption[];
  fabrics: string[];
  sizes: string[];
  price: { min: number; max: number } | null;
  sorts: Record<string, string>;
  showSearch: boolean;
  total: number;
  /** The result grid and pagination, rendered on the server and slotted into the page here. */
  children: ReactNode;
};

const FORM_ID = "catalogue-filters";

/**
 * The browsing screen: a search bar, a sort control and a filter sidebar (a collapsible panel on phones) around the results.
 * It is one plain GET form, so it works without JavaScript; with JavaScript every choice applies at once. All state lives
 * in the URL, so results are shareable and the back button works.
 */
export function CatalogueFilters({ basePath, q, category, fabric, size, min, max, sort, categories, fabrics, sizes, price, sorts, showSearch, total, children }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const apply = () => {
    const fd = new FormData(formRef.current!);
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (typeof v === "string" && v.trim() && !(k === "sort" && v === "featured")) params.set(k, v.trim());
    startTransition(() => router.push(`${basePath}${params.size ? `?${params}` : ""}`, { scroll: false }));
  };

  const categoryName = categories.find((c) => c.slug === category)?.name;
  const priceLabel = min || max ? `₹${min || price?.min || 0} – ${max ? `₹${max}` : "any"}` : null;
  const active = [
    q && { k: "q", label: `“${q}”`, drop: ["q"] },
    category && { k: "category", label: categoryName ?? category, drop: ["category"] },
    fabric && { k: "fabric", label: fabric, drop: ["fabric"] },
    size && { k: "size", label: `Size ${size}`, drop: ["size"] },
    priceLabel && { k: "price", label: priceLabel, drop: ["min", "max"] },
  ].filter(Boolean) as { k: string; label: string; drop: string[] }[];
  const current: Record<string, string | undefined> = { q, category, fabric, size, min, max, sort: sort !== "featured" ? sort : undefined };
  const hrefWithout = (drop: string[]) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(current)) if (v && !drop.includes(k)) params.set(k, v);
    return `${basePath}${params.size ? `?${params}` : ""}`;
  };

  const heading = "text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-muted";
  const option = "flex cursor-pointer items-center gap-2.5 py-1.5 text-sm transition-colors hover:text-indigo has-[:checked]:font-semibold has-[:checked]:text-ink";

  return (
    <div className="flex flex-col gap-y-5 lg:grid lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-x-10 lg:gap-y-5">
      {/* ------------------------------------------------------------------ toolbar */}
      <div className="order-1 flex flex-wrap items-center gap-3 lg:col-start-2 lg:row-start-1">
        {showSearch && (
          <label className="relative block min-w-0 flex-1 basis-60">
            <span className="sr-only">Search products</span>
            <input
              form={FORM_ID}
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search by name or fabric"
              className="h-12 w-full rounded-full border border-sand bg-white pl-12 pr-4 text-[0.95rem] transition-[border-color,box-shadow] placeholder:text-muted/70 hover:border-muted focus:border-indigo focus:outline-none focus:ring-4 focus:ring-indigo/10"
            />
            <button form={FORM_ID} type="submit" aria-label="Search" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-indigo">
              <Search className="size-5" aria-hidden />
            </button>
          </label>
        )}
        <select form={FORM_ID} name="sort" aria-label="Sort by" defaultValue={sort} onChange={apply} className="h-12 cursor-pointer rounded-full border border-sand bg-white px-5 pr-9 text-sm font-medium hover:border-muted focus:border-indigo focus:outline-none">
          {Object.entries(sorts).map(([k, v]) => (
            <option key={k} value={k}>
              {k === "featured" ? "Sort: Featured" : v}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="catalogue-filter-panel"
          className="inline-flex h-12 items-center gap-2 rounded-full border border-sand bg-white px-5 text-sm font-medium hover:border-ink lg:hidden"
        >
          <SlidersHorizontal className="size-4" aria-hidden /> Filters{active.filter((a) => a.k !== "q").length ? ` (${active.filter((a) => a.k !== "q").length})` : ""}
        </button>
      </div>

      {/* ------------------------------------------------------------ filter panel */}
      <aside id="catalogue-filter-panel" className={clsx("order-2 lg:order-none lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:block", open ? "block" : "hidden")}>
        <form
          id={FORM_ID}
          ref={formRef}
          action={basePath}
          aria-busy={pending}
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
          onChange={(e) => {
            const t = e.target as unknown as HTMLInputElement;
            if (t.type !== "number" && t.type !== "search") apply();
          }}
          className="space-y-7 rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:rounded-none lg:border-0 lg:border-r lg:bg-transparent lg:p-0 lg:pr-6"
        >
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-muted">
              <span className="font-semibold tabular-nums text-ink">{total}</span> {total === 1 ? "product" : "products"}
            </p>
            {active.length > 0 && (
              <Link href={basePath} scroll={false} className="link-draw text-sm text-muted">
                Clear all
              </Link>
            )}
          </div>

          {categories.length > 0 && (
            <fieldset>
              <legend className={heading}>Category</legend>
              <div className="mt-2">
                <label className={option}>
                  <input type="radio" name="category" value="" defaultChecked={!category} className="accent-indigo" /> All
                </label>
                {categories.map((c) => (
                  <label key={c.slug} className={clsx(option, c.depth > 0 && "pl-5")}>
                    <input type="radio" name="category" value={c.slug} defaultChecked={category === c.slug} className="accent-indigo" /> {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {fabrics.length > 0 && (
            <fieldset>
              <legend className={heading}>Fabric</legend>
              <div className="mt-2">
                <label className={option}>
                  <input type="radio" name="fabric" value="" defaultChecked={!fabric} className="accent-indigo" /> All fabrics
                </label>
                {fabrics.map((f) => (
                  <label key={f} className={option}>
                    <input type="radio" name="fabric" value={f} defaultChecked={fabric === f} className="accent-indigo" /> {f}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {sizes.length > 0 && (
            <fieldset>
              <legend className={heading}>Size</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <label key={s} className="relative">
                    <input type="radio" name="size" value={s} defaultChecked={size === s} onClick={(e) => size === s && (e.currentTarget.checked = false, apply())} className="peer sr-only" />
                    <span className="flex h-9 min-w-11 cursor-pointer items-center justify-center rounded-md border border-sand bg-white px-3 text-sm font-medium transition-colors hover:border-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo">
                      {s}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {price && (
            <fieldset>
              <legend className={heading}>Price (₹)</legend>
              <div className="mt-3 flex items-center gap-2">
                <input name="min" type="number" inputMode="numeric" min={0} defaultValue={min} placeholder={String(price.min)} aria-label="Minimum price" className="field h-10 w-full py-0 text-sm" />
                <span aria-hidden className="text-muted">
                  –
                </span>
                <input name="max" type="number" inputMode="numeric" min={0} defaultValue={max} placeholder={String(price.max)} aria-label="Maximum price" className="field h-10 w-full py-0 text-sm" />
              </div>
              <button type="submit" className="mt-3 h-9 w-full rounded-md border border-ink/20 text-sm font-semibold transition-colors hover:bg-ink hover:text-white">
                Apply price
              </button>
            </fieldset>
          )}
          <noscript>
            <button type="submit" className="h-10 w-full bg-ink px-5 text-sm font-semibold text-paper">
              Apply filters
            </button>
          </noscript>
        </form>
      </aside>

      {/* ----------------------------------------------------- chips and results */}
      <div className={clsx("order-3 min-w-0 transition-opacity lg:col-start-2 lg:row-start-2 lg:row-end-4", pending && "opacity-60")}>
        {active.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Showing</span>
            {active.map((a) => (
              <Link key={a.k} href={hrefWithout(a.drop)} scroll={false} aria-label={`Remove filter ${a.label}`} className="group/x inline-flex items-center gap-1.5 bg-paper px-2.5 py-1 font-medium transition-colors hover:bg-ink hover:text-white">
                {a.label}
                <X className="size-3.5 opacity-60 group-hover/x:opacity-100" aria-hidden />
              </Link>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
