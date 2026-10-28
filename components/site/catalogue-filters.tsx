"use client";

import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

type Props = {
  basePath: string;
  q?: string;
  fabric?: string;
  size?: string;
  sort: string;
  fabrics: string[];
  sizes: string[];
  sorts: Record<string, string>;
  showSearch: boolean;
};

/**
 * A plain GET form (works without JavaScript); with JavaScript, selects apply on change.
 * Filter state lives in the URL, so results are shareable and the back button works.
 */
export function CatalogueFilters({ basePath, q, fabric, size, sort, fabrics, sizes, sorts, showSearch }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    const fd = new FormData(formRef.current!);
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (typeof v === "string" && v.trim() && !(k === "sort" && v === "featured")) params.set(k, v.trim());
    startTransition(() => router.push(`${basePath}${params.size ? `?${params}` : ""}`, { scroll: false }));
  };

  const active = [q && { k: "q", label: `“${q}”` }, fabric && { k: "fabric", label: fabric }, size && { k: "size", label: `Size ${size}` }].filter(Boolean) as { k: string; label: string }[];

  return (
    <form
      ref={formRef}
      action={basePath}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="border-y border-line py-4"
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-end gap-3">
        <SlidersHorizontal className="mb-3 hidden size-4 text-muted sm:block" aria-hidden />
        {showSearch && (
          <div className="min-w-48 flex-1 sm:max-w-xs">
            <label htmlFor="f-q" className="eyebrow mb-1.5 block !text-[0.65rem]">
              Search
            </label>
            <input id="f-q" name="q" type="search" defaultValue={q} placeholder="Name or fabric" className="field h-10 py-0" />
          </div>
        )}
        {fabrics.length > 0 && (
          <div className="min-w-40">
            <label htmlFor="f-fabric" className="eyebrow mb-1.5 block !text-[0.65rem]">
              Fabric
            </label>
            <select id="f-fabric" name="fabric" defaultValue={fabric ?? ""} onChange={apply} className="field h-10 py-0">
              <option value="">All fabrics</option>
              {fabrics.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
        )}
        {sizes.length > 0 && (
          <div className="min-w-28">
            <label htmlFor="f-size" className="eyebrow mb-1.5 block !text-[0.65rem]">
              Size
            </label>
            <select id="f-size" name="size" defaultValue={size ?? ""} onChange={apply} className="field h-10 py-0">
              <option value="">Any</option>
              {sizes.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
        <div className="min-w-40 sm:ml-auto">
          <label htmlFor="f-sort" className="eyebrow mb-1.5 block !text-[0.65rem]">
            Sort
          </label>
          <select id="f-sort" name="sort" defaultValue={sort} onChange={apply} className="field h-10 py-0">
            {Object.entries(sorts).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-paper sm:hidden">
          Apply
        </button>
        <noscript>
          <button type="submit" className="h-10 rounded-full bg-ink px-5 text-sm font-semibold text-paper">
            Apply
          </button>
        </noscript>
      </div>
      {active.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          {active.map((a) => {
            const params = new URLSearchParams();
            if (q && a.k !== "q") params.set("q", q);
            if (fabric && a.k !== "fabric") params.set("fabric", fabric);
            if (size && a.k !== "size") params.set("size", size);
            if (sort !== "featured") params.set("sort", sort);
            return (
              <Link key={a.k} href={`${basePath}${params.size ? `?${params}` : ""}`} scroll={false} className="inline-flex items-center gap-1.5 rounded-full border border-sand bg-[#efe8da] px-3 py-1 font-semibold hover:border-ink" aria-label={`Remove filter ${a.label}`}>
                {a.label}
                <X className="size-3.5" aria-hidden />
              </Link>
            );
          })}
          <Link href={basePath} scroll={false} className="link-draw ml-1 text-muted">
            Clear all
          </Link>
        </div>
      )}
    </form>
  );
}
