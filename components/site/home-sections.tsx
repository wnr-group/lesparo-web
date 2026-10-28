import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/site/product-card";
import type { CategoryNode, ProductCard as Product } from "@/lib/catalogue/queries";

/** Soft tints for the big category tiles, one per tile in order (the heading colour is the same hue, deeper). */
const TINTS = [
  { bg: "bg-[#eef3ff]", word: "text-[#b7c4e6]" },
  { bg: "bg-[#fff6e0]", word: "text-[#f3d68f]" },
  { bg: "bg-[#f3f0ff]", word: "text-[#cbc3f0]" },
  { bg: "bg-[#eef0f4]", word: "text-[#c3c8d6]" },
];

/** A row of small round shortcuts, the way a sports store opens its page: quick routes before the big tiles. */
export function TopCollections({ items }: { items: CategoryNode[] }) {
  return (
    <section aria-labelledby="top-collections" className="pt-12 lg:pt-16">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <h2 id="top-collections" className="text-center font-display text-[clamp(1.8rem,1.2rem+2vw,2.8rem)] font-extrabold uppercase tracking-tight text-indigo">
          Top collections
        </h2>
        <ul className="mt-8 flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] sm:justify-center lg:gap-9 [&::-webkit-scrollbar]:hidden">
          {items.map((c) => (
            <li key={c.id} className="shrink-0">
              <Link href={`/collections/${c.slug}`} className="group flex w-24 flex-col items-center gap-3 sm:w-32 lg:w-36">
                <span className="relative size-24 overflow-hidden rounded-full bg-mist ring-1 ring-line transition-[box-shadow,transform] duration-500 ease-[var(--ease-out-soft)] group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-indigo sm:size-32 lg:size-36">
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

/** Four tall tinted tiles: a big faded word, the product standing in front of it, and a Shop Now pill. */
export function ShopByRange({ items }: { items: CategoryNode[] }) {
  return (
    <section aria-label="Shop by range" className="py-12 lg:py-20">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {items.slice(0, 4).map((c, i) => {
            const tint = TINTS[i % TINTS.length];
            return (
              <li key={c.id} data-reveal="up" style={{ ["--delay" as string]: `${i * 90}ms` }}>
                <Link href={`/collections/${c.slug}`} className={`group relative flex aspect-[3/4] flex-col overflow-hidden rounded-[1.6rem] ${tint.bg}`}>
                  <span className={`relative z-0 px-4 pt-4 font-display text-[clamp(1.3rem,0.7rem+2.2vw,2.6rem)] font-extrabold uppercase leading-none tracking-tight sm:px-6 sm:pt-6 ${tint.word}`}>{c.name}</span>
                  {c.coverUrl && (
                    <Image
                      src={c.coverUrl}
                      alt=""
                      fill
                      sizes="(min-width:1024px) 22vw, 46vw"
                      className="cutout z-10 object-contain object-bottom px-[8%] pb-[18%] pt-[22%] transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.06]"
                    />
                  )}
                  <span aria-hidden className="absolute inset-x-0 bottom-0 z-10 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
                  <span className="absolute inset-x-0 bottom-4 z-20 mx-auto w-fit rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink shadow-sm transition-colors duration-300 group-hover:bg-indigo group-hover:text-white">
                    Shop now
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
    <section aria-labelledby="new-launches" className="bg-gradient-to-r from-[#e9e8fb] via-[#fbeef2] to-[#ffeccd] py-12 lg:py-16">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="rotate-[-8deg] rounded-md bg-indigo px-3 py-1.5 text-[0.7rem] font-extrabold uppercase leading-tight tracking-wider text-sun shadow-md">New arrival</span>
            <h2 id="new-launches" className="font-display text-[clamp(1.8rem,1.2rem+2.4vw,3.2rem)] font-extrabold uppercase tracking-tight text-indigo-deep">
              Our new launches
            </h2>
          </div>
          <Link href="/shop?sort=newest" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-indigo hover:text-white">
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
