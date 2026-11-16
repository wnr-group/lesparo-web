import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CategoryItem, CategoryTab } from "@/components/site/shop-by-category";

const PASTELS = ["bg-[#e9f0fb]", "bg-[#fdeaf1]", "bg-[#fff0e4]", "bg-[#e6f4ea]", "bg-[#efe8fa]", "bg-[#fff6d6]"];

function Pic({ item, className, contain = false }: { item: CategoryItem; className?: string; contain?: boolean }) {
  return item.src ? (
    <Image src={item.src} alt="" fill sizes="(min-width:1024px) 20vw, 50vw" className={`${contain ? "object-contain p-4" : "object-cover"} ${className ?? ""}`} />
  ) : (
    <span aria-hidden className="absolute inset-0 flex items-center justify-center font-sport text-5xl font-extrabold italic text-ink/10">{item.name.slice(0, 1)}</span>
  );
}

const Title = ({ children }: { children: string }) => (
  <h2 className="font-sport text-[clamp(1.8rem,1.2rem+2.2vw,3rem)] font-extrabold uppercase italic leading-none tracking-tight text-ink">{children}</h2>
);

/** A: arched cards. One row per audience, arch-topped photos that scroll sideways, name in a pill. */
export function ArchRows({ groups }: { groups: CategoryTab[] }) {
  return (
    <section className="mx-auto max-w-page space-y-12 px-4 py-14 sm:px-6 lg:px-10">
      <Title>Shop by category</Title>
      {groups.map((g) => (
        <div key={g.key}>
          <div className="flex items-baseline justify-between border-b border-ink/15 pb-2">
            <h3 className="font-display text-xl font-bold text-ink">{g.label}</h3>
            <Link href={g.href} className="text-sm font-semibold text-indigo hover:underline">View all</Link>
          </div>
          <ul className="-mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {g.items.map((c, i) => (
              <li key={c.href} className="w-36 shrink-0 snap-start sm:w-44">
                <Link href={c.href} className="group block text-center">
                  <span className={`relative block aspect-[3/4] overflow-hidden rounded-t-full ${PASTELS[i % PASTELS.length]}`}>
                    <Pic item={c} className="transition-transform duration-500 group-hover:scale-105" />
                  </span>
                  <span className="relative -mt-4 inline-block rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-ink shadow-md ring-1 ring-ink/10 transition-colors group-hover:bg-ink group-hover:text-white">{c.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** B: index list. Big typographic rows, one per category; a photo pops out beside the name on hover. */
export function IndexList({ groups }: { groups: CategoryTab[] }) {
  return (
    <section className="bg-ink py-14 text-white">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <h2 className="font-sport text-[clamp(1.8rem,1.2rem+2.2vw,3rem)] font-extrabold uppercase italic leading-none tracking-tight">Shop by category</h2>
        <div className="mt-10 grid gap-x-16 gap-y-10 lg:grid-cols-2">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">{g.label}</p>
              <ul className="mt-3 divide-y divide-white/15 border-y border-white/15">
                {g.items.map((c, i) => (
                  <li key={c.href} className="group relative">
                    <Link href={c.href} className="flex items-center justify-between gap-4 py-3.5 transition-[padding] duration-300 group-hover:pl-3">
                      <span className="flex items-baseline gap-4">
                        <span className="w-6 text-xs tabular-nums text-white/40">{String(i + 1).padStart(2, "0")}</span>
                        <span className="font-sport text-2xl font-extrabold uppercase italic tracking-tight sm:text-3xl">{c.name}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        {c.src && (
                          <span className="relative hidden size-14 overflow-hidden rounded-full bg-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block">
                            <Image src={c.src} alt="" fill sizes="56px" className="object-contain p-1" />
                          </span>
                        )}
                        <ArrowUpRight className="size-5 text-sun transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** C: audience mosaic. One big tile per audience (photo of its first category) with every category as a chip underneath. */
export function AudienceMosaic({ groups }: { groups: CategoryTab[] }) {
  return (
    <section className="mx-auto max-w-page px-4 py-14 sm:px-6 lg:px-10">
      <Title>Shop by category</Title>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {groups.map((g, i) => {
          const hero = g.items.find((c) => c.src);
          return (
            <div key={g.key} className={`flex flex-col overflow-hidden rounded-3xl ${PASTELS[i % PASTELS.length]} ${i < 2 ? "lg:col-span-3" : i < 5 ? "lg:col-span-2" : "lg:col-span-6"}`}>
              <Link href={g.href} className="group relative block aspect-[16/10] overflow-hidden">
                {hero && <Pic item={hero} contain className="transition-transform duration-500 group-hover:scale-105" />}
                <span className="absolute left-4 top-3 font-sport text-4xl font-extrabold uppercase italic leading-none text-ink/85">{g.label}</span>
              </Link>
              <ul className="flex flex-wrap gap-2 p-4">
                {g.items.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} className="inline-block rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:bg-ink hover:text-white">{c.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
