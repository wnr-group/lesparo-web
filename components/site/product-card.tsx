import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import type { ProductCard as Product } from "@/lib/catalogue/queries";
import { formatPrice } from "@/lib/format";
import { Tilt } from "./pointer-fx";
import { QuickAddButton } from "./cart";
import { AddToEnquiryButton } from "./enquiry-list";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const [primary, secondary] = product.images;
  const retail = product.retailEnabled && product.price !== null;
  return (
    <article className="group relative flex h-full flex-col">
      {/* The plate: a soft studio-light gradient, the product standing on a contact shadow, a category tag top left and a
          circular arrow top right. The photos are shot on white, so multiply drops the white and the product sits in the light.
          Same view-transition name as the product page gallery, so the plate morphs across the navigation. */}
      <ViewTransition name={`product-${product.id}`} share="morph" default="none">
        <Tilt className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-[radial-gradient(120%_90%_at_50%_0%,#faf9f5_0%,#efece3_60%,#e6e2d6_100%)] ring-1 ring-ink/[0.06] transition-[box-shadow,--tw-ring-color] duration-500 group-hover:shadow-[0_28px_50px_-28px_rgb(18_20_58/0.35)] group-hover:ring-ink/15">
          {primary ? (
            <>
              {/* Contact shadow under the product. */}
              <span aria-hidden className="absolute inset-x-[22%] bottom-[7%] h-[5%] rounded-[50%] bg-ink/20 blur-xl transition-opacity duration-500 group-hover:opacity-60" />
              <Image
                src={primary.url}
                alt={primary.alt}
                fill
                priority={priority}
                sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
                className={`object-contain p-[7%] cutout transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.05] ${secondary ? "group-hover:opacity-0" : ""}`}
              />
              {secondary && (
                <Image
                  src={secondary.url}
                  alt=""
                  aria-hidden
                  fill
                  sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
                  className="object-contain p-[7%] opacity-0 cutout transition-[opacity,transform] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.05] group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center font-display font-semibold text-lg text-muted">Image coming soon</div>
          )}
          {product.category && (
            <span className="absolute left-3 top-3 z-[6] rounded-full bg-white/80 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ink/80 backdrop-blur">{product.category.name}</span>
          )}
          <span aria-hidden className="absolute right-3 top-3 z-[6] grid size-9 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow-sm transition-[opacity,transform,background-color,color] duration-500 ease-[var(--ease-out-soft)] [@media(hover:hover)]:translate-y-1 group-hover:translate-y-0 group-hover:opacity-100 group-hover:bg-ink group-hover:text-white">
            <ArrowUpRight className="size-4" />
          </span>
          {(product.quoteEnabled || retail) && (
            // Visible on touch screens, revealed on hover/focus for pointer devices; never the only route to the action.
            <div className="absolute inset-x-3 bottom-3 z-10 transition-[opacity,transform] duration-300 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100">
              <div className="grid gap-1.5">
                {retail && <QuickAddButton product={{ id: product.id, slug: product.slug, name: product.name, image: primary?.url ?? null, price: product.price!, currency: product.currency, sizes: product.sizes }} />}
                {product.quoteEnabled && <AddToEnquiryButton product={{ id: product.id, slug: product.slug, name: product.name }} variant="compact" />}
              </div>
            </div>
          )}
        </Tilt>
      </ViewTransition>
      <div className="mt-4 flex flex-1 flex-col px-0.5">
        <h3 className="font-display text-[1.08rem] font-bold leading-snug tracking-tight">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            <span className="hline">{product.name}</span>
          </Link>
        </h3>
        {product.fabric && <p className="mt-0.5 text-[0.82rem] text-muted">{product.fabric}</p>}
        {product.sizes.length > 0 && (
          <ul aria-label="Sizes" className="mt-2.5 flex flex-wrap gap-1">
            {product.sizes.slice(0, 5).map((s) => (
              <li key={s} className="rounded-md border border-ink/12 px-1.5 py-0.5 text-[0.66rem] font-semibold leading-none text-ink-soft">
                {s}
              </li>
            ))}
            {product.sizes.length > 5 && <li className="px-1 py-0.5 text-[0.66rem] font-semibold leading-none text-muted">+{product.sizes.length - 5}</li>}
          </ul>
        )}
        {/* Pinned to the bottom of the card, so prices line up across a row whatever the fabric and size lines above them hold. */}
        <p className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-3">
          {retail && <span className="font-display text-xl font-extrabold tabular-nums tracking-tight">{formatPrice(product.price!, product.currency)}</span>}
          {product.quoteEnabled && (
            <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-[0.68rem] font-semibold text-ink-soft">{retail ? "Bulk on enquiry" : "Wholesale price on enquiry"}</span>
          )}
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
