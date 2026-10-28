import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BrandFilm } from "@/components/site/brand-film";
import { ShopByRange } from "@/components/site/home-sections";
import { getCategoryTree } from "@/lib/catalogue/queries";

export const metadata: Metadata = {
  title: "Collections",
  description: "LESPARO garments for gents and kids, and unstitched fabrics: lungi, kavi, towels and kerchiefs.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const tree = await getCategoryTree();
  const all = tree.flatMap((t) => t.children);
  return (
    <>
      {/* Banner */}
      <section className="mx-auto max-w-page px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8">
        <div className="relative isolate overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-indigo-deep via-indigo to-[#3b4bc0] px-6 py-12 text-white sm:px-12 lg:px-16 lg:py-20">
          <Image src="/lesparo-bird.png" alt="" width={600} height={600} aria-hidden className="pointer-events-none absolute -right-10 top-1/2 -z-10 h-[140%] w-auto -translate-y-1/2 opacity-[0.12]" />
          <p className="eyebrow !text-sun">Collections</p>
          <h1 className="mt-3 max-w-2xl font-display text-[clamp(2.4rem,1.4rem+4vw,5rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
            Shop the <span className="text-sun">whole range</span>
          </h1>
          <p className="mt-5 max-w-lg text-white/75">Gents and kids garments, and woven fabrics from Erode: pick a range, or send us a wholesale enquiry.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="inline-flex h-12 items-center gap-2 rounded-full bg-sun px-6 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5">
              Shop all <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href="/wholesale#enquire" className="inline-flex h-12 items-center rounded-full border border-white/40 px-6 text-sm font-semibold hover:bg-white hover:text-indigo-deep">
              Wholesale enquiry
            </Link>
          </div>
        </div>
      </section>

      <ShopByRange items={all} />

      <BrandFilm compact src="/lesparo-video-1.mp4" title="The LESPARO lookbook" />

      <div className="mx-auto mt-16 max-w-page space-y-16 px-4 pb-20 sm:px-6 lg:px-10">
        {tree.map((top) => (
          <section key={top.id} aria-labelledby={`c-${top.slug}`}>
            <div className="flex items-end justify-between gap-4">
              <h2 id={`c-${top.slug}`} className="font-display text-[clamp(1.8rem,1.2rem+2vw,2.8rem)] font-extrabold uppercase tracking-tight text-indigo">
                {top.name}
              </h2>
              <Link href={`/collections/${top.slug}`} className="inline-flex items-center gap-2 rounded-full bg-mist px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-indigo hover:text-white">
                View all <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {top.children.map((c) => (
                <li key={c.id}>
                  <Link href={`/collections/${c.slug}`} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-mist transition-colors duration-500 group-hover:bg-[#e8eaf2]">
                      {c.coverUrl && <Image src={c.coverUrl} alt="" fill sizes="(min-width:768px) 22vw, 45vw" className="cutout object-contain p-[8%] transition-transform duration-700 group-hover:scale-[1.05]" />}
                    </div>
                    <h3 className="mt-4 font-display text-xl font-bold">{c.name}</h3>
                  </Link>
                  {c.children.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {c.children.map((g) => (
                        <li key={g.id}>
                          <Link href={`/collections/${g.slug}`} className="inline-flex h-8 items-center rounded-full border border-sand px-3 text-xs font-semibold transition-colors hover:border-indigo hover:bg-indigo hover:text-white">
                            {g.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
