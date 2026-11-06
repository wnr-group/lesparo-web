import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import type { ProductCard as Product } from "@/lib/catalogue/queries";
import { deptClass } from "@/lib/departments";
import { formatPrice } from "@/lib/format";
import { QuickAddButton } from "./cart";
import { AddToEnquiryButton } from "./enquiry-list";
import { ImagePlaceholder } from "./image-placeholder";

/**
 * Catalogue tile in the style of a modern sportswear store: a tall, softly rounded photograph on a grey plate, the second photo on
 * hover, a pill "Add to cart" that rises over the bottom of the photo on hover (always visible on touch screens), a dot per photo,
 * a two-line name and a bold price. The category is a small chip on the photograph; wholesale enquiry is a round button at the top right.
 * The plate keeps the same view-transition name as the product page gallery, so it morphs across the navigation.
 */
export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const [primary, secondary] = product.images;
  const retail = product.retailEnabled && product.price !== null;
  const sizes = "(min-width: 1536px) 18vw, (min-width: 1280px) 22vw, (min-width: 640px) 30vw, 46vw";
  const buyable = retail ? { id: product.id, slug: product.slug, name: product.name, image: primary?.url ?? null, price: product.price!, currency: product.currency, sizes: product.sizes } : null;
  return (
    <article className="group relative flex h-full flex-col">
      <ViewTransition name={`product-${product.id}`} share="morph" default="none">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[1.25rem] bg-[#eceef5] ring-1 ring-[#e1e4f0] transition-shadow duration-500 group-hover:shadow-[0_22px_40px_-24px_rgb(18_22_76/0.55)]">
          {primary ? (
            <>
              <Image
                src={primary.url}
                alt={primary.alt}
                fill
                priority={priority}
                sizes={sizes}
                className={`object-cover object-center transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04] ${secondary ? "group-hover:opacity-0" : ""}`}
              />
              {secondary && (
                <Image src={secondary.url} alt="" aria-hidden fill sizes={sizes} className="object-cover object-center opacity-0 transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04] group-hover:opacity-100" />
              )}
            </>
          ) : (
            <ImagePlaceholder />
          )}

          {product.category && (
            <span className={`${deptClass(product.category.slug) ?? ""} absolute left-2.5 top-2.5 z-[5] rounded-full bg-white/90 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[var(--dept,var(--color-indigo))] backdrop-blur-sm`}>
              {product.category.name}
            </span>
          )}

          {product.quoteEnabled && (
            <div className="absolute right-2.5 top-2.5 z-10 transition-[opacity,transform] duration-300 [@media(hover:hover)]:translate-x-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-x-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-x-0 [@media(hover:hover)]:group-hover:opacity-100">
              <AddToEnquiryButton product={{ id: product.id, slug: product.slug, name: product.name }} variant="icon" />
            </div>
          )}

          {buyable && (
            // Hover or focus on pointer devices; always visible on touch screens, where there is no hover.
            <div className="absolute inset-x-3 bottom-3 z-10 transition-[opacity,transform] duration-300 [@media(hover:hover)]:translate-y-3 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100">
              <QuickAddButton product={buyable} />
            </div>
          )}
        </div>
      </ViewTransition>

      {product.images.length > 1 && (
        <div aria-hidden className="mt-2.5 flex justify-center gap-1">
          {product.images.slice(0, 4).map((img, i) => (
            <span key={img.url} className={`size-1.5 rounded-full transition-colors duration-300 ${i === 0 ? "bg-indigo-deep group-hover:bg-sand" : i === 1 ? "bg-sand group-hover:bg-indigo-deep" : "bg-sand"}`} />
          ))}
        </div>
      )}

      <div className={`flex flex-1 flex-col px-0.5 ${product.images.length > 1 ? "mt-2" : "mt-3.5"}`}>
        <h3 className="line-clamp-2 min-h-[2.6em] text-[0.95rem] font-semibold leading-[1.3] text-indigo-deep">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            <span className="hline">{product.name}</span>
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-[0.78rem] text-muted">
          {product.fabric ?? product.category?.name ?? "LESPARO"}
          {product.sizes.length > 0 && ` · ${product.sizes.length} sizes`}
        </p>
        <p className="mt-auto flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pt-2.5">
          {retail ? (
            <span className="font-sport text-[1.3rem] font-extrabold tabular-nums tracking-tight text-indigo-deep">{formatPrice(product.price!, product.currency)}</span>
          ) : (
            <span className="text-[0.85rem] font-semibold text-ink-soft">Price on enquiry</span>
          )}
          {product.quoteEnabled && retail && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[0.66rem] font-bold text-success">Bulk rates on enquiry</span>}
        </p>
      </div>
    </article>
  );
}

/** Two columns on phones, three on tablets, four on desktop and wide screens. `reveal` rises each card in (quickly) as it scrolls into view. */
export function ProductGrid({ products, priorityCount = 0, reveal = false }: { products: Product[]; priorityCount?: number; reveal?: boolean }) {
  return (
    <ul className="grid-quick grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 xl:grid-cols-4 xl:gap-x-5 xl:gap-y-10">
      {products.map((p, i) => (
        <li key={p.id} data-reveal={reveal ? "up" : undefined} style={reveal ? { ["--delay" as string]: `${(i % 4) * 90}ms` } : undefined}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
