"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { CheckoutState } from "@/app/(site)/checkout/actions";
import { ButtonLink } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { useCart } from "./cart";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label} <span className="text-danger">*</span>
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const PAYMENTS = [
  ["cod", "Cash on delivery", "Pay when your order arrives."],
  ["online_pending", "Pay online", "We will send you a secure payment link after confirming your order."],
];

export function CheckoutForm({ action }: { action: (s: CheckoutState, fd: FormData) => Promise<CheckoutState> }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as CheckoutState);
  const cart = useCart();
  const [key] = useState(() => crypto.randomUUID());
  const statusRef = useRef<HTMLDivElement>(null);
  const cleared = useRef(false);
  const f = state.status === "error" ? state.fields : {};

  useEffect(() => {
    if (state.status === "success" && !cleared.current) {
      cleared.current = true;
      cart.clear();
    }
    if (state.status !== "idle") statusRef.current?.focus();
  });

  if (state.status === "success")
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="mt-10 max-w-xl border border-line bg-paper p-8 outline-none">
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <h2 className="mt-4 font-display text-3xl font-bold">Thank you, your order is placed</h2>
        <p className="mt-3 text-ink-soft">
          Order reference <strong className="font-bold text-ink">{state.orderNumber}</strong> · {formatPrice(state.subtotal, state.currency)}. We will confirm delivery details and payment with you by phone or email.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/shop">Continue shopping</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Back to home
          </ButtonLink>
        </div>
      </div>
    );

  if (!cart.lines.length)
    return (
      <div className="mt-10 border border-line bg-paper p-8">
        <p className="font-display text-2xl font-bold">Your cart is empty</p>
        <ButtonLink href="/shop" className="mt-5">
          Browse the shop
        </ButtonLink>
      </div>
    );

  const items = JSON.stringify(cart.lines.map((l) => ({ productId: l.productId, size: l.size, quantity: l.quantity })));
  const currency = cart.lines[0].currency;
  const input = "field h-12";

  return (
    <form action={formAction} className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
      <input type="hidden" name="idempotencyKey" value={key} />
      <input type="hidden" name="items" value={items} />
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="space-y-8">
        {state.status === "error" && (
          <div ref={statusRef} tabIndex={-1} role="alert" className="border border-danger/40 bg-danger-soft p-4 text-sm text-danger outline-none">
            {state.message}
          </div>
        )}
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 font-display text-xl font-bold">Contact</legend>
          <Field id="customerName" label="Full name" error={f.customerName}>
            <input id="customerName" name="customerName" autoComplete="name" required className={input} />
          </Field>
          <Field id="phone" label="Phone" error={f.phone}>
            <input id="phone" name="phone" type="tel" autoComplete="tel" required className={input} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="email" label="Email" error={f.email}>
              <input id="email" name="email" type="email" autoComplete="email" required className={input} />
            </Field>
          </div>
        </fieldset>
        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 font-display text-xl font-bold">Delivery address</legend>
          <div className="sm:col-span-2">
            <Field id="addressLine" label="Address" error={f.addressLine}>
              <input id="addressLine" name="addressLine" autoComplete="street-address" required className={input} />
            </Field>
          </div>
          <Field id="city" label="City" error={f.city}>
            <input id="city" name="city" autoComplete="address-level2" required className={input} />
          </Field>
          <Field id="state" label="State" error={f.state}>
            <input id="state" name="state" autoComplete="address-level1" required className={input} />
          </Field>
          <Field id="postcode" label="PIN code" error={f.postcode}>
            <input id="postcode" name="postcode" inputMode="numeric" autoComplete="postal-code" required className={input} />
          </Field>
        </fieldset>
        <fieldset>
          <legend className="mb-4 font-display text-xl font-bold">Payment</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAYMENTS.map(([v, t, d], i) => (
              <label key={v} className="flex cursor-pointer gap-3 border border-sand bg-white p-4 has-[:checked]:border-indigo has-[:checked]:bg-indigo-soft">
                <input type="radio" name="paymentMethod" value={v} defaultChecked={i === 0} className="mt-1 accent-indigo" />
                <span>
                  <span className="block font-semibold">{t}</span>
                  <span className="block text-sm text-muted">{d}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Online card payment is not switched on yet: no payment is taken on this website.</p>
        </fieldset>
        <div>
          <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
            Order notes <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea id="notes" name="notes" rows={3} maxLength={500} className="field" />
        </div>
      </div>

      <aside className="h-fit border border-line bg-paper p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-xl font-bold">Your order</h2>
        <ul className="mt-4 divide-y divide-line text-sm">
          {cart.lines.map((l) => (
            <li key={`${l.productId}:${l.size}`} className="flex justify-between gap-3 py-3">
              <span>
                {l.name}
                <span className="block text-xs text-muted">
                  {l.size ? `Size ${l.size} · ` : ""}Qty {l.quantity}
                </span>
              </span>
              <span className="tabular-nums">{formatPrice(l.price * l.quantity, l.currency)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-line pt-4 font-bold">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatPrice(cart.subtotal, currency)}</span>
        </p>
        <p className="mt-2 text-xs text-muted">Final prices are confirmed from our current price list when your order is placed.</p>
        <button type="submit" disabled={pending} className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-indigo font-semibold text-white transition-colors hover:bg-indigo-deep disabled:opacity-60">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? "Placing order…" : "Place order"}
        </button>
        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/cart" className="underline">
            Back to cart
          </Link>
        </p>
      </aside>
    </form>
  );
}
