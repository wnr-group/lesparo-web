"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import clsx from "clsx";

/**
 * The wholesale "enquiry list": the quote-led equivalent of a cart. Buyers collect
 * products while browsing; the enquiry form starts with them pre-filled. Stored only in
 * this browser (it is a convenience, not an order) and validated again on submission.
 */
export type ListedProduct = { id: string; slug: string; name: string };

const KEY = "lesparo.enquiry-list.v1";
const listeners = new Set<() => void>();
let snapshot: ListedProduct[] = [];
let loaded = false;

function read(): ListedProduct[] {
  if (!loaded) {
    loaded = true;
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      snapshot = Array.isArray(parsed) ? parsed.filter((p) => p && typeof p.id === "string").slice(0, 20) : [];
    } catch {
      snapshot = [];
    }
  }
  return snapshot;
}

function write(next: ListedProduct[]) {
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode): the list still works for this page view.
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

const EMPTY: ListedProduct[] = [];

/** Current list straight from storage (useful in effects that run before hydration settles). */
export function readEnquiryList(): ListedProduct[] {
  return read();
}

export function useEnquiryList() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    items,
    has: (id: string) => items.some((p) => p.id === id),
    add: (p: ListedProduct) => !items.some((i) => i.id === p.id) && write([...items, p].slice(0, 20)),
    remove: (id: string) => write(items.filter((p) => p.id !== id)),
    clear: () => write([]),
  };
}

export function AddToEnquiryButton({ product, variant = "full" }: { product: ListedProduct; variant?: "full" | "compact" }) {
  const list = useEnquiryList();
  const added = list.has(product.id);
  return (
    <button
      type="button"
      onClick={() => (added ? list.remove(product.id) : list.add(product))}
      aria-pressed={added}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-300",
        variant === "full"
          ? "h-13 w-full border border-ink/15 px-6 text-[0.9rem] hover:border-ink hover:bg-ink hover:text-white"
          : "h-9 w-full bg-white/95 px-3 text-[0.78rem] text-ink shadow-[0_8px_20px_-8px_rgb(18_22_76/0.35)] ring-1 ring-line backdrop-blur hover:bg-indigo hover:text-white",
        added && "border-indigo !bg-indigo-soft text-indigo hover:!bg-indigo hover:text-white",
      )}
    >
      {added ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
      {added ? "In your enquiry" : variant === "full" ? "Add to enquiry list" : "Add to enquiry"}
    </button>
  );
}

export function EnquiryListLink({ className }: { className?: string }) {
  const { items } = useEnquiryList();
  return (
    <Link href="/wholesale#enquire" className={className}>
      Enquiry
      {/* Fixed-width counter so the header never shifts when the count changes. */}
      <span
        className={clsx(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.7rem] tabular-nums transition-colors",
          items.length ? "bg-sun font-bold text-ink" : "bg-white/15 text-white/80",
        )}
        aria-label={`${items.length} products in your enquiry list`}
      >
        {items.length}
      </span>
    </Link>
  );
}
