import Image from "next/image";
import Link from "next/link";
import { ActionForm, FieldError } from "@/components/admin/forms";
import { PageHeader, Pagination, Panel } from "@/components/admin/ui";
import { sanitiseSearch } from "@/lib/catalogue/queries";
import { requestDb } from "@/lib/db";
import { publicMediaUrl } from "@/lib/storage";
import type { Prisma } from "@prisma/client";
import { savePrices } from "./actions";

const PAGE_SIZE = 25;

export default async function PricingPage(props: PageProps<"/admin/pricing">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sanitiseSearch(sp.q) : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const db = await requestDb();
  const categories = await db.category.findMany({ where: { products: { some: {} } }, select: { id: true, name: true }, orderBy: { display_order: "asc" } });
  const where: Prisma.ProductWhereInput = {
    archived_at: null,
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { slug: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }] }),
    ...(category && { category_id: category }),
  };
  const [products, count] = await Promise.all([
    db.product.findMany({
      where,
      select: { id: true, name: true, slug: true, price: true, currency: true, retail_enabled: true, quote_enabled: true, is_published: true, category: { select: { name: true } }, images: { orderBy: { display_order: "asc" }, take: 1, select: { storage_path: true } } },
      orderBy: [{ category_id: "asc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (p > 1) params.set("page", String(p));
    return `/admin/pricing${params.size ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Pricing"
        description="Set each product's retail price and choose how it can be bought. Changes go live on the website as soon as you save."
      />
      <div className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
        <p className="border border-line bg-plate p-4">
          <strong className="block">Retail (B2C)</strong>
          <span className="text-ink-soft">Shows the price with Add to cart and Buy now. Needs a price.</span>
        </p>
        <p className="border border-line bg-plate p-4">
          <strong className="block">Wholesale (B2B)</strong>
          <span className="text-ink-soft">Shows Enquire now. Bulk prices are quoted by your sales team and are never shown on the site.</span>
        </p>
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3" action="/admin/pricing">
        <div>
          <label htmlFor="q" className="mb-1 block text-xs text-muted">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, slug or SKU" className="field h-9 w-64 py-0 text-sm" />
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-xs text-muted">
            Category
          </label>
          <select id="category" name="category" defaultValue={category} className="field h-9 py-0 text-sm">
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-9 rounded-full bg-ink px-5 text-sm text-paper transition-colors hover:bg-indigo">
          Filter
        </button>
      </form>

      <Panel title={`${count} product${count === 1 ? "" : "s"}${pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}`}>
        <ActionForm action={savePrices} submitLabel="Save prices" successMessage="Prices saved and live on the website.">
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-y border-line bg-ivory text-xs uppercase tracking-[0.1em] text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Product
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Retail price (INR)
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Retail (B2C)
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Wholesale (B2B)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-2">
                      <input type="hidden" name="ids" value={p.id} />
                      <div className="flex items-center gap-3">
                        <div className="relative aspect-[513/655] w-9 shrink-0 bg-plate ring-1 ring-line">
                          {p.images[0] && <Image src={publicMediaUrl(p.images[0].storage_path)!} alt="" fill sizes="36px" className="object-contain" />}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/products/${p.id}`} className="font-medium text-indigo hover:underline">
                            {p.name}
                          </Link>
                          <span className="block text-xs text-muted">
                            {p.category?.name ?? "No category"}
                            {!p.is_published && " · Draft"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <label className="sr-only" htmlFor={`price-${p.id}`}>
                        Retail price for {p.name}
                      </label>
                      <input id={`price-${p.id}`} name={`price.${p.id}`} inputMode="decimal" defaultValue={p.price ?? ""} placeholder="—" className="field h-9 w-28 py-0 text-sm tabular-nums" />
                      <FieldError name={`price.${p.id}`} />
                    </td>
                    <td className="px-3 py-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name={`retail.${p.id}`} defaultChecked={p.retail_enabled} className="accent-indigo" /> <span className="text-xs">Buy online</span>
                      </label>
                    </td>
                    <td className="px-3 py-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name={`quote.${p.id}`} defaultChecked={p.quote_enabled} className="accent-indigo" /> <span className="text-xs">Enquire now</span>
                      </label>
                      <FieldError name={`quote.${p.id}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ActionForm>
      </Panel>
      <Pagination page={page} pageCount={pageCount} href={href} />
    </>
  );
}
