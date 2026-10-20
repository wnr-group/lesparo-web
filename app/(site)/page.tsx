import { ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CountUp } from "@/components/site/count-up";
import { HeroRing } from "@/components/site/hero-ring";
import type { RingItem } from "@/components/site/product-ring";
import { CardDeck, type DeckItem } from "@/components/site/card-deck";
import { PinnedTrack } from "@/components/site/pinned-track";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/primitives";
import { BUSINESS } from "@/lib/business";
import { getCategoryTree, getHomepageContent, getProductsBySlugs, listProducts, type CategoryNode } from "@/lib/catalogue/queries";
import { publicMediaUrl } from "@/lib/supabase/server";

const MILESTONES = [
  { year: "1979", text: "Mr. Yuvaraj founds R. Yuvaraj in Erode — lungis, dhoties and mull cloth for Kerala." },
  { year: "1999", text: "Y. Sathish joins the family business and leads its growth." },
  { year: "2001", text: "Y. Sathish & Co. begins: churidar materials, Kerala dhoties and sarees." },
  { year: "2017", text: "Abija Exports launches LESPARO — knitted and woven casual wear for gents and kids." },
];

/** Verified facts only (Company History page). */
const FACTS = [
  { value: "1979", label: "Family textile trade begins in Erode" },
  { value: "3 states", label: "Showrooms supplied across Tamil Nadu, Kerala and Karnataka" },
  { value: "2017", label: "LESPARO launched by Abija Exports" },
  { value: "Gents & kids", label: "Knitted and woven casual wear, plus lungis, kavi, towels and kerchiefs" },
];

const STEPS = [
  ["Browse", "Add products to your enquiry list as you explore the catalogue."],
  ["Specify", "Share quantities, sizes, colours and any reference images."],
  ["Review", "Our sales team reviews your requirement and follows up."],
  ["Quotation", "Receive pricing and supply details for your order."],
];

function CategoryTile({ category, square, sizes }: { category: CategoryNode; square?: boolean; sizes: string }) {
  return (
    <Link href={`/collections/${category.slug}`} className="group flex h-full flex-col">
      <div className={`relative overflow-hidden rounded-2xl bg-mist transition-colors duration-500 group-hover:bg-[#e8eaf2] ${square ? "aspect-square" : "aspect-[4/5]"}`}>
        {category.coverUrl && (
          <Image
            src={category.coverUrl}
            alt=""
            fill
            sizes={sizes}
            className="object-contain p-[8%] cutout transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.06]"
          />
        )}
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 px-0.5 pt-4">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold tracking-tight transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:translate-x-1 sm:text-2xl">{category.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">{category.children.map((g) => g.name).join(" · ") || "View range"}</p>
        </div>
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-paper ring-1 ring-line transition-colors duration-300 group-hover:bg-indigo group-hover:text-white group-hover:ring-indigo sm:flex">
          <ArrowUpRight className="size-4 transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:rotate-45" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const [content, tree] = await Promise.all([getHomepageContent(), getCategoryTree()]);
  const featured = await getProductsBySlugs(content.featuredProductSlugs);
  const heroImage = publicMediaUrl(content.hero.imagePath);
  const fabrics = tree.find((t) => t.slug !== "garments");
  const featuredCategories = tree.flatMap((t) => t.children).filter((c) => content.featuredCategorySlugs.includes(c.slug));
  const { sections } = content;
  const showcase = (featuredCategories.length ? featuredCategories : tree.flatMap((t) => t.children)).slice(0, 4);
  // Hero ring: featured products first, then the rest of the catalogue, ten with photos.
  const { products: catalogue } = await listProducts({ pageSize: 24 });
  const ringItems: RingItem[] = [
    ...(heroImage ? [{ id: "hero-image", href: content.hero.primaryCta.href, name: content.hero.heading, label: null, image: heroImage }] : []),
    ...[...featured, ...catalogue]
      .filter((p, i, all) => p.images[0] && all.findIndex((q) => q.id === p.id) === i)
      .map((p) => ({ id: p.id, href: `/products/${p.slug}`, name: p.name, label: p.category?.name ?? null, image: p.images[0].url })),
  ].slice(0, 10);

  // Featured deck: the admin's featured products that have a photo.
  const deck: DeckItem[] = featured
    .filter((p) => p.images[0])
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category?.name ?? null,
      detail: [p.fabric, p.sizes.length ? `Sizes ${p.sizes.join(" · ")}` : null].filter(Boolean).join(" — "),
      image: p.images[0].url,
    }));

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <HeroRing
        eyebrow={content.hero.eyebrow}
        heading={content.hero.heading}
        subheading={content.hero.subheading}
        primaryCta={content.hero.primaryCta}
        secondaryCta={content.hero.secondaryCta}
        items={ringItems}
      />

      {/* ---------------------------------------------------------- categories */}
      {sections.categories && (
        <section className="py-20 lg:py-28">
          <Container>
            <SectionHeading
              eyebrow="Collections"
              title={
                <>
                  Garments, and the cloth <span className="text-indigo">behind them</span>
                </>
              }
              action={
                <ButtonLink href="/collections" variant="secondary" size="sm" className="self-start md:self-auto">
                  All collections <ArrowRight className="size-3.5" aria-hidden />
                </ButtonLink>
              }
            />
            <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {showcase.map((c, i) => (
                <li key={c.id} data-reveal="up" style={{ ["--delay" as string]: `${i * 90}ms` }}>
                  <CategoryTile category={c} sizes="(min-width:768px) 22vw, 45vw" />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* ------------------------------------------------------- featured deck */}
      {sections.products && deck.length > 0 && (
        <section className="overflow-hidden py-20 lg:py-28">
          <Container>
            <SectionHeading
              eyebrow="From the catalogue"
              title="Everyday wear, made to supply"
              intro="Shorts, tracks and 3/4ths in hosiery and jersey knits, packed in sets for retailers — alongside our lungis, kavi dhothies, towels and kerchiefs."
              action={
                <ButtonLink href="/shop" size="sm" className="self-start md:self-auto">
                  Shop all products <ArrowRight className="size-3.5" aria-hidden />
                </ButtonLink>
              }
            />
            <div className="mt-14" data-reveal="up">
              <CardDeck items={deck} />
            </div>
          </Container>
        </section>
      )}

      {/* --------------------------------------------------------------- facts */}
      {sections.story && (
        <section aria-labelledby="facts-heading" className="stats-track relative overflow-x-clip bg-indigo-deep text-white lg:h-[260vh]">
          {/* Pinned on desktop: the facts appear one by one around the emblem as you scroll (globals.css .stat). */}
          <div className="py-20 lg:sticky lg:top-[4.5rem] lg:flex lg:h-[calc(100svh-4.5rem)] lg:items-center lg:py-0">
            <Container>
              <h2 id="facts-heading" className="text-center font-display text-headline font-bold">
                LESPARO at a glance
              </h2>
              <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr] lg:gap-16">
                <dl className="grid gap-10 lg:text-right">
                  {FACTS.slice(0, 2).map((f, i) => (
                    <div key={f.value} className="stat flex flex-col-reverse" style={{ ["--n" as string]: i * 2 }}>
                      <dt className="mt-2 text-white/65 lg:ml-auto lg:max-w-xs">{f.label}</dt>
                      <dd className="font-display text-[clamp(2.75rem,2rem+2.5vw,4.5rem)] font-bold leading-none tracking-[-0.045em] text-sun">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                <div aria-hidden className="emblem relative mx-auto size-[min(72vw,22rem)]">
                  <svg viewBox="0 0 200 200" className="absolute inset-0 size-full motion-safe:animate-[orbit_28s_linear_infinite]">
                    <defs>
                      <path id="facts-ring" d="M100,100 m-84,0 a84,84 0 1,1 168,0 a84,84 0 1,1 -168,0" />
                    </defs>
                    <text className="fill-white/70 font-display text-[11px] font-bold uppercase tracking-[0.32em]">
                      <textPath href="#facts-ring">Knitted · Woven · Erode · Since 1979 · Knitted · Woven · Erode ·</textPath>
                    </text>
                  </svg>
                  <div className="absolute inset-[18%] flex items-center justify-center rounded-full bg-white shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]">
                    <Image src="/lesparo-logo.png" alt="" width={678} height={446} className="w-[62%]" />
                  </div>
                </div>
                <dl className="grid gap-10">
                  {FACTS.slice(2).map((f, i) => (
                    <div key={f.value} className="stat flex flex-col-reverse" style={{ ["--n" as string]: i * 2 + 1 }}>
                      <dt className="mt-2 max-w-xs text-white/65">{f.label}</dt>
                      <dd className="font-display text-[clamp(2.75rem,2rem+2.5vw,4.5rem)] font-bold leading-none tracking-[-0.045em] text-sun">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Container>
          </div>
        </section>
      )}

      {/* --------------------------------------------------------------- story */}
      {sections.story && content.story.approved && (
        <section aria-labelledby="story-heading" className="py-20 lg:py-0">
          {/* Horizontal story: pinned on desktop, scrolling sideways; each year counts up from the one before. */}
          <PinnedTrack label="LESPARO timeline, 1979 to 2017">
            <div className="w-[min(88vw,30rem)] shrink-0 snap-start pl-4 pr-8 sm:pl-6 lg:w-[38rem] lg:pl-[max(2.5rem,calc((100vw-88rem)/2+2.5rem))] lg:pr-20">
              <p data-reveal="up" className="eyebrow">
                Our story
              </p>
              <h2 id="story-heading" data-reveal="mask" style={{ ["--delay" as string]: "80ms" }} className="mt-4 font-display text-headline font-bold">
                {content.story.heading}
              </h2>
              <p data-reveal="up" style={{ ["--delay" as string]: "200ms" }} className="mt-6 max-w-prose text-[1.05rem] leading-relaxed text-ink-soft">
                {content.story.body}
              </p>
              <div data-reveal="up" style={{ ["--delay" as string]: "280ms" }}>
                <ButtonLink href="/about" variant="secondary" className="mt-8">
                  Read the company history <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
              </div>
            </div>
            {MILESTONES.map((m, i) => {
              const latest = i === MILESTONES.length - 1;
              const year = Number(m.year);
              return (
                <article key={m.year} className="flex w-[min(78vw,24rem)] shrink-0 snap-start flex-col self-stretch border-l border-line px-7 py-4 lg:my-[8vh] lg:w-[min(36vw,34rem)] lg:px-12">
                  <p className="flex items-center gap-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-muted">
                    <span className={`size-2 rounded-full ${latest ? "bg-sun" : "bg-indigo"}`} />
                    {String(i + 1).padStart(2, "0")} / {String(MILESTONES.length).padStart(2, "0")}
                  </p>
                  <h3 className="mt-16 font-display text-[clamp(4.5rem,2.5rem+6vw,10rem)] font-bold leading-[0.85] tracking-[-0.055em] text-indigo lg:mt-auto">
                    <CountUp value={year} from={i ? Number(MILESTONES[i - 1].year) : year - 30} />
                  </h3>
                  <p className={`mt-6 max-w-sm text-lg leading-relaxed ${latest ? "text-ink" : "text-ink-soft"}`}>{m.text}</p>
                </article>
              );
            })}
            <div aria-hidden className="w-4 shrink-0 lg:w-[max(2.5rem,calc((100vw-88rem)/2+2.5rem))]" />
          </PinnedTrack>
        </section>
      )}

      {/* ------------------------------------------------------------- fabrics */}
      {sections.fabrics && fabrics && (
        <section className="relative isolate overflow-hidden py-20 lg:py-28">
          {/* Oversized outline type drifts sideways behind the tiles as the section scrolls past. */}
          <p
            aria-hidden
            className="ghost-drift pointer-events-none absolute bottom-[8%] left-0 -z-10 select-none whitespace-nowrap font-display text-[clamp(6rem,4rem+12vw,15rem)] font-bold leading-none tracking-[-0.05em] text-transparent [-webkit-text-stroke:1.5px_var(--color-sand)]"
          >
            {fabrics.children.map((c) => c.name).join(" · ")}
          </p>
          <Container>
            <SectionHeading eyebrow={fabrics.name} title="Lungi, kavi, towel and kerchief" intro="Woven fabric lines from the family’s original trade, continued under LESPARO." />
            <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {fabrics.children.map((c, i) => (
                <li key={c.id} data-reveal="up" style={{ ["--delay" as string]: `${i * 90}ms` }}>
                  <CategoryTile category={c} square sizes="(min-width:768px) 22vw, 45vw" />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* ----------------------------------------------------------- wholesale */}
      {sections.wholesale && (
        <section className="py-20 lg:py-28">
          <Container>
            {/* The panel opens out from an inset window as it enters, then its steps follow in sequence. */}
            <div data-reveal="clip" className="relative isolate overflow-hidden rounded-[2rem] bg-indigo px-6 py-14 text-white sm:px-12 lg:px-16 lg:py-20">
              <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 -z-10 size-[30rem] rounded-full bg-sun opacity-25 blur-[110px]" />
              <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 -z-10 size-[26rem] rounded-full bg-indigo-deep opacity-80 blur-[90px]" />
              <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
                <div>
                  <p className="eyebrow !text-sun">Wholesale</p>
                  <h2 className="mt-4 font-display text-headline font-bold">Supplying showrooms, retailers and wholesalers.</h2>
                  <p className="mt-6 max-w-lg leading-relaxed text-white/75">
                    LESPARO supplies textile showrooms across Tamil Nadu, Kerala and Karnataka. Tell us what you need — products, quantities, sizes and colours — and our sales team will come back to
                    you with a quotation.
                  </p>
                  <div className="mt-10 flex flex-wrap items-center gap-3">
                    <ButtonLink href="/wholesale#enquire" size="lg" variant="accent">
                      Request a quote <ArrowRight className="size-4" aria-hidden />
                    </ButtonLink>
                    <a href={BUSINESS.phone.href} className="inline-flex h-13 items-center px-3 text-sm font-medium text-white/80 hover:text-white">
                      or call {BUSINESS.phone.display}
                    </a>
                  </div>
                </div>
                <ol data-reveal="stagger" style={{ ["--delay" as string]: "350ms" }} className="grid gap-3 self-center sm:grid-cols-2">
                  {STEPS.map(([t, d], i) => (
                    <li key={t} className="rounded-2xl bg-white/[0.07] p-6 ring-1 ring-white/15 backdrop-blur">
                      <span className="flex size-8 items-center justify-center rounded-full bg-sun text-sm font-bold text-ink">{i + 1}</span>
                      <p className="mt-4 font-display text-2xl font-bold">{t}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/70">{d}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
