import { ArrowRight, ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProductGrid } from "@/components/site/product-card";
import { ButtonLink } from "@/components/ui/button";
import { BUSINESS } from "@/lib/business";
import type { HomeData } from "@/lib/home-data";
import { ClothCanvas } from "./cloth-canvas";
import "./cloth.css";

const MILESTONES = [
  ["1979", "R. Yuvaraj, Erode", "Mr. Yuvaraj founds R. Yuvaraj in Erode, supplying lungis, dhoties and mull cloth to Kerala."],
  ["1999", "The next generation", "His son, Y. Sathish, joins as a trainee and takes a leading role in the company’s growth."],
  ["2001", "Y. Sathish & Co.", "Churidar materials, Kerala special dhoties and sarees for showrooms in Kerala and Tamil Nadu."],
  ["2017", "Abija Exports and LESPARO", "Knitted and woven casual wear for gents and kids: shorts, 3/4th pants and track suits."],
];
/** Header strip of each swatch: a different check, like three cloths pinned to a board. */
const STRIPS = [
  "bg-[repeating-linear-gradient(90deg,#262e86_0_14px,#f3eee3_14px_28px)]",
  "bg-[repeating-linear-gradient(135deg,#262e86_0_6px,#f3eee3_6px_14px)]",
  "bg-[linear-gradient(90deg,#f3eee3_0_30%,#262e86_30%_36%,#ffc82c_36%_40%,#262e86_40%_46%,#f3eee3_46%)]",
];
const TILT = ["-rotate-[1.4deg]", "rotate-[1deg]", "-rotate-[0.8deg]"];

/** `hero` replaces the default cloth hero, so any other hero can be dropped in with one prop. */
export function Home3D({ content, garments, fabrics, featured, panelImages, sections, hero: heroOverride }: HomeData & { sections: HomeData["content"]["sections"]; hero?: ReactNode }) {
  const hero = heroOverride;
  const { hero: copy } = content;
  const swatches = [
    ...garments.slice(0, 2).map((g) => ({ cat: g, items: g.children, image: panelImages[g.id] ?? g.coverUrl })),
    ...(fabrics ? [{ cat: fabrics, items: fabrics.children, image: null as string | null }] : []),
  ];

  return (
    <>
      {/* ================================================================ hero: a length of cloth */}
      {hero ?? (
        <section aria-labelledby="hero-heading" className="relative isolate h-[calc(100svh-var(--hdr))] min-h-[34rem] overflow-hidden text-indigo-deep">
          <div aria-hidden className="h3-check absolute inset-0 -z-10" />
          <ClothCanvas />
          {/* Keeps the type readable over the check without hiding the cloth. */}
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top_right,rgb(243_238_227/0.96),rgb(243_238_227/0.82)_45%,rgb(243_238_227/0.25)_85%)]" />

          <div className="relative mx-auto flex h-full max-w-page flex-col justify-end px-4 pb-16 sm:px-6 lg:px-10 lg:pb-20">
            <p className="h3-in eyebrow" style={{ ["--d" as string]: 0 }}>
              {copy.eyebrow || "Abija Exports · Erode, Tamil Nadu"}
            </p>
            <h1 id="hero-heading" className="h3-in mt-5 max-w-[15ch] font-display text-[clamp(3rem,1.4rem+7vw,9rem)] font-extrabold leading-[0.9] tracking-[-0.05em]" style={{ ["--d" as string]: 1 }}>
              {copy.heading}
            </h1>
            <p className="h3-in mt-7 max-w-lg text-lg leading-relaxed text-indigo-deep/80" style={{ ["--d" as string]: 2 }}>
              {copy.subheading}
            </p>
            <div className="h3-in mt-9 flex flex-wrap items-center gap-3" style={{ ["--d" as string]: 3 }}>
              <ButtonLink href={copy.primaryCta.href} size="lg">
                {copy.primaryCta.label} <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href={copy.secondaryCta.href} variant="secondary" size="lg">
                {copy.secondaryCta.label}
              </ButtonLink>
            </div>
          </div>
          <p aria-hidden className="h3-hint absolute right-6 top-6 hidden rounded-full bg-white/85 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-indigo-deep md:block lg:right-10">
            Move the pointer to catch the light
          </p>
          <div aria-hidden className="h3-pinked absolute inset-x-0 bottom-0 bg-white" />
        </section>
      )}

      {/* ============================================================ swatch board */}
      {sections.categories && swatches.length > 0 && (
        <section aria-labelledby="swatch-heading" className="bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
            <p data-reveal="up" className="eyebrow">
              The range
            </p>
            <h2 id="swatch-heading" data-reveal="mask" className="mt-4 max-w-4xl font-display text-[clamp(2.4rem,1.2rem+4.6vw,5.8rem)] font-extrabold leading-[0.93] tracking-[-0.05em]">
              From the cloth, to the cut.
            </h2>
            <ul className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6 lg:mt-20">
              {swatches.map((s, i) => (
                <li key={s.cat.id} data-reveal="up" style={{ ["--delay" as string]: `${i * 120}ms` }}>
                  <article className={`h3-swatch ${TILT[i % 3]} overflow-hidden bg-[#faf8f3] shadow-[0_30px_50px_-30px_rgb(18_22_76/0.4)] ring-1 ring-indigo/10`}>
                    <div aria-hidden className={`h-16 ${STRIPS[i % 3]}`} />
                    <div className="h3-pinked-top -mt-px bg-white" aria-hidden />
                    <Link href={`/collections/${s.cat.slug}`} className="group relative block aspect-[4/5]">
                      {s.image ? (
                        <Image src={s.image} alt={`${s.cat.name} by LESPARO`} fill sizes="(min-width:768px) 30vw, 90vw" className="cutout object-contain object-bottom p-4 transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]" />
                      ) : (
                        <div className="absolute inset-0 grid grid-cols-2 gap-3 p-6">
                          {s.items.slice(0, 4).map((c) => (
                            <div key={c.id} className="relative">
                              {c.coverUrl && <Image src={c.coverUrl} alt={c.name} fill sizes="(min-width:768px) 14vw, 40vw" className="cutout object-contain" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </Link>
                    <div className="border-t border-dashed border-indigo/25 p-6">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-display text-3xl font-extrabold tracking-[-0.035em]">{s.cat.name}</h3>
                        <Link href={`/collections/${s.cat.slug}`} aria-label={`Explore ${s.cat.name}`} className="grid size-10 place-items-center rounded-full bg-indigo text-white">
                          <ArrowUpRight className="size-4" aria-hidden />
                        </Link>
                      </div>
                      <p className="mt-3 text-sm text-ink-soft">{s.items.map((c) => c.name).join(" · ")}</p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ============================================================ product discovery */}
      {sections.products && featured.length > 0 && (
        <section aria-labelledby="pick-heading" className="bg-[#f4f5ff] py-20 lg:py-28">
          <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p data-reveal="up" className="eyebrow">
                  Pick a piece
                </p>
                <h2 id="pick-heading" data-reveal="mask" className="mt-4 max-w-3xl font-display text-[clamp(2.2rem,1.2rem+4vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
                  Everyday wear, priced to buy.
                </h2>
              </div>
              <p data-reveal="up" className="max-w-sm text-sm leading-relaxed text-ink-soft">
                Retail prices are shown on each piece. Buying for a shop? Each has an Enquire option for wholesale pricing.
              </p>
            </div>
            <div className="mt-12">
              <ProductGrid products={featured.slice(0, 8)} priorityCount={0} reveal />
            </div>
            <div className="mt-12 flex justify-center">
              <ButtonLink href="/shop" size="lg">
                Shop all products <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================ the thread of history */}
      {sections.story && (
        <section aria-labelledby="thread-heading" className="bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
            <p data-reveal="up" className="eyebrow">
              Heritage
            </p>
            <h2 id="thread-heading" data-reveal="mask" className="mt-4 max-w-4xl font-display text-[clamp(2.2rem,1.2rem+4vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
              {content.story.approved ? content.story.heading : "Four decades of textiles from Erode."}
            </h2>
            {content.story.approved && (
              <p data-reveal="up" className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
                {content.story.body}
              </p>
            )}
            <div className="h3-thread relative mt-14 lg:mt-20">
              <svg aria-hidden viewBox="0 0 1200 60" preserveAspectRatio="none" className="absolute left-0 top-0 hidden h-12 w-full lg:block">
                <path d="M0 30 C 150 0, 250 60, 400 30 S 650 0, 800 30 S 1050 60, 1200 30" pathLength={1} fill="none" stroke="#262e86" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
              <ol className="grid gap-10 lg:grid-cols-4 lg:gap-8 lg:pt-16">
                {MILESTONES.map(([y, t, d], i) => (
                  <li key={y} data-reveal="up" style={{ ["--delay" as string]: `${i * 100}ms` }} className="relative border-l-2 border-indigo/20 pl-6 lg:border-l-0 lg:pl-0">
                    <span aria-hidden className="absolute -left-[7px] top-2 size-3 rounded-full bg-indigo lg:-top-[3.1rem] lg:left-0" />
                    <p className="font-display text-[clamp(3.4rem,2.2rem+3vw,5.2rem)] font-extrabold leading-[0.85] tracking-[-0.06em] text-indigo">{y}</p>
                    <h3 className="mt-4 font-display text-xl font-bold tracking-tight">{t}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p>
                  </li>
                ))}
              </ol>
            </div>
            <ButtonLink href="/about" variant="secondary" className="mt-12">
              Read the full story <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </section>
      )}

      {/* ============================================================ quality */}
      <section aria-labelledby="quality-heading" className="bg-[#f4f5ff] py-16 lg:py-24">
        <div className="mx-auto grid max-w-page gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10">
          <div className="lg:col-span-5">
            <p data-reveal="up" className="eyebrow">
              Quality promise
            </p>
            <h2 id="quality-heading" data-reveal="mask" className="mt-4 font-display text-[clamp(2rem,1.2rem+3.2vw,4rem)] font-extrabold leading-[0.97] tracking-[-0.045em]">
              Made to be worn, <span className="text-indigo">and trusted.</span>
            </h2>
          </div>
          <ul data-reveal="stagger" className="grid gap-6 sm:grid-cols-2 lg:col-span-7">
            {[
              { icon: ShieldCheck, title: "Quality policy", text: "We commit to the agreed requirement, details and price, and to customer satisfaction through quality procedures that meet or exceed international standards." },
              { icon: RefreshCw, title: "Replacement policy", text: "Our replacement policy speaks to our quality assurance: we make every effort to meet international quality, to a high standard of quality parameters." },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="border-t-2 border-indigo pt-5">
                <Icon className="size-6 text-indigo" aria-hidden />
                <h3 className="mt-3 font-display text-xl font-bold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================ hang tags: retail and wholesale */}
      {sections.wholesale && (
        <section aria-labelledby="tags-heading" className="bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
            <p data-reveal="up" className="eyebrow">
              How to buy
            </p>
            <h2 id="tags-heading" data-reveal="mask" className="mt-4 max-w-4xl font-display text-[clamp(2.2rem,1.2rem+4vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
              Two tags on every piece: <span className="text-indigo">buy it, or supply it.</span>
            </h2>
            <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-2">
              {[
                { tag: "Retail", title: "Buy online", text: "See the price, choose your size, then Add to cart or Buy now. Orders are confirmed by our team before dispatch.", href: "/shop", label: "Shop the range", primary: true },
                { tag: "Wholesale", title: "Enquire for bulk pricing", text: "Showrooms, chain stores and wholesalers across Tamil Nadu, Kerala and Karnataka: tell us what you need and we will send a quotation.", href: "/wholesale#enquire", label: "Enquire now", primary: false },
              ].map((t, i) => (
                <div key={t.tag} data-reveal="up" style={{ ["--delay" as string]: `${i * 120}ms` }} className="relative rounded-br-[3rem] rounded-tl-[1rem] bg-[#faf8f3] p-8 pl-16 ring-1 ring-indigo/15 lg:p-10 lg:pl-20">
                  <span aria-hidden className="absolute left-6 top-8 size-5 rounded-full bg-white ring-2 ring-indigo/30 lg:left-8" />
                  <span aria-hidden className="absolute left-[2.1rem] top-14 h-[calc(100%-5rem)] w-px border-l border-dashed border-indigo/30 lg:left-[2.6rem]" />
                  <p className="eyebrow">{t.tag}</p>
                  <p className="mt-4 font-display text-3xl font-extrabold leading-none tracking-[-0.035em] lg:text-4xl">{t.title}</p>
                  <p className="mt-4 max-w-md leading-relaxed text-ink-soft">{t.text}</p>
                  <ButtonLink href={t.href} variant={t.primary ? "primary" : "secondary"} size="lg" className="mt-8">
                    {t.label} <ArrowRight className="size-4" aria-hidden />
                  </ButtonLink>
                </div>
              ))}
            </div>
            <p data-reveal="up" className="mt-8 text-sm text-ink-soft">
              Prefer to talk?{" "}
              <a href={BUSINESS.phone.href} className="font-semibold text-ink underline">
                {BUSINESS.phone.display}
              </a>
            </p>
          </div>
        </section>
      )}
    </>
  );
}
