import Link from "next/link";
import { formatDate, PageHeader, Pagination, Table } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/ui/primitives";
import type { Prisma } from "@prisma/client";
import { requestDb } from "@/lib/db";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/validation/order";

const PAGE_SIZE = 25;
const money = (n: number, c: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

export default async function OrdersPage(props: PageProps<"/admin/orders">) {
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" && (ORDER_STATUSES as readonly string[]).includes(sp.status) ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const db = await requestDb();
  const where: Prisma.RetailOrderWhereInput = status ? { status } : {};
  const [orders, count] = await Promise.all([
    db.retailOrder.findMany({ where, orderBy: { created_at: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { _count: { select: { items: true } } } }),
    db.retailOrder.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const href = (p: number) => `/admin/orders?${new URLSearchParams({ ...(status && { status }), ...(p > 1 && { page: String(p) }) })}`;

  return (
    <>
      <PageHeader title="Retail orders" description={`${count} order${count === 1 ? "" : "s"} from the website cart. Wholesale requests are under Enquiries.`} />
      <form className="mb-4 flex items-end gap-3" action="/admin/orders">
        <div>
          <label htmlFor="status" className="mb-1 block text-xs text-muted">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="field h-9 py-0 text-sm">
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-9 rounded-full bg-ink px-5 text-sm text-paper transition-colors hover:bg-indigo">
          Filter
        </button>
      </form>
      {orders.length ? (
        <Table head={["Order", "Placed", "Customer", "Items", "Total", "Payment", "Status"]}>
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-ivory">
              <td className="px-4 py-2">
                <Link href={`/admin/orders/${o.id}`} className="font-medium text-indigo hover:underline">
                  {o.order_number}
                </Link>
              </td>
              <td className="px-4 py-2 text-ink-soft">{formatDate(o.created_at, true)}</td>
              <td className="px-4 py-2">
                {o.customer_name}
                <span className="block text-xs text-muted">{o.city}</span>
              </td>
              <td className="px-4 py-2 tabular-nums">{o._count.items}</td>
              <td className="px-4 py-2 font-medium tabular-nums">{money(o.subtotal, o.currency)}</td>
              <td className="px-4 py-2 text-xs text-ink-soft">
                {o.payment_method === "cod" ? "Cash on delivery" : "Online"} · {o.payment_status}
              </td>
              <td className="px-4 py-2">
                <Badge tone={o.status === "new" ? "indigo" : o.status === "cancelled" ? "danger" : o.status === "delivered" ? "success" : "brass"}>{ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title="No orders yet">Orders placed through the cart and checkout will appear here.</EmptyState>
      )}
      <Pagination page={page} pageCount={pageCount} href={href} />
    </>
  );
}
