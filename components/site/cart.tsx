"use client";

import clsx from "clsx";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { useId, useState, useSyncExternalStore } from "react";

/**
 * The retail (B2C) cart. Wholesale buyers use the enquiry list instead (enquiry-list.tsx); the two are
 * deliberately separate. Stored only in this browser. Prices kept here are for display: checkout
 * re-reads every price from the database, so editing localStorage cannot change what is charged.
 */
export type CartLine = { productId: string; slug: string; name: string; image: string | null; size: string | null; price: number; currency: string; quantity: number };

const KEY = "lesparo.cart.v1";
export const MAX_QTY = 20;
const listeners = new Set<() => void>();
let snapshot: CartLine[] = [];
let loaded = false;

const sameLine = (a: Pick<CartLine, "productId" | "size">, b: Pick<CartLine, "productId" | "size">) => a.productId === b.productId && a.size === b.size;

function read(): CartLine[] {
  if (!loaded) {
    loaded = true;
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      snapshot = Array.isArray(parsed)
        ? parsed
            .filter((l) => l && typeof l.productId === "string" && typeof l.price === "number" && Number.isInteger(l.quantity) && l.quantity > 0)
            .map((l) => ({ ...l, quantity: Math.min(MAX_QTY, l.quantity) }))
            .slice(0, 30)
        : [];
    } catch {
      snapshot = [];
    }
  }
  return snapshot;
}

function write(next: CartLine[]) {
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode): the cart still works for this page view.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      loaded = false;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: CartLine[] = [];


export function useCart() {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.price * l.quantity, 0),
    add: (line: CartLine) => {
      const current = read();
      const i = current.findIndex((l) => sameLine(l, line));
      if (i < 0) write([...current, { ...line, quantity: Math.min(MAX_QTY, line.quantity) }].slice(0, 30));
      else write(current.map((l, j) => (j === i ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + line.quantity), price: line.price } : l)));
    },
    setQuantity: (line: Pick<CartLine, "productId" | "size">, quantity: number) =>
      write(read().map((l) => (sameLine(l, line) ? { ...l, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : l))),
    remove: (line: Pick<CartLine, "productId" | "size">) => write(read().filter((l) => !sameLine(l, line))),
    clear: () => write([]),
  };
}

export function CartLink({ className }: { className?: string }) {
  const { count } = useCart();
  return (
    <Link href="/cart" className={className} aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
      <ShoppingBag className="size-[1.15rem]" aria-hidden />
      {/* Fixed-size badge so the header never shifts when the count changes. */}
      <span aria-hidden className={clsx("inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.7rem] font-bold tabular-nums", count ? "bg-sun text-ink" : "bg-line text-muted")}>
        {count}
      </span>
    </Link>
  );
}

export type BuyableProduct = { id: string; slug: string; name: string; image: string | null; price: number; currency: string; sizes: string[] };

/** Product page purchase box: size, quantity, Add to cart and Buy now. */
export function RetailPurchase({ product }: { product: BuyableProduct }) {
  const cart = useCart();
  const router = useRouter();
  const uid = useId();
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0] : null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  const line = (): CartLine | null => {
    if (product.sizes.length && !size) {
      setError("Choose a size first.");
      return null;
    }
    setError("");
    return { productId: product.id, slug: product.slug, name: product.name, image: product.image, size, price: product.price, currency: product.currency, quantity };
  };

  return (
    <div id="buy" className="scroll-mt-28">
      {product.sizes.length > 0 && (
        <fieldset>
          <legend className="flex w-full items-baseline justify-between text-sm font-medium">
            <span>
              Size <span className="text-danger">*</span>
            </span>
            {size && <span className="text-muted">{size}</span>}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <label key={s} className="relative">
                <input type="radio" name={`${uid}-size`} value={s} checked={size === s} onChange={() => (setSize(s), setError(""))} className="peer sr-only" />
                <span className="flex h-11 min-w-[3.25rem] cursor-pointer items-center justify-center rounded-md border border-sand bg-white px-4 text-sm font-medium transition-[border-color,background-color,color] duration-200 hover:border-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo">
                  {s}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <div role="group" aria-label="Quantity" className="inline-flex h-12 items-center rounded-md border border-sand bg-white">
          <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="grid size-12 place-items-center rounded-md transition-colors hover:bg-paper disabled:opacity-40">
            <Minus className="size-4" aria-hidden />
          </button>
          <span aria-live="polite" className="w-8 text-center font-semibold tabular-nums">
            {quantity}
          </span>
          <button type="button" aria-label="Increase quantity" disabled={quantity >= MAX_QTY} onClick={() => setQuantity((q) => Math.min(MAX_QTY, q + 1))} className="grid size-12 place-items-center rounded-md transition-colors hover:bg-paper disabled:opacity-40">
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <p className="text-sm text-muted">
          Total <span className="font-display text-lg font-bold tabular-nums text-ink">{formatPrice(product.price * quantity, product.currency)}</span>
        </p>
      </div>

      <div className="mt-5 grid gap-2.5">
        <button
          type="button"
          onClick={() => {
            const l = line();
            if (!l) return;
            cart.add(l);
            setJustAdded(true);
            window.setTimeout(() => setJustAdded(false), 2200);
          }}
          className="inline-flex h-13 items-center justify-center gap-2 rounded-md bg-indigo px-6 text-[0.9rem] font-semibold text-white transition-[background-color,transform] duration-300 hover:bg-indigo-deep active:scale-[0.99]"
        >
          {justAdded ? <Check className="size-4" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
          {justAdded ? "Added to cart" : "Add to cart"}
        </button>
        <button
          type="button"
          onClick={() => {
            const l = line();
            if (!l) return;
            cart.add(l);
            router.push("/checkout");
          }}
          className="inline-flex h-13 items-center justify-center rounded-md border border-ink px-6 text-[0.9rem] font-semibold text-ink transition-[background-color,color,transform] duration-300 hover:bg-ink hover:text-white active:scale-[0.99]"
        >
          Buy now
        </button>
      </div>
      <p className="sr-only" role="status">
        {justAdded ? `${product.name} added to your cart` : ""}
      </p>
    </div>
  );
}

/** Compact card action: adds straight to the cart; a product with several sizes opens its page at the size picker, since an item cannot be added without one. */
export function QuickAddButton({ product, iconOnly = false }: { product: BuyableProduct; iconOnly?: boolean }) {
  const cart = useCart();
  const [done, setDone] = useState(false);
  const cls = iconOnly
    ? "grid size-9 place-items-center rounded-full bg-white text-ink shadow-[0_6px_16px_-6px_rgb(18_22_76/0.45)] ring-1 ring-line transition-colors hover:bg-indigo hover:text-white"
    : "inline-flex h-9 w-full items-center justify-center gap-2 rounded-full bg-indigo px-3 text-[0.78rem] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(18_22_76/0.45)] transition-colors hover:bg-indigo-deep";
  if (product.sizes.length > 1)
    return (
      <Link href={`/products/${product.slug}#buy`} className={cls} aria-label={iconOnly ? `Add ${product.name} to cart: pick a size` : undefined} title={iconOnly ? "Add to cart" : undefined}>
        <ShoppingBag className="size-4" aria-hidden />
        {!iconOnly && " Add to cart"}
      </Link>
    );
  return (
    <button
      type="button"
      className={cls}
      aria-label={iconOnly ? `Add ${product.name} to cart` : undefined}
      title={iconOnly ? "Add to cart" : undefined}
      onClick={() => {
        cart.add({ productId: product.id, slug: product.slug, name: product.name, image: product.image, size: product.sizes[0] ?? null, price: product.price, currency: product.currency, quantity: 1 });
        setDone(true);
        window.setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? <Check className="size-4" aria-hidden /> : <ShoppingBag className="size-4" aria-hidden />}
      {!iconOnly && (done ? "Added" : "Add to cart")}
    </button>
  );
}
