import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, PageHeader, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/primitives";
import { requestDb } from "@/lib/db";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/validation/order";

const money = (n: number, c: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

export default async function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params;
  const db = await requestDb();
  const c = await db.customer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      email_verified_at: true,
      created_at: true,
      addresses: { orderBy: [{ is_default: "desc" }, { created_at: "asc" }] },
      orders: { orderBy: { created_at: "desc" }, take: 20, select: { id: true, order_number: true, created_at: true, subtotal: true, currency: true, status: true, payment_status: true } },
      enquiries: { orderBy: { created_at: "desc" }, take: 20, select: { id: true, enquiry_number: true, created_at: true, status: true } },
    },
  });
  if (!c) notFound();

  return (
    <>
      <PageHeader title={c.name} description={`Joined ${formatDate(c.created_at)}`} back={{ href: "/admin/customers", label: "All customers" }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Panel title="Orders">
            {c.orders.length ? (
              <ul className="divide-y divide-line text-sm">
                {c.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-4 py-3">
                    <span>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-indigo hover:underline">
                        {o.order_number}
                      </Link>
                      <span className="block text-xs text-muted">
                        {formatDate(o.created_at, true)} · payment {o.payment_status}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">{money(o.subtotal, o.currency)}</span>
                      <Badge tone={o.status === "new" ? "indigo" : o.status === "cancelled" ? "danger" : o.status === "delivered" ? "success" : "brass"}>{ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No orders placed while signed in.</p>
            )}
          </Panel>
          <Panel title="Wholesale enquiries">
            {c.enquiries.length ? (
              <ul className="divide-y divide-line text-sm">
                {c.enquiries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-4 py-3">
                    <Link href={`/admin/enquiries/${e.id}`} className="font-medium text-indigo hover:underline">
                      {e.enquiry_number}
                    </Link>
                    <span className="flex items-center gap-3 text-xs text-muted">
                      {formatDate(e.created_at)}
                      <Badge tone="indigo">{e.status.replace(/_/g, " ")}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No enquiries linked to this account.</p>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Account">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Email</dt>
                <dd>
                  <a className="underline" href={`mailto:${c.email}`}>
                    {c.email}
                  </a>{" "}
                  {c.email_verified_at ? <Badge tone="success">Verified</Badge> : <Badge tone="brass">Not verified</Badge>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Mobile</dt>
                <dd>
                  <a className="underline" href={`tel:${c.phone}`}>
                    {c.phone}
                  </a>
                </dd>
              </div>
            </dl>
          </Panel>
          <Panel title={`Saved addresses (${c.addresses.length})`}>
            {c.addresses.length ? (
              <ul className="space-y-4 text-sm">
                {c.addresses.map((a) => (
                  <li key={a.id}>
                    <p className="font-medium">
                      {a.label} {a.is_default && <Badge tone="indigo">Default</Badge>}
                    </p>
                    <p className="text-ink-soft">
                      {a.full_name}, {a.phone}
                      <br />
                      {a.line}, {a.city}, {a.state} {a.postcode}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No saved addresses.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
