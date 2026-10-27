import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import type { ProductCard as Product } from "@/lib/catalogue/queries";
import { formatPrice } from "@/lib/format";
import { QuickAddButton } from "./cart";
import { AddToEnquiryButton } from "./enquiry-list";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const [primary, secondary] = product.images;
  const retail = product.retailEnabled && product.price !== null;
  return (
    <article className="group relative flex flex-col">
      {/* Grey plate: the photos are shot on white, so multiply drops the white and the product sits on the grey.
          Same view-transition name as the product page gallery, so the plate morphs across the navigation. */}
      <ViewTransition name={`product-${product.id}`} share="morph" default="none">
        <div className="relative aspect-[513/655] overflow-hidden rounded-2xl bg-mist transition-colors duration-500 group-hover:bg-[#e8eaf2]">
          {primary ? (
            <>
              <Image
                src={primary.url}
                alt={primary.alt}
                fill
                priority={priority}
                sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
                className={`object-contain cutout transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.05] ${secondary ? "group-hover:opacity-0" : ""}`}
              />
              {secondary && (
                <Image
                  src={secondary.url}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
                  className="object-contain opacity-0 cutout transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.05] group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center font-display font-semibold text-lg text-muted">Image coming soon</div>
          )}
          {(product.quoteEnabled || retail) && (
            // Visible on touch screens, revealed on hover/focus for pointer devices; never the only route to the action.
            <div className="absolute inset-x-3 bottom-3 z-10 transition-[opacity,transform] duration-300 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100">
              <div className="grid gap-1.5">
                {retail && <QuickAddButton product={{ id: product.id, slug: product.slug, name: product.name, image: primary?.url ?? null, price: product.price!, currency: product.currency, sizes: product.sizes }} />}
                {product.quoteEnabled && <AddToEnquiryButton product={{ id: product.id, slug: product.slug, name: product.name }} variant="compact" />}
              </div>
            </div>
          )}
        </div>
      </ViewTransition>
      <div className="mt-3.5 flex flex-1 flex-col px-0.5">
        {product.category && <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-indigo">{product.category.name}</p>}
        <h3 className="mt-1 text-[1.02rem] font-semibold leading-snug tracking-[-0.01em]">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-muted">{[product.fabric, product.sizes.length ? product.sizes.join(" · ") : null].filter(Boolean).join(" — ") || " "}</p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
          {retail && <span className="font-display text-base font-bold tabular-nums">{formatPrice(product.price!, product.currency)}</span>}
          {product.quoteEnabled && <span className="text-xs text-muted">{retail ? "· Bulk: enquire for wholesale price" : "Wholesale price on enquiry"}</span>}
        </p>
      </div>
    </article>
  );
}

/** `reveal` rises each card in as it scrolls into view, staggered across the row. */
export function ProductGrid({ products, priorityCount = 0, reveal = false }: { products: Product[]; priorityCount?: number; reveal?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4 xl:gap-y-14">
      {products.map((p, i) => (
        <li key={p.id} data-reveal={reveal ? "up" : undefined} style={reveal ? { ["--delay" as string]: `${(i % 4) * 90}ms` } : undefined}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
