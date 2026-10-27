import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/forms";
import { formatDate, PageHeader, Panel } from "@/components/admin/ui";
import { requestDb } from "@/lib/db";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/validation/order";
import { updateOrder } from "../actions";

const money = (n: number, c: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

export default async function OrderPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;
  const db = await requestDb();
  const order = await db.retailOrder.findUnique({ where: { id }, include: { items: true } });
  if (!order) notFound();
  const method = PAYMENT_METHODS[order.payment_method as keyof typeof PAYMENT_METHODS] ?? order.payment_method;

  return (
    <>
      <PageHeader title={order.order_number} description={`Placed ${formatDate(order.created_at, true)}`} back={{ href: "/admin/orders", label: "All orders" }} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Panel title="Items">
            <ul className="divide-y divide-line text-sm">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-3">
                  <span>
                    {i.product_name}
                    <span className="block text-xs text-muted">
                      {i.size ? `Size ${i.size} · ` : ""}
                      {money(i.unit_price, order.currency)} × {i.quantity}
                    </span>
                  </span>
                  <span className="tabular-nums">{money(i.unit_price * i.quantity, order.currency)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t border-line pt-3 font-bold">
              <span>Subtotal</span>
              <span className="tabular-nums">{money(order.subtotal, order.currency)}</span>
            </p>
            <p className="mt-2 text-xs text-muted">Prices are those in force when the order was placed.</p>
          </Panel>
          <Panel title="Customer and delivery">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Name</dt>
                <dd>{order.customer_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Contact</dt>
                <dd>
                  <a className="underline" href={`tel:${order.phone}`}>
                    {order.phone}
                  </a>
                  <br />
                  <a className="underline" href={`mailto:${order.email}`}>
                    {order.email}
                  </a>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">Address</dt>
                <dd>
                  {order.address_line}, {order.city}, {order.state} {order.postcode}
                </dd>
              </div>
              {order.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted">Notes</dt>
                  <dd className="whitespace-pre-wrap">{order.notes}</dd>
                </div>
              )}
            </dl>
          </Panel>
        </div>
        <Panel title="Fulfilment">
          <p className="mb-4 text-sm text-ink-soft">Payment method: {method}</p>
          <ActionForm action={updateOrder.bind(null, order.id)} submitLabel="Update order">
            <label htmlFor="status" className="mb-1 block text-xs text-muted">
              Order status
            </label>
            <select id="status" name="status" defaultValue={order.status} className="field h-10 w-full py-0">
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <label htmlFor="paymentStatus" className="mb-1 mt-4 block text-xs text-muted">
              Payment status
            </label>
            <select id="paymentStatus" name="paymentStatus" defaultValue={order.payment_status} className="field h-10 w-full py-0 capitalize">
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
