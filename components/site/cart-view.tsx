"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { MAX_QTY, useCart } from "./cart";

export function CartView() {
  const cart = useCart();
  if (!cart.lines.length)
    return (
      <div className="mt-10 flex flex-col items-start gap-5 border border-line bg-paper p-8 sm:p-12">
        <ShoppingBag className="size-8 text-indigo" aria-hidden />
        <p className="font-display text-2xl font-bold">Your cart is empty</p>
        <p className="max-w-md text-ink-soft">Browse the range and add what you like. Buying for a shop or showroom? Use a wholesale enquiry for bulk pricing instead.</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/shop">Browse the shop</ButtonLink>
          <ButtonLink href="/wholesale#enquire" variant="secondary">
            Wholesale enquiry
          </ButtonLink>
        </div>
      </div>
    );

  const currency = cart.lines[0].currency;
  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
      <ul className="divide-y divide-line border-y border-line">
        {cart.lines.map((l) => (
          <li key={`${l.productId}:${l.size}`} className="grid grid-cols-[5.5rem_1fr] gap-4 py-5 sm:grid-cols-[7rem_1fr_auto] sm:gap-6">
            <Link href={`/products/${l.slug}`} className="relative aspect-[513/655] bg-mist">
              {l.image && <Image src={l.image} alt="" fill sizes="112px" className="cutout object-contain" />}
            </Link>
            <div className="min-w-0">
              <Link href={`/products/${l.slug}`} className="font-display text-lg font-bold leading-tight hover:underline">
                {l.name}
              </Link>
              <p className="mt-1 text-sm text-muted">
                {l.size ? `Size ${l.size} · ` : ""}
                {formatPrice(l.price, l.currency)} each
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div role="group" aria-label={`Quantity for ${l.name}`} className="inline-flex h-10 items-center rounded-full border border-sand bg-white">
                  <button type="button" aria-label="Decrease quantity" disabled={l.quantity <= 1} onClick={() => cart.setQuantity(l, l.quantity - 1)} className="grid size-10 place-items-center rounded-full hover:bg-paper disabled:opacity-40">
                    <Minus className="size-3.5" aria-hidden />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold tabular-nums">{l.quantity}</span>
                  <button type="button" aria-label="Increase quantity" disabled={l.quantity >= MAX_QTY} onClick={() => cart.setQuantity(l, l.quantity + 1)} className="grid size-10 place-items-center rounded-full hover:bg-paper disabled:opacity-40">
                    <Plus className="size-3.5" aria-hidden />
                  </button>
                </div>
                <button type="button" onClick={() => cart.remove(l)} className="inline-flex h-10 items-center gap-1.5 px-2 text-sm text-muted hover:text-danger">
                  <Trash2 className="size-4" aria-hidden /> Remove
                </button>
              </div>
            </div>
            <p className="col-span-2 text-right font-display text-lg font-bold tabular-nums sm:col-span-1">{formatPrice(l.price * l.quantity, l.currency)}</p>
          </li>
        ))}
      </ul>
      <aside className="h-fit border border-line bg-paper p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-xl font-bold">Order summary</h2>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Items ({cart.count})</dt>
            <dd className="tabular-nums">{formatPrice(cart.subtotal, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd>Confirmed after order</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-4 text-base font-bold">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(cart.subtotal, currency)}</dd>
          </div>
        </dl>
        <ButtonLink href="/checkout" size="lg" className="mt-6 w-full justify-center">
          Checkout
        </ButtonLink>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Prices shown are retail prices. Buying in bulk for resale?{" "}
          <Link href="/wholesale#enquire" className="underline">
            Request wholesale pricing
          </Link>
          .
        </p>
      </aside>
    </div>
  );
}
