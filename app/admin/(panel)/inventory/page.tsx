import Link from "next/link";
import { PageHeader, Pagination, Table } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import type { Prisma } from "@prisma/client";
import { jsonStrings, sanitiseSearch } from "@/lib/catalogue/queries";
import { requestDb } from "@/lib/db";
import { stockInfo } from "@/lib/inventory/status";

const PAGE_SIZE = 40;

function StatusBadge({ level }: { level: "untracked" | "in" | "low" | "out" }) {
  if (level === "untracked") return <Badge>Not tracked</Badge>;
  if (level === "out") return <Badge tone="danger">Out of stock</Badge>;
  if (level === "low") return <Badge tone="warning">Low stock</Badge>;
  return <Badge tone="success">In stock</Badge>;
}

export default async function InventoryPage(props: PageProps<"/admin/inventory">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sanitiseSearch(sp.q) : "";
  const show = typeof sp.show === "string" ? sp.show : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const db = await requestDb();

  const where: Prisma.ProductWhereInput = {
    archived_at: null,
    ...(q && { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }, { slug: { contains: q, mode: "insensitive" as const } }] }),
    ...(show === "untracked" ? { track_inventory: false } : show ? { track_inventory: true } : {}),
  };
  // Low and out of stock depend on the total over sizes, so they are worked out here rather than in SQL (the catalogue is small).
  const all = await db.product.findMany({
    where,
    select: { id: true, name: true, sku: true, sizes: true, track_inventory: true, low_stock_threshold: true, category: { select: { name: true } }, stock: { select: { size: true, quantity: true } } },
    orderBy: { name: "asc" },
  });
  const rows = all.map((p) => ({ ...p, info: stockInfo(p.track_inventory, p.low_stock_threshold, p.stock.map((s) => s.quantity)) }));
  const lowCount = rows.filter((p) => p.info.level === "low").length;
  const outCount = rows.filter((p) => p.info.level === "out").length;
  const filtered = show === "out" ? rows.filter((p) => p.info.level === "out") : show === "low" ? rows.filter((p) => p.info.level === "low" || p.info.level === "out") : rows;
  const list = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (show) params.set("show", show);
    if (p > 1) params.set("page", String(p));
    return `/admin/inventory${params.size ? `?${params}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Inventory" description={`${filtered.length} products. ${lowCount} low on stock and ${outCount} out of stock in this list.`} />
      <form className="mb-4 flex flex-wrap items-end gap-3" action="/admin/inventory">
        <div>
          <label htmlFor="q" className="mb-1 block text-xs text-muted">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, slug or SKU" className="field h-9 w-64 py-0 text-sm" />
        </div>
        <div>
          <label htmlFor="show" className="mb-1 block text-xs text-muted">
            Show
          </label>
          <select id="show" name="show" defaultValue={show} className="field h-9 py-0 text-sm">
            <option value="">All products</option>
            <option value="tracked">Tracked</option>
            <option value="low">Low or out of stock</option>
            <option value="out">Out of stock</option>
            <option value="untracked">Not tracked</option>
          </select>
        </div>
        <button type="submit" className="h-9 rounded-full bg-ink px-5 text-sm text-paper transition-colors hover:bg-indigo">
          Filter
        </button>
      </form>

      {list.length ? (
        <Table head={["Product", "Category", "By size", "On hand", "Status", ""]}>
          {list.map((p) => {
            const sizes = jsonStrings(p.sizes);
            return (
              <tr key={p.id} className="hover:bg-ivory">
                <td className="px-4 py-2">
                  <Link href={`/admin/inventory/${p.id}`} className="font-medium text-indigo hover:underline">
                    {p.name}
                  </Link>
                  {p.sku && <span className="block text-xs text-muted">{p.sku}</span>}
                </td>
                <td className="px-4 py-2 text-ink-soft">{p.category?.name ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-ink-soft">
                  {p.track_inventory && sizes.length ? sizes.map((z) => `${z}: ${p.stock.find((s) => s.size === z)?.quantity ?? 0}`).join("  ·  ") : sizes.length ? `${sizes.length} sizes` : "One size"}
                </td>
                <td className="px-4 py-2 tabular-nums">{p.track_inventory ? p.info.total : "—"}</td>
                <td className="px-4 py-2">
                  <StatusBadge level={p.info.level} />
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/inventory/${p.id}`} className={buttonClass("ghost", "sm")}>
                    Manage
                  </Link>
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <EmptyState title="No products match">
          <Link href="/admin/inventory" className="underline">
            Clear filters
          </Link>
        </EmptyState>
      )}
      <Pagination page={page} pageCount={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))} href={href} />
    </>
  );
}
