import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PaymentStatusPanel } from "@/components/site/payment-status";
import { Container } from "@/components/ui/primitives";
import { getOrderStatusView } from "@/lib/services/payments";

// The URL carries the buyer's private token: keep it out of search results and out of Referer headers.
export const metadata: Metadata = { title: "Order status", robots: { index: false, follow: false }, referrer: "no-referrer" };

async function Status({ searchParams }: { searchParams: PageProps<"/checkout/status">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const orderNumber = typeof sp.o === "string" ? sp.o : "";
  const token = typeof sp.t === "string" ? sp.t : "";
  const order = orderNumber && token ? await getOrderStatusView(orderNumber, token) : null;
  if (!order) {
    return (
      <div className="mt-10 max-w-xl border border-line bg-paper p-8">
        <p className="font-display text-2xl font-bold">We could not find that order</p>
        <p className="mt-3 text-ink-soft">The link may be incomplete. Please use the link shown right after checkout, or call us with your order number.</p>
      </div>
    );
  }
  return <PaymentStatusPanel order={order} token={token} />;
}

export default function CheckoutStatusPage(props: PageProps<"/checkout/status">) {
  return (
    <Container className="py-12 lg:py-16">
      <p className="eyebrow">Retail</p>
      <h1 className="mt-3 font-display text-headline font-bold">Order status</h1>
      <Suspense fallback={<div className="mt-10 h-48 max-w-xl animate-pulse bg-paper" />}>
        <Status searchParams={props.searchParams} />
      </Suspense>
    </Container>
  );
}
