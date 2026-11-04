import Image from "next/image";
import Link from "next/link";
import { PageHeader, Pagination, Table } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import type { Prisma } from "@prisma/client";
import { sanitiseSearch } from "@/lib/catalogue/queries";
import { requestDb } from "@/lib/db";
import { publicMediaUrl } from "@/lib/storage";

const PAGE_SIZE = 30;

export default async function AdminProductsPage(props: PageProps<"/admin/products">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sanitiseSearch(sp.q) : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const db = await requestDb();
  const categories = await db.category.findMany({ select: { id: true, name: true, parent_id: true }, orderBy: { display_order: "asc" } });
  const where: Prisma.ProductWhereInput = {
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { slug: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }, { fabric: { contains: q, mode: "insensitive" as const } }] }),
    ...(status === "published"
      ? { is_published: true, archived_at: null }
      : status === "draft"
        ? { is_published: false, archived_at: null }
        : status === "archived"
          ? { archived_at: { not: null } }
          : { archived_at: null }),
    ...(category && { category_id: category }),
  };

  const [data, count] = await Promise.all([
    db.product.findMany({
      where,
      select: {
        id: true, name: true, slug: true, fabric: true, is_published: true, is_featured: true, archived_at: true, quote_enabled: true, retail_enabled: true,
        category: { select: { name: true } },
        images: { select: { storage_path: true, is_primary: true }, orderBy: { display_order: "asc" } },
      },
      orderBy: { updated_at: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ]);
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (p > 1) params.set("page", String(p));
    return `/admin/products${params.size ? `?${params}` : ""}`;
  };
  const nameOf = (id: string | null) => categories.find((c) => c.id === id)?.name;

  return (
    <>
      <PageHeader
        title="Products"
        description={`${count} matching`}
        actions={
          <Link href="/admin/products/new" className={buttonClass("primary", "sm")}>
            Add product
          </Link>
        }
      />
      <form className="mb-4 flex flex-wrap items-end gap-3" action="/admin/products">
        <div>
          <label htmlFor="q" className="mb-1 block text-xs text-muted">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, slug, SKU, fabric" className="field h-9 w-64 py-0 text-sm" />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs text-muted">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="field h-9 py-0 text-sm">
            <option value="">Active (not archived)</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label htmlFor="category" className="mb-1 block text-xs text-muted">
            Category
          </label>
          <select id="category" name="category" defaultValue={category} className="field h-9 py-0 text-sm">
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parent_id ? `${nameOf(c.parent_id)} › ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-9 rounded-full bg-ink px-5 text-sm text-paper transition-colors hover:bg-indigo">
          Filter
        </button>
      </form>

      {data.length ? (
        <Table head={["", "Product", "Category", "Fabric", "Ordering", "Status"]}>
          {data.map((p) => {
            const img = p.images.find((i) => i.is_primary) ?? p.images[0];
            return (
              <tr key={p.id} className="hover:bg-ivory">
                <td className="w-14 px-4 py-2">
                  <div className="relative aspect-[513/655] w-10 bg-plate ring-1 ring-line">
                    {img && <Image src={publicMediaUrl(img.storage_path)!} alt="" fill sizes="40px" className="object-contain" />}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/admin/products/${p.id}`} className="font-medium text-indigo hover:underline">
                    {p.name}
                  </Link>
                  <span className="block text-xs text-muted">/{p.slug}</span>
                </td>
                <td className="px-4 py-2 text-ink-soft">{p.category?.name ?? "—"}</td>
                <td className="px-4 py-2 text-ink-soft">{p.fabric ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-ink-soft">{[p.quote_enabled && "Wholesale", p.retail_enabled && "Retail"].filter(Boolean).join(" · ")}</td>
                <td className="space-x-1 px-4 py-2">
                  {p.archived_at ? <Badge>Archived</Badge> : p.is_published ? <Badge tone="success">Published</Badge> : <Badge tone="warning">Draft</Badge>}
                  {p.is_featured && <Badge tone="brass">Featured</Badge>}
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <EmptyState title="No products match">
          <Link href="/admin/products" className="underline">
            Clear filters
          </Link>
        </EmptyState>
      )}
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(count / PAGE_SIZE))} href={href} />
    </>
  );
}
