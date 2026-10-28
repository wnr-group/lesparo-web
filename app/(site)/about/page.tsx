import { ArrowRight, ArrowUpRight, Phone, RefreshCw, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandFilm } from "@/components/site/brand-film";
import { CollectionBanner } from "@/components/site/collection-banner";
import { CountUp } from "@/components/site/count-up";
import { HistoryTabs } from "@/components/site/history-tabs";
import { Magnetic } from "@/components/site/pointer-fx";
import { SplitWords } from "@/components/site/split-words";
import { ButtonLink } from "@/components/ui/button";
import { BUSINESS } from "@/lib/business";
import "./about.css";

export const metadata: Metadata = {
  title: "About LESPARO",
  description: "From R. Yuvaraj in 1979 to Abija Exports and LESPARO in 2017: four decades of textiles from Erode, Tamil Nadu. Our vision, history, range and quality policy.",
  alternates: { canonical: "/about" },
};

/*
 * Content source: lesparo.com (Company History, Vision, Quality Policy, Trademark, Contact; read 2026-10-27).
 * Vision and Quality Policy are images on the old site; their wording is transcribed from them. The old
 * About Us text says "established in 1988", which contradicts its own history page (1979), so that
 * claim is deliberately not used.
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

export default function AboutPage() {
  return (
    <>
      {/* ============================================================ hero */}
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

      {/* The LESPARO film, straight after the introduction. */}
      <BrandFilm open src="/lesparo_video.mp4" title="The LESPARO film" />

      {/* ========================================================== vision */}
      <section aria-labelledby="vision-heading" className="bg-[#f2f3f5] py-20 lg:py-28">
        <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
          <p data-reveal="up" className="eyebrow">
            Our vision
          </p>
          <h2 id="vision-heading" className="uppercase mt-5 max-w-5xl font-display text-[clamp(2rem,1.1rem+4vw,5rem)] font-extrabold leading-[1] tracking-tight">
            {VISION.map((part, pi) =>
              part.split(" ").map((w, wi) => (
                <span key={pi + "-" + wi} className={pi === 1 ? "text-indigo" : ""}>
                  <span className="ab-focus inline-block">{w}</span>{" "}
                </span>
              )),
            )}
          </h2>
          <blockquote data-reveal="up" className="mt-12 max-w-2xl border-l-2 border-indigo/30 pl-6">
            <p className="font-display text-[clamp(1.2rem,1rem+0.9vw,1.6rem)] font-semibold leading-snug text-indigo-deep/90">“Customer goodwill and quality assurance are the backbone of this company.”</p>
          </blockquote>
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
          <div className="mt-12 lg:mt-16">
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
          <h2 id="range-heading" className="uppercase mt-4 max-w-4xl font-display text-[clamp(2.2rem,1.2rem+4vw,5rem)] font-extrabold leading-[0.95] tracking-tight">
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
        <div className="mx-auto grid max-w-page gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10">
          <div className="lg:col-span-5">
            <p data-reveal="up" className="eyebrow">
              Quality promise
            </p>
            <h2 id="quality-heading" className="uppercase mt-4 font-display text-[clamp(2.2rem,1.2rem+3.6vw,4.5rem)] font-extrabold leading-[0.95] tracking-tight">
              <SplitWords>Made to be worn,</SplitWords> <SplitWords className="text-indigo">and trusted.</SplitWords>
            </h2>
            <p data-reveal="up" className="mt-6 max-w-sm text-sm leading-relaxed text-ink-soft">Abija Exports’ published policies, as set out on the original LESPARO website.</p>
          </div>
          <ul data-reveal="stagger" className="divide-y divide-line border-y border-line lg:col-span-7">
            {[
              { icon: ShieldCheck, title: "Quality policy", text: "To provide the customer with good-quality wearables and an unforgettable wearing experience, to the agreed requirement, in accordance with the details and price. The company is committed to achieving customer satisfaction through quality procedures operated to meet or exceed the requirements of international standards." },
              { icon: RefreshCw, title: "Replacement policy", text: "Our replacement policy speaks to our quality assurance: we are trying to meet international quality with maximum effort and a high standard of quality parameters." },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-5 py-7">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-soft">
                  <Icon className="size-5 text-indigo" aria-hidden />
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold tracking-tight">{title}</h3>
                  <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ======================================================= channels */}
      <section aria-labelledby="channels-heading" className="bg-[#f2f3f5] py-20 lg:py-28">
        <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
          <p data-reveal="up" className="eyebrow">
            How to buy
          </p>
          <h2 id="channels-heading" className="uppercase mt-4 max-w-4xl font-display text-[clamp(2.2rem,1.2rem+4vw,5rem)] font-extrabold leading-[0.95] tracking-tight">
            <SplitWords>For shoppers, and for showrooms.</SplitWords>
          </h2>
          <div className="mt-12 grid gap-4 md:gap-6 lg:mt-16 lg:grid-cols-2">
            <div data-reveal="up" className="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-line lg:p-10">
              <div>
                <p className="eyebrow">Retail · Buy online</p>
                <p className="mt-4 font-display text-3xl font-extrabold leading-none tracking-[-0.035em] lg:text-4xl">Shop LESPARO direct.</p>
                <p className="mt-4 max-w-md leading-relaxed text-ink-soft">Browse gents and kids wear and woven cloth, see the price, and order by the piece with Add to cart or Buy now.</p>
              </div>
              <ButtonLink href="/shop" size="lg" className="mt-8 self-start">
                Shop the range <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
            <div data-reveal="up" style={{ ["--delay" as string]: "120ms" }} className="flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-line lg:p-10">
              <div>
                <p className="eyebrow">Wholesale · Enquire now</p>
                <p className="mt-4 font-display text-3xl font-extrabold leading-none tracking-[-0.035em] lg:text-4xl">Supply your showroom.</p>
                <p className="mt-4 max-w-md leading-relaxed text-ink-soft">We supply textile showrooms, chain stores and wholesalers across Tamil Nadu, Kerala and Karnataka. Tell us what you need and our sales team will send a quotation.</p>
              </div>
              <ButtonLink href="/wholesale#enquire" variant="secondary" size="lg" className="mt-8 self-start">
                Enquire now <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================== trademark + visit */}
      <section id="trademark" className="scroll-mt-24 bg-white py-20 lg:py-28">
        <div className="mx-auto grid max-w-page gap-px bg-line px-0 lg:grid-cols-2">
          <div className="bg-white px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
            <p className="eyebrow">Trademark</p>
            <p className="mt-5 max-w-md leading-relaxed text-ink-soft">LESPARO is a device trademark filed on 26 August 2017 through the Chennai IP office, registered to Y. Sathish, trading as Abija Exports.</p>
            <dl className="mt-6 grid grid-cols-[10rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted">Application ID</dt>
              <dd>3620885</dd>
              <dt className="text-muted">Class</dt>
              <dd>25 (clothing)</dd>
              <dt className="text-muted">Status (as listed)</dt>
              <dd>Accepted &amp; advertised</dd>
            </dl>
          </div>
          <div className="bg-white px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
            <p className="eyebrow">Visit or call</p>
            <address className="mt-5 not-italic leading-relaxed text-ink-soft">
              {BUSINESS.displayName}
              <br />
              {BUSINESS.address.lines.join(", ")}
              <br />
              {BUSINESS.address.city} – {BUSINESS.address.postcode}, {BUSINESS.address.region}
            </address>
            <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
              <a href={BUSINESS.phone.href} className="inline-flex items-center gap-2 hover:underline">
                <Phone className="size-4 text-indigo" aria-hidden /> {BUSINESS.phone.display}
              </a>
              <a href={`mailto:${BUSINESS.email}`} className="hover:underline">
                {BUSINESS.email}
              </a>
            </p>
            <p className="mt-3 text-sm text-muted">
              Customer care:{" "}
              <a href={BUSINESS.customerCare.href} className="font-semibold text-ink hover:underline">
                {BUSINESS.customerCare.display}
              </a>{" "}
              ({BUSINESS.customerCare.hours})
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#f2f3f5] pt-14 lg:pt-16">
        <div className="mx-auto flex max-w-page flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-10">
          <p className="font-display text-[clamp(1.6rem,1.1rem+1.8vw,2.6rem)] font-extrabold leading-tight tracking-[-0.03em]">Sourcing for your store?</p>
          <div className="flex flex-wrap gap-3">
            <Magnetic>
              <ButtonLink href="/wholesale#enquire" size="lg">
                Wholesale enquiries <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </Magnetic>
            <ButtonLink href="/contact" variant="secondary" size="lg">
              Contact us
            </ButtonLink>
          </div>
        </div>
        <p aria-hidden className="ab-wordmark mt-10 select-none whitespace-nowrap text-center font-display text-[clamp(4.5rem,22vw,28rem)] font-extrabold leading-[0.74] tracking-[-0.06em] text-ink/[0.05]">
          LESPARO
        </p>
      </section>
    </>
  );
}
