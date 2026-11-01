"use client";

import { useSyncExternalStore } from "react";
import { ProductCard } from "@/components/site/product-card";
import type { ProductCard as Product, ProductImage } from "@/lib/catalogue/queries";

/**
 * What the form currently says, shared between the editor (which writes it on every change) and the card preview (which
 * lives in another column of the page and cannot see the form's state). null = the editor is not mounted.
 */
export type Draft = { name: string; fabric: string; description: string; categoryId: string; price: string; quoteEnabled: boolean; retailEnabled: boolean };

let current: Draft | null = null;
const subscribers = new Set<() => void>();

export function setDraft(next: Draft | null) {
  current = next;
  subscribers.forEach((notify) => notify());
}

const subscribe = (notify: () => void) => {
  subscribers.add(notify);
  return () => void subscribers.delete(notify);
};

/** The product card exactly as the site draws it, updating as the form is edited. Clicks are inert; hover still works. */
export function CardPreview({ initial, images, categories }: { initial: Draft; images: ProductImage[]; categories: { id: string; name: string; slug: string }[] }) {
  const draft = useSyncExternalStore(subscribe, () => current, () => null) ?? initial;
  const category = categories.find((c) => c.id === draft.categoryId) ?? null;
  const price = Number.parseFloat(draft.price);
  const product: Product = {
    id: "preview",
    name: draft.name.trim() || "Product name",
    slug: "preview",
    fabric: draft.fabric.trim() || null,
    sizes: [],
    packing: null,
    description: draft.description.trim() || null,
    quoteEnabled: draft.quoteEnabled,
    retailEnabled: draft.retailEnabled,
    price: draft.retailEnabled && Number.isFinite(price) ? price : null,
    currency: "INR",
    category: category ? { name: category.name, slug: category.slug } : null,
    images,
  };

  return (
    <div>
      <div
        className="mx-auto max-w-[19rem]"
        onClickCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <ProductCard product={product} />
      </div>
      <ul className="mt-4 space-y-1 text-xs text-muted">
        <li>Updates as you edit. Hover the card to see the second photo and the action buttons.</li>
        {images.length === 0 && <li>No photos yet: add images below and they appear here.</li>}
        {images.length === 1 && <li>Add a second photo to get the hover swap.</li>}
        {draft.retailEnabled && !Number.isFinite(price) && <li>Retail is on but no price is set, so the card shows no price.</li>}
        <li>Sizes are not shown on the card; they appear on the product page.</li>
      </ul>
    </div>
  );
}
