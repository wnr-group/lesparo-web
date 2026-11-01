import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/forms";
import { formatDate, PageHeader, Panel } from "@/components/admin/ui";
import { requestDb } from "@/lib/db";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/validation/order";
import { reconcileOrderAction, updateOrder } from "../actions";

const money = (n: number, c: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

export default async function OrderPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;
  const db = await requestDb();
  const order = await db.retailOrder.findUnique({ where: { id }, include: { items: true, payments: { orderBy: { created_at: "asc" } }, audits: { orderBy: { created_at: "desc" }, take: 20 } } });
  if (!order) notFound();
  const online = order.payment_method === "razorpay";
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
        <div className="space-y-6">
          {online && (
            <Panel title="Online payment">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Payment status</dt>
                  <dd className="font-semibold capitalize">{order.payment_status}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Signature verified</dt>
                  <dd>{order.payment_verified ? "Yes" : "No"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Paid</dt>
                  <dd>{order.paid_at ? formatDate(order.paid_at, true) : "Not yet"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Amount sent</dt>
                  <dd className="tabular-nums">{order.razorpay_amount !== null ? money(order.razorpay_amount / 100, order.currency) : "Not started"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Razorpay order</dt>
                  <dd className="break-all font-mono text-xs">{order.razorpay_order_id ?? "None yet"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Razorpay payment</dt>
                  <dd className="break-all font-mono text-xs">{order.razorpay_payment_id ?? "None yet"}</dd>
                </div>
              </dl>
              {order.payments.length > 0 && (
                <ul className="mt-4 divide-y divide-line border-t border-line text-xs">
                  {order.payments.map((p) => (
                    <li key={p.id} className="py-2">
                      <span className="font-mono">{p.razorpay_payment_id}</span> · {p.status}
                      {p.method ? ` · ${p.method}` : ""}
                      {p.duplicate ? " · DUPLICATE: refund in Razorpay Dashboard" : ""}
                      {p.error_description ? <span className="block text-muted">{p.error_description}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <ActionForm action={reconcileOrderAction.bind(null, order.id)} submitLabel="Check with Razorpay" successMessage="Checked with Razorpay.">
                  <p className="text-xs text-muted">Re-reads this order&apos;s payments from Razorpay and settles the order the same way the webhook does.</p>
                </ActionForm>
              </div>
            </Panel>
          )}
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
          {online && <p className="mt-3 text-xs text-muted">Payment status on online orders is set by Razorpay. Staff can only record a refund after payment.</p>}
        </Panel>
        {order.audits.length > 0 && (
          <Panel title="Change log">
            <ul className="divide-y divide-line text-xs">
              {order.audits.map((a) => (
                <li key={a.id} className="py-2">
                  {formatDate(a.created_at, true)} · {a.actor}
                  <span className="block text-muted">
                    {a.action.replace("_", " ")}: {a.from_value ? `${a.from_value} → ` : ""}
                    {a.to_value}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        </div>
      </div>
    </>
  );
}
