import type { Metadata } from "next";
import { Check } from "lucide-react";
import { notFound } from "next/navigation";
import { OrderStatusBadge, PaymentStatusBadge, dateOnly } from "@/components/account/status";
import { ButtonLink } from "@/components/ui/button";
import { requireCustomerPage } from "@/lib/auth/customer";
import { formatPrice } from "@/lib/format";
import { getOrder } from "@/lib/services/customer-account";
import { PAYMENT_METHODS } from "@/lib/validation/order";

export const metadata: Metadata = { title: "Order details" };

const STEPS = [
  ["new", "Placed"],
  ["confirmed", "Confirmed"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
] as const;

export default async function OrderDetailPage(props: PageProps<"/account/orders/[orderNumber]">) {
  const { orderNumber } = await props.params;
  const me = await requireCustomerPage(`/account/orders/${orderNumber}`);
  // Scoped to the signed-in customer: someone else's order number is a plain 404.
  const order = await getOrder(me.id, decodeURIComponent(orderNumber));
  if (!order) notFound();

  const cancelled = order.status === "cancelled";
  const reached = STEPS.findIndex(([s]) => s === order.status);
  const method = PAYMENT_METHODS[order.payment_method as keyof typeof PAYMENT_METHODS] ?? order.payment_method;
  const canPay = order.payment_method === "razorpay" && !!order.access_token && ["pending", "failed"].includes(order.payment_status) && !cancelled;

  return (
    <div className="space-y-8">
      <header>
        <ButtonLink href="/account/orders" variant="ghost" size="sm" className="-ml-3">
          ← All orders
        </ButtonLink>
        <h1 className="mt-2 font-display text-headline font-bold">{order.order_number}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment_status} method={order.payment_method} />
          <span className="text-sm text-muted">Placed {dateOnly(order.created_at)}</span>
        </div>
      </header>

      {!cancelled && (
        <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
          {STEPS.map(([key, label], i) => {
            const done = i <= reached;
            return (
              <li key={key} className="text-center">
                <span className={`mx-auto flex size-8 items-center justify-center rounded-full border text-xs font-bold ${done ? "border-indigo bg-indigo text-white" : "border-line bg-plate text-muted"}`}>{done ? <Check className="size-4" aria-hidden /> : i + 1}</span>
                <span className={`mt-2 block text-xs font-semibold ${done ? "text-ink" : "text-muted"}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {canPay && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-sun bg-sun-50 p-5">
          <p className="text-sm font-medium">This order is waiting for payment.</p>
          <ButtonLink href={`/checkout/status?o=${encodeURIComponent(order.order_number)}&t=${encodeURIComponent(order.access_token!)}`}>Pay now</ButtonLink>
        </div>
      )}

      <section className="border border-line bg-plate p-5 sm:p-6" aria-labelledby="items">
        <h2 id="items" className="font-display text-xl font-bold">
          Items
        </h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-3">
              <span>
                {i.product_name}
                <span className="block text-xs text-muted">
                  {i.size ? `Size ${i.size} · ` : ""}
                  {formatPrice(i.unit_price, order.currency)} × {i.quantity}
                </span>
              </span>
              <span className="tabular-nums">{formatPrice(i.unit_price * i.quantity, order.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-line pt-3 font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(order.subtotal, order.currency)}</span>
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="border border-line bg-plate p-5 sm:p-6" aria-labelledby="delivery">
          <h2 id="delivery" className="font-display text-xl font-bold">
            Delivery
          </h2>
          <address className="mt-3 text-sm not-italic leading-relaxed text-ink-soft">
            {order.customer_name}
            <br />
            {order.address_line}
            <br />
            {order.city}, {order.state} {order.postcode}
            <br />
            {order.phone}
          </address>
          <div className="mt-4 border-t border-line pt-4 text-sm">
            {order.tracking_number || order.tracking_url ? (
              <>
                <p className="font-semibold">Tracking</p>
                <p className="mt-1 text-ink-soft">
                  {[order.tracking_carrier, order.tracking_number].filter(Boolean).join(" · ")}
                </p>
                {order.tracking_url && /^https?:\/\//i.test(order.tracking_url) && (
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-indigo hover:underline">
                    Track shipment
                  </a>
                )}
              </>
            ) : (
              <p className="text-muted">{order.status === "shipped" ? "Tracking details will appear here once the carrier shares them." : "Tracking appears here once your order ships."}</p>
            )}
          </div>
        </section>

        <section className="border border-line bg-plate p-5 sm:p-6" aria-labelledby="payment">
          <h2 id="payment" className="font-display text-xl font-bold">
            Payment
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Method</dt>
              <dd className="font-medium">{method}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Status</dt>
              <dd>
                <PaymentStatusBadge status={order.payment_status} method={order.payment_method} />
              </dd>
            </div>
            {order.paid_at && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Paid on</dt>
                <dd className="font-medium">{dateOnly(order.paid_at)}</dd>
              </div>
            )}
          </dl>
          {order.payments.length > 1 && <p className="mt-4 border-t border-line pt-3 text-xs text-muted">{order.payments.length} payment attempts were made on this order.</p>}
        </section>
      </div>
    </div>
  );
}
