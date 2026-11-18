import type { Metadata } from "next";
import Link from "next/link";
import { OrderStatusBadge, PaymentStatusBadge, dateOnly } from "@/components/account/status";
import { ButtonLink } from "@/components/ui/button";
import { requireCustomerPage } from "@/lib/auth/customer";
import { formatPrice } from "@/lib/format";
import { listOrders } from "@/lib/services/customer-account";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const me = await requireCustomerPage("/account/orders");
  const orders = await listOrders(me.id);
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">My account</p>
        <h1 className="mt-3 font-display text-headline font-bold">Order history</h1>
      </header>
      {orders.length === 0 ? (
        <div className="border border-dashed border-line p-10 text-center">
          <p className="text-ink-soft">You have not placed an order while signed in yet.</p>
          <p className="mt-1 text-sm text-muted">Orders made as a guest with this email are added after you verify it.</p>
          <ButtonLink href="/shop" className="mt-5">
            Browse the shop
          </ButtonLink>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const summary = o.items.map((i) => `${i.product_name} × ${i.quantity}`).join(", ");
            return (
              <li key={o.id}>
                <Link href={`/account/orders/${encodeURIComponent(o.order_number)}`} className="block border border-line bg-plate p-5 transition-colors hover:border-indigo">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{o.order_number}</p>
                      <p className="text-sm text-muted">Placed {dateOnly(o.created_at)}</p>
                    </div>
                    <p className="font-semibold tabular-nums">{formatPrice(o.subtotal, o.currency)}</p>
                  </div>
                  <p className="mt-3 line-clamp-1 text-sm text-ink-soft">{summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <OrderStatusBadge status={o.status} />
                    <PaymentStatusBadge status={o.payment_status} method={o.payment_method} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
