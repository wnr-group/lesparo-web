import { ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { photoFor } from "@/components/site/collection-banner";
import { ProductCard } from "@/components/site/product-card";
import type { CategoryNode, ProductCard as Product } from "@/lib/catalogue/queries";

/** A row of small round shortcuts, the way a sports store opens its page: quick routes before the big tiles. */
export function TopCollections({ items }: { items: CategoryNode[] }) {
  return (
    <section aria-labelledby="top-collections" className="pt-12 lg:pt-16">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <h2 id="top-collections" className="text-center font-display text-[clamp(1.8rem,1.2rem+2vw,2.8rem)] font-extrabold uppercase tracking-tight text-ink">
          Top collections
        </h2>
        <ul className="mt-8 flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] sm:justify-center lg:gap-9 [&::-webkit-scrollbar]:hidden">
          {items.map((c) => (
            <li key={c.id} className="shrink-0">
              <Link href={`/collections/${c.slug}`} className="group flex w-24 flex-col items-center gap-3 sm:w-32 lg:w-36">
                <span className="relative size-24 overflow-hidden rounded-full bg-mist ring-1 ring-line transition-[box-shadow,transform] duration-500 ease-[var(--ease-out-soft)] group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-ink sm:size-32 lg:size-36">
                  {c.coverUrl && <Image src={c.coverUrl} alt="" fill sizes="144px" className="cutout object-contain p-[12%] transition-transform duration-700 group-hover:scale-110" />}
                </span>
                <span className="text-center text-[0.82rem] font-semibold leading-tight text-ink sm:text-sm">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * A bento grid: one large photo card and three smaller ones. Garment ranges use the studio photographs full-bleed;
 * fabric ranges (no model photo) show the product on a solid colour. Titles sit over the image, no borders or tints.
 */
export function ShopByRange({ items }: { items: CategoryNode[] }) {
  const solid = ["bg-[#e4e0d3] text-ink", "bg-[#d3d9cf] text-ink", "bg-[#ddd2c4] text-ink"];
  let solidIndex = 0;
  const layout = ["col-span-2 aspect-[4/3] lg:row-span-2 lg:aspect-auto", "col-span-2 aspect-[16/9] lg:aspect-auto", "aspect-square lg:aspect-auto", "aspect-square lg:aspect-auto"];
  return (
    <section aria-label="Shop by range" className="py-12 lg:py-20">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <ul className="grid grid-cols-2 gap-3 lg:h-[min(46rem,82vh)] lg:grid-cols-4 lg:grid-rows-2 lg:gap-4">
          {items.slice(0, 4).map((c, i) => {
            const garment = /gents|garments/.test(c.slug);
            const photo = photoFor(c.slug);
            const tone = garment ? "bg-[#22231f] text-white" : solid[solidIndex++ % solid.length];
            return (
              <li key={c.id} data-reveal="up" style={{ ["--delay" as string]: `${i * 90}ms` }} className={layout[i]}>
                <Link href={`/collections/${c.slug}`} className={`group relative block h-full w-full overflow-hidden ${tone}`}>
                  {garment ? (
                    <Image src={photo.src} alt="" fill sizes={i === 0 ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 50vw, 100vw"} className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.05]" style={{ objectPosition: photo.pos }} />
                  ) : (
                    c.coverUrl && <Image src={c.coverUrl} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className={`cutout object-contain transition-transform ${i === 1 ? "p-[3%] pb-[18%]" : "p-[14%] pb-[26%]"}  duration-[900ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.07]`} />
                  )}
                  {garment && <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />}
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-6">
                    <span className="font-display text-[clamp(1.4rem,0.8rem+2vw,2.8rem)] font-extrabold uppercase leading-none tracking-tight">{c.name}</span>
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:rotate-45 group-hover:bg-[#d9d2c1] sm:size-12">
                      <ArrowUpRight className="size-5" aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** A tinted band with a bold heading and a row of the newest products that scrolls sideways. */
export function NewLaunches({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <section aria-labelledby="new-launches" className="bg-[#efe8da] py-12 lg:py-16">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="rotate-[-8deg] rounded-md bg-ink px-3 py-1.5 text-[0.7rem] font-extrabold uppercase leading-tight tracking-wider text-white shadow-md">New arrival</span>
            <h2 id="new-launches" className="font-display text-[clamp(1.8rem,1.2rem+2.4vw,3.2rem)] font-extrabold uppercase tracking-tight text-ink">
              Our new launches
            </h2>
          </div>
          <Link href="/shop?sort=newest" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-ink hover:text-white">
            View all <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:gap-5 lg:px-0 [&::-webkit-scrollbar]:hidden">
          {products.map((p) => (
            <li key={p.id} className="w-[62%] shrink-0 snap-start sm:w-[34%] lg:w-[calc((100%-3.75rem)/4)]">
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
