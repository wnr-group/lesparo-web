import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import type { ProductCard as Product } from "@/lib/catalogue/queries";
import { deptClass } from "@/lib/departments";
import { formatPrice } from "@/lib/format";
import { QuickAddButton } from "./cart";
import { AddToEnquiryButton } from "./enquiry-list";

/**
 * Catalogue tile, photo first: a tall photograph on a cool grey plate (the photos are shot on white, so multiply drops the white
 * and the garment sits on the plate), the category as a tab in the top-left corner in its department's colour, a dot per photo
 * beneath it, then the name, fabric and an athletic italic price. On hover the second photo fades in and two small icon buttons
 * (cart, enquiry) appear at the top-right.
 * The plate keeps the same view-transition name as the product page gallery, so it morphs across the navigation.
 * Sizes and descriptions are deliberately left to the product page, so a row of cards reads at a glance.
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const [primary, secondary] = product.images;
  const retail = product.retailEnabled && product.price !== null;
  const sizes = "(min-width: 1536px) 18vw, (min-width: 1280px) 22vw, (min-width: 640px) 30vw, 46vw";
  return (
    <article className="group relative flex h-full flex-col rounded-[var(--radius-card)] bg-white p-2 shadow-[var(--shadow-card)] ring-1 ring-line transition-[box-shadow,translate] duration-500 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <ViewTransition name={`product-${product.id}`} share="morph" default="none">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-mist">
          {primary ? (
            <>
              <Image
                src={primary.url}
                alt={primary.alt}
                fill
                priority={priority}
                sizes={sizes}
                className={`cutout object-contain p-[2.5%] transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04] ${secondary ? "group-hover:opacity-0" : ""}`}
              />
              {secondary && (
                <Image src={secondary.url} alt="" aria-hidden fill sizes={sizes} className="cutout object-contain p-[2.5%] opacity-0 transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04] group-hover:opacity-100" />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">Image coming soon</div>
          )}
          {product.category && (
            <span className={`${deptClass(product.category.slug) ?? ""} absolute left-0 top-0 z-[5] rounded-br-lg bg-white px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--dept,var(--color-indigo))]`}>
              {product.category.name}
            </span>
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

      <div className="mt-2.5 flex flex-1 flex-col px-1.5 pb-1">
        <h3 className="line-clamp-2 min-h-[2.6em] text-[0.92rem] font-semibold leading-[1.3] tracking-tight text-ink">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            <span className="hline">{product.name}</span>
          </Link>
        </h3>
        {product.fabric && <p className="mt-0.5 truncate text-[0.76rem] text-muted">{product.fabric}</p>}
        {/* Pinned to the bottom of the card, so prices line up across a row whatever the lines above them hold. */}
        <p className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-2.5">
          {retail ? (
            <span className="font-sport text-[1.2rem] font-extrabold italic tabular-nums tracking-tight text-ink">{formatPrice(product.price!, product.currency)}</span>
          ) : (
            <span className="text-[0.8rem] font-semibold text-ink-soft">Price on enquiry</span>
          )}
          {product.quoteEnabled && retail && <span className="text-[0.68rem] font-semibold text-success">Bulk rates on enquiry</span>}
        </p>
      </div>
    </article>
  );
}

/** Two columns on phones, three on tablets, four on desktop and wide screens. `reveal` rises each card in (quickly) as it scrolls into view. */
export function ProductGrid({ products, priorityCount = 0, reveal = false }: { products: Product[]; priorityCount?: number; reveal?: boolean }) {
  return (
    <ul className="grid-quick grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-5">
      {products.map((p, i) => (
        <li key={p.id} data-reveal={reveal ? "up" : undefined} style={reveal ? { ["--delay" as string]: `${(i % 4) * 90}ms` } : undefined}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
