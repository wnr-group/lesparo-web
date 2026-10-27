import { existsSync } from "node:fs";
import { join } from "node:path";
import { ArrowRight, ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/site/product-card";
import { ButtonLink } from "@/components/ui/button";
import { BUSINESS } from "@/lib/business";
import type { HomeData } from "@/lib/home-data";
import { HeroVideo } from "./video-hero";
import "./video.css";

/** Drop the film at public/video/lesparo-hero.mp4 (and optionally .webm); it plays automatically. */
const FILM = { mp4: "/video/lesparo-hero.mp4", webm: "/video/lesparo-hero.webm" };

const MILESTONES = [
  ["1979", "R. Yuvaraj, Erode", "Mr. Yuvaraj founds R. Yuvaraj in Erode, supplying lungis, dhoties and mull cloth to Kerala."],
  ["1999", "The next generation", "His son, Y. Sathish, joins as a trainee and takes a leading role in the company’s growth."],
  ["2001", "Y. Sathish & Co.", "Churidar materials, Kerala special dhoties and sarees for showrooms in Kerala and Tamil Nadu."],
  ["2017", "Abija Exports and LESPARO", "Knitted and woven casual wear for gents and kids: shorts, 3/4th pants and track suits."],
];
const STEPS = [
  ["Browse", "Add products to your enquiry list as you explore the catalogue."],
  ["Specify", "Share quantities, sizes, colours and any reference images."],
  ["Review", "Our sales team reviews your requirement and follows up."],
  ["Quotation", "Receive pricing and supply details for your order."],
];
const PANEL_BG = ["bg-[#eef0ff]", "bg-[#f4f1ea]", "bg-[#eaf3f1]"];

export function HomeVideo({ content, garments, fabrics, featured, panelImages, sections }: HomeData & { sections: HomeData["content"]["sections"] }) {
  const hasFilm = existsSync(join(process.cwd(), "public", "video", "lesparo-hero.mp4"));
  const { hero } = content;
  const panels = [
    ...garments.slice(0, 2).map((g) => ({ cat: g, items: g.children, image: panelImages[g.id] ?? g.coverUrl, fan: false })),
    ...(fabrics ? [{ cat: fabrics, items: fabrics.children, image: null as string | null, fan: true }] : []),
  ];

  return (
    <>
      {/* ================================================================ hero film */}
      <section aria-labelledby="hero-heading" className="relative isolate h-[calc(100svh-var(--hdr))] min-h-[36rem] overflow-hidden text-white">
        <div className="hv-film absolute inset-0 -z-10">
          <div aria-hidden className="hv-weave absolute inset-0" />
          {hasFilm && <HeroVideo src={FILM.mp4} webm={FILM.webm} />}
          {/* Grade: just enough indigo at the foot and left to keep the type readable. */}
          <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(18_22_76/0.82),rgb(18_22_76/0.15)_55%,rgb(18_22_76/0.35))]" />
        </div>

        <div className="hv-copy mx-auto flex h-full max-w-page flex-col justify-end px-4 pb-28 sm:px-6 lg:px-10 lg:pb-32">
          <p className="hv-in eyebrow !text-white/80" style={{ ["--d" as string]: 0 }}>
            {hero.eyebrow || "Abija Exports · Erode, Tamil Nadu"}
          </p>
          <h1 id="hero-heading" className="hv-in mt-5 max-w-[16ch] font-display text-[clamp(3rem,1.4rem+7vw,9rem)] font-extrabold leading-[0.9] tracking-[-0.05em]" style={{ ["--d" as string]: 1 }}>
            {hero.heading}
          </h1>
          <p className="hv-in mt-7 max-w-xl text-lg leading-relaxed text-white/85" style={{ ["--d" as string]: 2 }}>
            {hero.subheading}
          </p>
          <div className="hv-in mt-9 flex flex-wrap items-center gap-3" style={{ ["--d" as string]: 3 }}>
            <ButtonLink href={hero.primaryCta.href} variant="accent" size="lg">
              {hero.primaryCta.label} <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <Link href={hero.secondaryCta.href} className="inline-flex h-13 items-center gap-2 rounded-full border border-white/50 px-6 text-sm font-semibold transition-colors hover:bg-white hover:text-indigo-deep">
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>

        <dl className="absolute inset-x-0 bottom-0 mx-auto grid max-w-page grid-cols-3 border-t border-white/25 px-4 sm:px-6 lg:px-10">
          {[
            ["1979", "Family trade begins"],
            ["3 states", "Tamil Nadu, Kerala, Karnataka"],
            ["2017", "LESPARO launches"],
          ].map(([v, l], i) => (
            <div key={v} className={`py-4 lg:py-5 ${i ? "border-l border-white/25 pl-4 sm:pl-8" : ""}`}>
              <dd className="font-display text-[clamp(1.2rem,0.9rem+1.4vw,2rem)] font-extrabold leading-none tracking-[-0.03em]">{v}</dd>
              <dt className="mt-1.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-white/70">{l}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ============================================ the range: panels that stack like cut cloth */}
      {sections.categories && panels.length > 0 && (
        <section aria-labelledby="range-heading" className="relative -mt-8 rounded-t-[2.5rem] bg-white pt-16 lg:pt-24">
          <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
            <p data-reveal="up" className="eyebrow">
              The range
            </p>
            <h2 id="range-heading" data-reveal="mask" className="mt-4 max-w-4xl font-display text-[clamp(2.4rem,1.2rem+4.4vw,5.5rem)] font-extrabold leading-[0.94] tracking-[-0.045em]">
              Garments, and the cloth behind them.
            </h2>
          </div>
          <div className="mt-12 lg:mt-16">
            {panels.map((p, i) => (
              <article
                key={p.cat.id}
                className={`hv-stack relative flex min-h-[34rem] items-center overflow-hidden rounded-t-[2.5rem] shadow-[0_-24px_50px_-30px_rgb(18_22_76/0.35)] lg:min-h-[calc(100svh-var(--hdr))] ${PANEL_BG[i % PANEL_BG.length]}`}
                style={{ top: `calc(var(--hdr) + ${i * 0.75}rem)` }}
              >
                <div className="mx-auto grid w-full max-w-page items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-10">
                  <div className="lg:col-span-5">
                    <p className="font-display text-sm font-bold tabular-nums tracking-[0.14em] text-indigo">
                      {String(i + 1).padStart(2, "0")} / {String(panels.length).padStart(2, "0")}
                    </p>
                    <h3 className="mt-4 font-display text-[clamp(3rem,1.6rem+6vw,8rem)] font-extrabold leading-[0.88] tracking-[-0.05em]">{p.cat.name}</h3>
                    <ul className="mt-7 flex flex-wrap gap-2">
                      {p.items.map((c) => (
                        <li key={c.id}>
                          <Link href={`/collections/${c.slug}`} className="inline-flex h-11 items-center rounded-full bg-white/80 px-5 text-sm font-semibold ring-1 ring-indigo/15 transition-colors hover:bg-indigo hover:text-white">
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link href={`/collections/${p.cat.slug}`} className="group mt-8 inline-flex items-center gap-3 font-display text-lg font-bold">
                      <span className="grid size-12 place-items-center rounded-full bg-indigo text-white transition-transform duration-500 group-hover:rotate-45">
                        <ArrowUpRight className="size-5" aria-hidden />
                      </span>
                      Explore {p.cat.name}
                    </Link>
                  </div>
                  <div className="relative h-[24rem] overflow-hidden lg:col-span-7 lg:h-[min(34rem,calc(100svh-12rem))]">
                    {p.fan ? (
                      <ul className="hv-pan mix-blend-multiply absolute inset-0 grid grid-cols-2 gap-4 p-6 sm:grid-cols-4 sm:items-center">
                        {p.items.slice(0, 4).map((c) => (
                          <li key={c.id} className="relative aspect-[4/5]">
                            {c.coverUrl && <Image src={c.coverUrl} alt={c.name} fill sizes="(min-width:1024px) 14vw, 40vw" className="cutout object-contain" />}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      p.image && (
                        <div className="hv-pan mix-blend-multiply absolute inset-x-0 -top-[7%] bottom-[-7%]">
                          <Image src={p.image} alt={`${p.cat.name} by LESPARO`} fill sizes="(min-width:1024px) 50vw, 90vw" className="cutout object-contain object-bottom" />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ====================================================== product discovery, prices and enquiries */}
      {sections.products && featured.length > 0 && (
        <section aria-labelledby="pick-heading" className="bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p data-reveal="up" className="eyebrow">
                  From the catalogue
                </p>
                <h2 id="pick-heading" data-reveal="mask" className="mt-4 max-w-3xl font-display text-[clamp(2.2rem,1.2rem+4vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
                  Everyday wear, made to supply.
                </h2>
              </div>
              <ButtonLink href="/shop" data-reveal="up" size="lg" className="self-start md:self-auto">
                Shop all products <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </div>
          <ul className="mt-12 flex snap-x gap-5 overflow-x-auto px-4 pb-6 sm:px-6 lg:px-10" tabIndex={0} aria-label="Featured products, scroll sideways">
            {featured.slice(0, 8).map((p, i) => (
              <li key={p.id} className="w-[62vw] shrink-0 snap-start sm:w-64 lg:w-72">
                <ProductCard product={p} priority={i < 2} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ============================================================ heritage */}
      {sections.story && (
        <section aria-labelledby="heritage-heading" className="bg-[#f4f5ff] py-20 lg:py-28">
          <div className="mx-auto grid max-w-page gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10">
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-[calc(var(--hdr)+2rem)]">
                <p data-reveal="up" className="eyebrow">
                  Craft and heritage
                </p>
                <h2 id="heritage-heading" data-reveal="mask" className="mt-4 font-display text-[clamp(2.2rem,1.2rem+3.8vw,4.8rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
                  {content.story.approved ? content.story.heading : "Four decades of textiles from Erode."}
                </h2>
                <div data-reveal="clip" className="hv-weave relative mt-8 aspect-[4/3] overflow-hidden">
                  <p className="absolute bottom-4 left-4 z-10 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-white">Erode, Tamil Nadu · since 1979</p>
                </div>
                <ButtonLink href="/about" variant="secondary" className="mt-6">
                  Read the full story <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
              </div>
            </div>
            <ol className="lg:col-span-7">
              {MILESTONES.map(([y, t, d]) => (
                <li key={y} data-reveal="up" className="grid gap-4 border-t border-indigo/15 py-10 first:border-t-0 first:pt-0 sm:grid-cols-[13rem_1fr] sm:gap-8 lg:py-14">
                  <p className="font-display text-[clamp(3.2rem,2rem+3.5vw,5.5rem)] font-extrabold leading-[0.85] tracking-[-0.06em] text-indigo">{y}</p>
                  <div>
                    <h3 className="font-display text-2xl font-bold tracking-tight">{t}</h3>
                    <p className="mt-2 max-w-md leading-relaxed text-ink-soft">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ============================================================ quality */}
      <section aria-labelledby="quality-heading" className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
          <p data-reveal="up" className="eyebrow">
            Quality promise
          </p>
          <h2 id="quality-heading" data-reveal="mask" className="mt-4 max-w-4xl font-display text-[clamp(2.2rem,1.2rem+4vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
            Good-quality wearables, and an <span className="text-indigo">unforgettable wearing experience.</span>
          </h2>
          <ul data-reveal="stagger" className="mt-12 grid gap-px bg-line sm:grid-cols-2">
            {[
              { icon: ShieldCheck, title: "Quality policy", text: "We commit to the agreed requirement, details and price, and to customer satisfaction through quality procedures that meet or exceed international standards." },
              { icon: RefreshCw, title: "Replacement policy", text: "Our replacement policy speaks to our quality assurance: we make every effort to meet international quality, to a high standard of quality parameters." },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="bg-white py-8 sm:px-8 sm:first:pl-0 sm:last:pr-0">
                <Icon className="size-6 text-indigo" aria-hidden />
                <h3 className="mt-4 font-display text-xl font-bold tracking-tight">{title}</h3>
                <p className="mt-2 max-w-md leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================================================ wholesale + retail */}
      {sections.wholesale && (
        <section aria-labelledby="wholesale-heading" className="relative isolate overflow-hidden bg-[#eef0ff] py-20 lg:py-28">
          <div className="mx-auto grid max-w-page gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10">
            <div className="lg:col-span-6">
              <p data-reveal="up" className="eyebrow">
                Wholesale
              </p>
              <h2 id="wholesale-heading" data-reveal="mask" className="mt-4 font-display text-[clamp(2.4rem,1.2rem+4.6vw,5.6rem)] font-extrabold leading-[0.93] tracking-[-0.05em]">
                Supplying showrooms, retailers and wholesalers.
              </h2>
              <p data-reveal="up" className="mt-6 max-w-lg leading-relaxed text-ink-soft">
                LESPARO supplies textile showrooms across Tamil Nadu, Kerala and Karnataka. Tell us what you need and our sales team will come back with a quotation.
              </p>
              <div data-reveal="up" className="mt-9 flex flex-wrap items-center gap-3">
                <ButtonLink href="/wholesale#enquire" size="lg">
                  Enquire now <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
                <ButtonLink href="/shop" variant="secondary" size="lg">
                  Buy online
                </ButtonLink>
                <a href={BUSINESS.phone.href} className="inline-flex h-13 items-center px-3 text-sm font-semibold hover:underline">
                  or call {BUSINESS.phone.display}
                </a>
              </div>
            </div>
            <ol data-reveal="stagger" className="divide-y divide-indigo/15 border-y border-indigo/15 lg:col-span-6 lg:self-end">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="grid grid-cols-[3.5rem_1fr] gap-4 py-6">
                  <span className="font-display text-3xl font-extrabold tabular-nums text-indigo/40">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="font-display text-2xl font-bold tracking-tight">{t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-soft">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </>
  );
}
