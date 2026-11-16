import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Inbox, MapPin, Package } from "lucide-react";
import { OrderStatusBadge, dateOnly } from "@/components/account/status";
import { ButtonLink } from "@/components/ui/button";
import { requireCustomerPage } from "@/lib/auth/customer";
import { formatPrice } from "@/lib/format";
import { accountSummary } from "@/lib/services/customer-account";

export const metadata: Metadata = { title: "Overview" };

export default async function AccountHome() {
  const me = await requireCustomerPage();
  const s = await accountSummary(me.id);
  const tiles = [
    { href: "/account/orders", label: "Orders", value: s.orders, note: s.openOrders ? `${s.openOrders} in progress` : "None in progress", icon: Package },
    { href: "/account/enquiries", label: "Wholesale enquiries", value: s.enquiries, note: "Submitted while signed in", icon: Inbox },
    { href: "/account/addresses", label: "Saved addresses", value: s.addresses, note: s.addresses ? "Ready for checkout" : "Add your first", icon: MapPin },
  ];
  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow">My account</p>
        <h1 className="mt-3 font-display text-headline font-bold">Hello, {me.name.split(" ")[0]}</h1>
        <p className="mt-2 text-ink-soft">Here is what is happening with your orders and enquiries.</p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-3">
        {tiles.map(({ href, label, value, note, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="group block h-full border border-line bg-plate p-5 transition-colors hover:border-indigo">
              <Icon className="size-5 text-indigo" aria-hidden />
              <p className="mt-4 font-display text-4xl font-bold tabular-nums">{value}</p>
              <p className="mt-1 text-sm font-semibold">{label}</p>
              <p className="mt-0.5 text-xs text-muted">{note}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="latest-order">
        <h2 id="latest-order" className="font-display text-2xl font-bold">
          Latest order
        </h2>
        {s.recent ? (
          <Link href={`/account/orders/${encodeURIComponent(s.recent.order_number)}`} className="mt-4 flex flex-wrap items-center justify-between gap-4 border border-line bg-plate p-5 transition-colors hover:border-indigo">
            <div>
              <p className="font-semibold">{s.recent.order_number}</p>
              <p className="text-sm text-muted">Placed {dateOnly(s.recent.created_at)}</p>
            </div>
            <div className="flex items-center gap-4">
              <OrderStatusBadge status={s.recent.status} />
              <span className="font-semibold tabular-nums">{formatPrice(s.recent.subtotal, s.recent.currency)}</span>
              <ArrowRight className="size-4" aria-hidden />
            </div>
          </Link>
        ) : (
          <div className="mt-4 border border-dashed border-line p-8 text-center">
            <p className="text-ink-soft">No orders yet. Orders you place while signed in appear here.</p>
            <ButtonLink href="/shop" className="mt-4">
              Start shopping
            </ButtonLink>
          </div>
        )}
      </section>
    </div>
  );
}
