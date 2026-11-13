import { ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SplitWords } from "@/components/site/split-words";
import type { PhotoTile } from "@/components/site/home-photos";
import { ProductCard } from "@/components/site/product-card";
import type { ProductCard as Product } from "@/lib/catalogue/queries";

/** Soft background that fills in behind a card on hover; each card in a row gets the next colour. Full class names so Tailwind keeps them. */
const HOVER_TINTS = ["hover:bg-sun-200", "hover:bg-indigo-200", "hover:bg-[#cdeadb]", "hover:bg-[#ffd8c7]", "hover:bg-[#cfe6f6]", "hover:bg-[#e6d5f4]"];
const tint = (i: number) => HOVER_TINTS[i % HOVER_TINTS.length];

/** Section title used by the three home sections: bold sport type with a short accent bar, optionally a link on the right. */
function SectionTitle({ id, children, href, linkLabel }: { id: string; children: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 id={id} className="font-sport text-[clamp(1.8rem,1.2rem+2.2vw,3rem)] font-extrabold uppercase italic leading-none tracking-tight text-ink">
          <SplitWords>{children}</SplitWords>
        </h2>
        <span aria-hidden className="mt-3 block h-1 w-14 rounded-full bg-sun" />
      </div>
      {href && (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-ink underline-offset-4 hover:underline">
          {linkLabel ?? "View all"} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/** "Explore the range": a grid of portrait photo cards, one per garment category, with the name underneath. */
export function TopCollections({ items }: { items: PhotoTile[] }) {
  return (
    <section aria-labelledby="top-collections" className="pt-14 lg:pt-20">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <SectionTitle id="top-collections" href="/collections">Explore the range</SectionTitle>
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-5">
          {items.map((c, i) => (
            <li key={c.name} data-reveal="up" style={{ ["--delay" as string]: `${i * 60}ms` }}>
              <Link href={c.href} className={`group block rounded-3xl p-2 transition-colors duration-500 ${tint(i)}`}>
                <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-mist">
                  <Image src={c.src} alt="" fill sizes="(min-width:1024px) 16vw, (min-width:640px) 30vw, 46vw" className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105" style={{ objectPosition: c.pos }} />
                </span>
                <span className="mt-3 flex items-center justify-between gap-2 px-1 pb-1">
                  <span className="font-display text-base font-bold tracking-tight text-ink sm:text-lg">{c.name}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** "Shop by category": four equal photo cards with the name over the image and a Shop now line beneath. */
export function ShopByRange({ items }: { items: PhotoTile[] }) {
  return (
    <section aria-labelledby="shop-by-category" className="py-14 lg:py-20">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <SectionTitle id="shop-by-category">Shop by category</SectionTitle>
        <ul className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {items.slice(0, 4).map((c, i) => (
            <li key={c.name} data-reveal="up" style={{ ["--delay" as string]: `${i * 80}ms` }}>
              <Link href={c.href} className={`group block rounded-3xl p-2 transition-colors duration-500 ${tint(i + 2)}`}>
                <span className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-night">
                  <Image src={c.src} alt="" fill sizes="(min-width:1024px) 24vw, 48vw" className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105" style={{ objectPosition: c.pos }} />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-4 font-sport text-[clamp(1.3rem,0.9rem+1.4vw,2rem)] font-extrabold uppercase italic leading-none tracking-tight text-white sm:p-5">{c.name}</span>
                </span>
                <span className="mt-3 inline-flex items-center gap-1.5 px-1 pb-1 text-sm font-semibold text-ink">
                  Shop now <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The newest products in a row that scrolls sideways on small screens. */
export function NewLaunches({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <section aria-labelledby="new-launches" className="bg-mist py-14 lg:py-20">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <SectionTitle id="new-launches" href="/shop?sort=newest">Our new launches</SectionTitle>
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
