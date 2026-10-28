import { ArrowRight, ArrowUpRight, Phone } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandFilm } from "@/components/site/brand-film";
import { CollectionBanner } from "@/components/site/collection-banner";
import { CountUp } from "@/components/site/count-up";
import { HistoryTabs } from "@/components/site/history-tabs";
import { LoopVideo } from "@/components/site/loop-video";
import { Magnetic, Tilt } from "@/components/site/pointer-fx";
import { SplitWords } from "@/components/site/split-words";
import { ButtonLink } from "@/components/ui/button";
import { BUSINESS } from "@/lib/business";
import "./about.css";

export const metadata: Metadata = {
  title: "About LESPARO",
  description: "From R. Yuvaraj in 1979 to Abija Exports and LESPARO in 2017: four decades of textiles from Erode, Tamil Nadu. Our vision, history, trademark and quality policy.",
  alternates: { canonical: "/about" },
};

/*
 * Content source: lesparo.com (About Us, Company History, Trademark, Vision, Quality Policy, Contact; read 2026-10-27).
 * Vision and Quality Policy are images on the old site; their wording is transcribed from them. The old About Us text says
 * "established in 1988", which contradicts its own Company History page (1979), so that claim is deliberately not used here;
 * confirm with the business which date is right. There are no certificates or test reports on the old site or in this project,
 * so none are shown.
 *
 * The page, top to bottom: the introduction and brand film, the vision, the company history (a film, then the year rail),
 * the three ranges, the quality policy (a film and four short lines), the trademark, and where to find us.
 */
const HISTORY = [
  {
    year: "1979",
    title: "R. Yuvaraj, Erode",
    body: "Mr. Yuvaraj founds R. Yuvaraj in Erode, a city known for textiles. The business begins by supplying lungis, dhoties and mull cloth to Kerala.",
    photo: { src: "/history/1979.jpg", pos: "50% 55%" },
    caption: "A weaver at a hand loom",
    range: { src: "/history/today-lungi.jpg", pos: "50% 50%", label: "Lungi", href: "/collections/lungi" },
  },
  {
    year: "1999",
    title: "The next generation",
    body: "His son, Y. Sathish, joins as a trainee after a business administration degree, and soon takes a leading role in the company’s growth and expansion.",
    photo: { src: "/history/1999-loom.jpg", pos: "50% 50%" },
    caption: "A handloom and its striped cloth",
    range: { src: "/history/today-gents.jpg", pos: "50% 50%", label: "Gents wear", href: "/collections/gents" },
  },
  {
    year: "2001",
    title: "Y. Sathish & Co.",
    body: "After about two years in the family business, he starts Y. Sathish & Co.: churidar materials, Kerala special dhoties and Kerala sarees, sold to showrooms, chain stores and wholesalers in Kerala and Tamil Nadu.",
    photo: { src: "/history/2001.jpg", pos: "50% 50%" },
    caption: "Rolls of cloth, ready for showrooms",
    range: { src: "/history/today-kavi.jpg", pos: "50% 50%", label: "Kavi dhothy", href: "/collections/kavi" },
  },
  {
    year: "2017",
    title: "Abija Exports and LESPARO",
    body: "After his own market survey, he launches Abija Exports, the unit behind LESPARO: knitted and woven unisex and kids’ casual wear. Shorts, 3/4th pants and track suits for leisure, sports and ethnic wear.",
    photo: { src: "/history/2017.jpg", pos: "50% 38%" },
    caption: "Yarn cones on a mill rack",
    range: { src: "/history/today-tracks.jpg", pos: "50% 50%", label: "Gents tracks", href: "/collections/gents-tracks" },
  },
];

/** Vision text as words, so each can pull into focus with scroll. */
const VISION = ["To be India’s most customer-centric company of leisure wear", "for people who need comfort, perfect wear."];

/** The three ranges, each with a photograph from the studio shoot or the lifestyle artwork. */
const RANGES = [
  { name: "Gents", href: "/collections/gents", note: "Shorts, tracks, 3/4th and T-shirts for men.", src: "/collections/gents.jpg", pos: "50% 28%" },
  { name: "Kids", href: "/collections/kids", note: "Shorts, tracks and 3/4th for kids.", src: "/collections/banner-kids.jpg", pos: "72% 40%" },
  { name: "Fabric unstitched", href: "/collections/fabric-unstitched", note: "Lungi, kavi dhothy, towels and kerchiefs: the woven lines the family trade began with.", src: "/collections/banner-towels.jpg", pos: "75% 50%" },
];

/** The quality policy in four short lines; the full wording is one click away, unchanged. */
const QUALITY = [
  "Good-quality wearables, to the agreed requirement, details and price.",
  "An unforgettable wearing experience.",
  "Customer satisfaction, through quality procedures that meet or exceed international standards.",
  "A replacement policy that stands behind it: maximum effort, a high standard of quality parameters.",
];

const TRADEMARK: [string, string][] = [
  ["Application ID", "3620885"],
  ["Class", "25 (clothing)"],
  ["Filed", "26 August 2017, Chennai IP office"],
  ["Registered to", "Y. Sathish, trading as Abija Exports"],
  ["Status (as listed)", "Accepted & advertised"],
];

export default function AboutPage() {
  return (
    <>
      {/* ============================================================ introduction */}
      <CollectionBanner slug="about">
        <p className="eyebrow !text-white/60">About LESPARO</p>
        <h1 id="about-heading" className="mt-4 font-display text-[clamp(2.4rem,1.4rem+4.4vw,5.4rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
          <SplitWords onLoad>Forty years of textiles</SplitWords> <SplitWords onLoad className="text-white/55">from Erode.</SplitWords>
        </h1>
        <p className="mt-5 max-w-lg text-white/70">Built on four decades of hands-on textile experience, LESPARO today supplies textile showrooms across Tamil Nadu, Kerala and Karnataka, with the aim of taking the brand across India.</p>
      </CollectionBanner>

      <section aria-label="LESPARO in numbers" className="py-10 lg:py-14">
        <dl data-reveal="stagger" className="mx-auto grid max-w-page grid-cols-3 gap-4 px-4 sm:px-6 lg:px-10">
          {[
            ["1979", "Family trade begins"],
            ["3 states", "Tamil Nadu, Kerala, Karnataka"],
            ["2017", "LESPARO launches"],
          ].map(([v, l]) => (
            <div key={v} className="border-t-2 border-ink pt-4">
              <dd className="font-display text-[clamp(1.8rem,1.1rem+3vw,3.6rem)] font-extrabold leading-none tabular-nums tracking-tight">{v === "3 states" ? <><CountUp value={3} /> states</> : v}</dd>
              <dt className="mt-2 text-xs leading-snug text-muted sm:text-sm">{l}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* The brand film: a loom, a tailor, a runner at a temple, a family, and the line "40 Years in Every Thread". */}
      <BrandFilm open src="/videos/brand-film.mp4" title="LESPARO: 40 years in every thread" />

      {/* ========================================================== vision */}
      <section aria-labelledby="vision-heading" className="relative isolate overflow-clip bg-[#1c1d1a] py-24 text-white lg:py-36">
        <Image src="/collections/banner-kids.jpg" alt="" fill sizes="100vw" className="scrub-parallax -z-10 object-cover opacity-45" style={{ objectPosition: "70% 40%" }} />
        <span aria-hidden className="absolute inset-0 -z-[5] bg-gradient-to-r from-black/85 via-black/55 to-black/25" />
        <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
          <p data-reveal="up" className="eyebrow !text-white/60">
            Our vision
          </p>
          <h2 id="vision-heading" className="mt-5 max-w-5xl font-display text-[clamp(2.2rem,1.1rem+4.8vw,6rem)] font-extrabold uppercase leading-[0.98] tracking-tight">
            {VISION.map((part, pi) =>
              part.split(" ").map((w, wi) => (
                <span key={pi + "-" + wi} className={pi === 1 ? "text-white/55" : ""}>
                  <span className="ab-focus inline-block">{w}</span>{" "}
                </span>
              )),
            )}
          </h2>
          <p data-reveal="up" className="mt-10 max-w-md border-l-2 border-white/60 pl-5 text-lg leading-snug text-white/80">“Customer goodwill and quality assurance are the backbone of this company.”</p>
        </div>
      </section>

      {/* ======================================================== history */}
      <section aria-labelledby="history-heading" className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p data-reveal="up" className="eyebrow">
                Company history
              </p>
              <h2 id="history-heading" className="mt-4 font-display text-[clamp(2.2rem,1.2rem+4vw,5rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
                <SplitWords>One family, four chapters.</SplitWords>
              </h2>
            </div>
            <p data-reveal="up" className="max-w-md leading-relaxed text-ink-soft lg:col-span-5 lg:justify-self-end">
              Choose a year, or let it turn by itself. The large photograph is illustrative of each era; the small one is where that story continues today, in the LESPARO range.
            </p>
          </div>

          {/* The journey, in ten seconds: Erode at sunrise, the loom, father and son, the workshop, and the line "40 Years of Textile Heritage. Erode, Since 1979." */}
          <div data-reveal="clip" className="mt-12 lg:mt-16">
            <LoopVideo src="/videos/textile-journey.mp4" label="LESPARO's textile journey: Erode, since 1979" className="aspect-[16/9] lg:aspect-[21/9]" />
          </div>

          <div className="mt-14 lg:mt-20">
            <HistoryTabs items={HISTORY.map((h) => ({ year: h.year, title: h.title, body: h.body, photo: h.photo, caption: h.caption, range: h.range }))} />
          </div>
        </div>
      </section>

      {/* =========================================================== range */}
      <section aria-labelledby="range-heading" className="overflow-x-clip bg-[#f2f3f5] py-20 lg:py-28">
        <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
          <p data-reveal="up" className="eyebrow">
            What we make
          </p>
          <h2 id="range-heading" className="mt-4 max-w-4xl font-display text-[clamp(2.2rem,1.2rem+4vw,5rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
            <SplitWords>Garments, and the cloth behind them.</SplitWords>
          </h2>
          <ul className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6 lg:mt-16">
            {RANGES.map(({ name, href, note, src, pos }, ri) => (
              <li key={name} className="ab-fan" style={{ ["--k" as string]: ri - 1 }}>
                <Link href={href} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-line transition-shadow duration-500 hover:shadow-[0_24px_50px_-28px_rgb(18_22_76/0.35)]">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#22231f] md:aspect-[4/5]">
                    <Image src={src} alt="" fill sizes="(min-width:768px) 30vw, 90vw" className="hz object-cover" style={{ objectPosition: pos }} />
                  </div>
                  <div className="flex items-end justify-between gap-4 p-6">
                    <div>
                      <p className="font-display text-2xl font-extrabold uppercase tracking-tight">{name}</p>
                      <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-ink-soft">{note}</p>
                    </div>
                    <ArrowUpRight className="size-6 shrink-0 text-ink transition-transform duration-500 group-hover:rotate-45" aria-hidden />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ======================================================== quality */}
      <section aria-labelledby="quality-heading" className="bg-white py-20 lg:py-28">
        <div className="mx-auto grid max-w-page gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-16 lg:px-10">
          <div data-reveal="clip" className="lg:col-span-6">
            {/* Cotton, the loom, a waistband, folded garments, a boy at play, and the line "Crafted in Erode. Made for You." */}
            <LoopVideo src="/videos/making-of.mp4" label="How LESPARO is made: crafted in Erode" className="aspect-[4/3] lg:aspect-[5/4]" />
          </div>
          <div className="lg:col-span-6">
            <p data-reveal="up" className="eyebrow">
              Quality policy
            </p>
            <h2 id="quality-heading" className="mt-4 font-display text-[clamp(2rem,1.2rem+3.4vw,4.4rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
              <SplitWords>Made to be worn,</SplitWords> <SplitWords className="text-ink/45">and trusted.</SplitWords>
            </h2>
            <ul data-reveal="stagger" className="mt-8 divide-y divide-ink/15 border-y border-ink/15">
              {QUALITY.map((q, i) => (
                <li key={q} className="flex gap-4 py-4">
                  <span className="font-display text-sm font-bold tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className="leading-snug">{q}</span>
                </li>
              ))}
            </ul>
            <details className="group mt-5 text-sm">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-semibold [&::-webkit-details-marker]:hidden">
                <span className="hline">Read the policy in full</span>
                <ArrowRight className="size-4 transition-transform duration-300 group-open:rotate-90" aria-hidden />
              </summary>
              <div className="mt-3 max-w-prose space-y-3 leading-relaxed text-ink-soft">
                <p>To provide the customer with good-quality wearables and an unforgettable wearing experience, to the agreed requirement, in accordance with the details and price. The company is committed to achieving customer satisfaction through quality procedures operated to meet or exceed the requirements of international standards.</p>
                <p>Our replacement policy speaks to our quality assurance: we are trying to meet international quality with maximum effort and a high standard of quality parameters.</p>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* ===================================================== trademark */}
      <section id="trademark" aria-labelledby="trademark-heading" className="scroll-mt-24 bg-[#f2f3f5] py-20 lg:py-28">
        <div className="mx-auto grid max-w-page gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-16 lg:px-10">
          <div className="lg:col-span-6">
            {/* The registered device mark, unaltered, on a plate that tilts a few degrees toward the pointer. */}
            <Tilt className="relative grid aspect-[4/3] place-items-center overflow-clip bg-white ring-1 ring-line" max={4}>
              <Image src="/lesparo-bird.png" alt="" aria-hidden width={700} height={700} className="pointer-events-none absolute -right-10 top-1/2 h-[130%] w-auto -translate-y-1/2 opacity-[0.06]" />
              <Image src="/lesparo-logo-v2.png" alt="The LESPARO registered device mark" width={900} height={484} sizes="(min-width:1024px) 40vw, 80vw" className="relative w-[70%] max-w-md" />
            </Tilt>
          </div>
          <div className="lg:col-span-6">
            <p data-reveal="up" className="eyebrow">
              Trademark
            </p>
            <h2 id="trademark-heading" className="mt-4 font-display text-[clamp(2rem,1.2rem+3.4vw,4.4rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
              <SplitWords>The mark is registered.</SplitWords>
            </h2>
            <dl data-reveal="stagger" className="mt-8 divide-y divide-ink/15 border-y border-ink/15">
              {TRADEMARK.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[9rem_1fr] gap-4 py-3 text-[0.95rem]">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ===================================================== visit + close */}
      <section aria-label="Visit or call" className="bg-white py-16 lg:py-24">
        <div className="mx-auto grid max-w-page gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:items-end lg:gap-16 lg:px-10">
          <div className="lg:col-span-7">
            <p className="eyebrow">Visit or call</p>
            <address className="mt-5 not-italic leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">{BUSINESS.displayName}</span>
              <br />
              {BUSINESS.address.lines.join(", ")}
              <br />
              {BUSINESS.address.city} – {BUSINESS.address.postcode}, {BUSINESS.address.region}
            </address>
            <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
              <a href={BUSINESS.phone.href} className="inline-flex items-center gap-2 hover:underline">
                <Phone className="size-4" aria-hidden /> {BUSINESS.phone.display}
              </a>
              <a href={`mailto:${BUSINESS.email}`} className="hover:underline">
                {BUSINESS.email}
              </a>
            </p>
            <p className="mt-2 text-sm text-muted">
              Customer care:{" "}
              <a href={BUSINESS.customerCare.href} className="font-semibold text-ink hover:underline">
                {BUSINESS.customerCare.display}
              </a>{" "}
              ({BUSINESS.customerCare.hours})
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <Magnetic>
              <ButtonLink href="/shop" size="lg">
                Shop the range <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </Magnetic>
            <ButtonLink href="/wholesale#enquire" size="lg" variant="secondary">
              Wholesale enquiries
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
