import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { shortText } from "@/lib/catalogue/short-text";
import type { ProductCard as Product } from "@/lib/catalogue/queries";
import { formatPrice } from "@/lib/format";
import { QuickAddButton } from "./cart";
import { AddToEnquiryButton } from "./enquiry-list";

/**
 * Catalogue tile: a white card holding a tall photograph on a cool grey plate (the photos are shot on white, so multiply drops
 * the white and the garment sits on the plate), with the category as a tab in the top-left corner, a dot per photo beneath it,
 * and the name, a line of detail and the price below. On hover the second photo fades in and two small icon buttons (cart, enquiry) appear at the top-right.
 * The plate keeps the same view-transition name as the product page gallery, so it morphs across the navigation.
 * Sizes are deliberately not listed here: they live on the product page.
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const [primary, secondary] = product.images;
  const retail = product.retailEnabled && product.price !== null;
  const blurb = shortText(product.description);
  const sizes = "(min-width: 1536px) 18vw, (min-width: 1280px) 22vw, (min-width: 640px) 30vw, 46vw";
  return (
    <article className="group relative flex h-full flex-col rounded-2xl bg-white p-2.5 shadow-[0_1px_2px_rgb(18_22_76/0.05)] ring-1 ring-line transition-shadow duration-500 hover:shadow-[0_22px_44px_-26px_rgb(18_22_76/0.4)]">
      <ViewTransition name={`product-${product.id}`} share="morph" default="none">
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[#f0f1f6] shadow-[0_4px_0_-1px_rgb(18_22_76/0.1)]">
          {primary ? (
            <>
              <Image
                src={primary.url}
                alt={primary.alt}
                fill
                priority={priority}
                sizes={sizes}
                className={`cutout object-contain p-[4%] transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03] ${secondary ? "group-hover:opacity-0" : ""}`}
              />
              {secondary && (
                <Image src={secondary.url} alt="" aria-hidden fill sizes={sizes} className="cutout object-contain p-[4%] opacity-0 transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.03] group-hover:opacity-100" />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">Image coming soon</div>
          )}
          {product.category && (
            <span className="absolute left-0 top-0 z-[5] rounded-br-xl bg-white px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-indigo">{product.category.name}</span>
          )}
          {(retail || product.quoteEnabled) && (
            // Always visible on touch screens; rises on hover or focus for pointer devices. Never the only route to the action.
            <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5 transition-[opacity,transform] duration-300 [@media(hover:hover)]:translate-x-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-x-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-x-0 [@media(hover:hover)]:group-hover:opacity-100">
              {retail && <QuickAddButton product={{ id: product.id, slug: product.slug, name: product.name, image: primary?.url ?? null, price: product.price!, currency: product.currency, sizes: product.sizes }} iconOnly />}
              {product.quoteEnabled && <AddToEnquiryButton product={{ id: product.id, slug: product.slug, name: product.name }} variant="icon" />}
            </div>
          )}
        </div>
      </ViewTransition>

      {product.images.length > 1 && (
        <div aria-hidden className="mt-2 flex justify-center gap-1">
          {product.images.slice(0, 4).map((img, i) => (
            <span key={img.url} className={`size-1.5 rounded-full transition-colors duration-300 ${i === 0 ? "bg-indigo-deep group-hover:bg-sand" : i === 1 ? "bg-sand group-hover:bg-indigo-deep" : "bg-sand"}`} />
          ))}
        </div>
      )}

      <div className="mt-2.5 flex flex-1 flex-col px-1 pb-1">
        <h3 className="line-clamp-2 min-h-[2.6em] font-display text-[0.95rem] font-bold leading-[1.3] tracking-tight">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            <span className="hline">{product.name}</span>
          </Link>
        </h3>
        {product.fabric && <p className="mt-1 truncate text-[0.76rem] text-muted">{product.fabric}</p>}
        {blurb && <p className="mt-1 line-clamp-2 text-[0.74rem] leading-snug text-ink-soft">{blurb}</p>}
        {/* Pinned to the bottom of the card, so prices line up across a row whatever the lines above them hold. */}
        <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2.5">
          {retail ? (
            <span className="font-display text-[1.1rem] font-extrabold tabular-nums tracking-tight text-indigo-deep">{formatPrice(product.price!, product.currency)}</span>
          ) : (
            <span className="text-[0.8rem] font-semibold text-ink-soft">Price on enquiry</span>
          )}
          {product.quoteEnabled && retail && <span className="rounded-md bg-success-soft px-2 py-0.5 text-[0.64rem] font-bold text-success">Bulk orders on enquiry</span>}
        </p>
      </div>
    </article>
  );
}

/** Two columns on phones, three on tablets, four on desktop and wide screens. `reveal` rises each card in as it scrolls into view. */
export function ProductGrid({ products, priorityCount = 0, reveal = false }: { products: Product[]; priorityCount?: number; reveal?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-5">
      {products.map((p, i) => (
        <li key={p.id} data-reveal={reveal ? "up" : undefined} style={reveal ? { ["--delay" as string]: `${(i % 4) * 90}ms` } : undefined}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
