"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { OrderStatusView } from "@/lib/services/payments";
import { useCart } from "./cart";
import { RazorpayPay } from "./razorpay-pay";

/** While a payment is being confirmed, re-read the order every few seconds (up to about two minutes). */
const POLL_MS = 4000;
const POLL_LIMIT = 30;

export function PaymentStatusPanel({ order, token }: { order: OrderStatusView; token: string }) {
  const router = useRouter();
  const cart = useCart();
  const cleared = useRef(false);
  const polls = useRef(0);
  const { paymentStatus: ps, paymentMethod: method } = order;
  const online = method === "razorpay";
  const paid = ps === "paid";

  // The cart is emptied only once the order is genuinely settled (paid) or needs no online payment.
  useEffect(() => {
    if ((paid || !online) && !cleared.current) {
      cleared.current = true;
      cart.clear();
    }
  });

  useEffect(() => {
    if (ps !== "verifying") return;
    const t = setInterval(() => {
      if (++polls.current > POLL_LIMIT) return clearInterval(t);
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [ps, router]);

  const total = formatPrice(order.subtotal, order.currency);
  const summary = (
    <div className="mt-8 border-t border-line pt-6">
      <h2 className="font-display text-lg font-bold">Order summary</h2>
      <ul className="mt-3 divide-y divide-line text-sm">
        {order.items.map((i, n) => (
          <li key={n} className="flex justify-between gap-3 py-2.5">
            <span>
              {i.name}
              <span className="block text-xs text-muted">
                {i.size ? `Size ${i.size} · ` : ""}Qty {i.quantity}
              </span>
            </span>
            <span className="tabular-nums">{formatPrice(i.unitPrice * i.quantity, order.currency)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex justify-between border-t border-line pt-3 font-bold">
        <span>Total</span>
        <span className="tabular-nums">{total}</span>
      </p>
    </div>
  );

  const shell = "mt-10 max-w-xl border border-line bg-paper p-8";
  const links = (
    <div className="mt-6 flex flex-wrap gap-3">
      <ButtonLink href="/shop">Continue shopping</ButtonLink>
      <ButtonLink href="/" variant="secondary">
        Back to home
      </ButtonLink>
    </div>
  );

  if (!online)
    return (
      <div role="status" className={shell}>
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <h2 className="mt-4 font-display text-3xl font-bold">Your order is placed</h2>
        <p className="mt-3 text-ink-soft">
          Order reference <strong className="text-ink">{order.orderNumber}</strong>. We will confirm delivery and payment with you by phone or email.
        </p>
        {summary}
        {links}
      </div>
    );

  if (paid || ps === "refunded")
    return (
      <div role="status" className={shell}>
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <h2 className="mt-4 font-display text-3xl font-bold">{paid ? "Payment received, thank you" : "This order was refunded"}</h2>
        <p className="mt-3 text-ink-soft">
          Order reference <strong className="text-ink">{order.orderNumber}</strong> · {total}. {paid ? "We will confirm delivery details by phone or email." : "The refund returns to your original payment method."}
        </p>
        {summary}
        {links}
      </div>
    );

  if (order.status === "cancelled")
    return (
      <div role="status" className={shell}>
        <XCircle className="size-8 text-danger" aria-hidden />
        <h2 className="mt-4 font-display text-3xl font-bold">This order was cancelled</h2>
        <p className="mt-3 text-ink-soft">
          Order reference <strong className="text-ink">{order.orderNumber}</strong>. Please call us if you think this is a mistake.
        </p>
        {links}
      </div>
    );

  if (ps === "verifying")
    return (
      <div role="status" aria-live="polite" className={shell}>
        <Clock className="size-8 text-indigo" aria-hidden />
        <h2 className="mt-4 font-display text-3xl font-bold">We are confirming your payment</h2>
        <p className="mt-3 text-ink-soft">
          Order reference <strong className="text-ink">{order.orderNumber}</strong>. This usually takes a few seconds and this page updates by itself. If you were charged and it does not confirm, do not pay again: it is reconciled automatically, or call us with this reference.
        </p>
        {summary}
        <button type="button" onClick={() => router.refresh()} className="mt-6 inline-flex h-11 items-center rounded-full border border-ink/20 px-6 text-sm font-semibold hover:bg-white">
          Check again
        </button>
      </div>
    );

  // Pending (not paid yet, or the window was closed) and failed: pay, or pay again, on the same saved order.
  const failed = ps === "failed";
  return (
    <div className={shell}>
      <h2 className="font-display text-3xl font-bold">{failed ? "Your payment did not go through" : "Complete your payment"}</h2>
      <p className="mt-3 text-ink-soft">
        Order reference <strong className="text-ink">{order.orderNumber}</strong>. {failed ? "Nothing was charged for the failed attempt. Try again, or use a different method." : "Your order is saved. Pay now to confirm it."}
      </p>
      {summary}
      <div className="mt-6">
        <RazorpayPay orderNumber={order.orderNumber} token={token} amount={Math.round(order.subtotal * 100)} currency={order.currency} label={failed ? "Try payment again" : "Pay securely"} />
      </div>
    </div>
  );
}
