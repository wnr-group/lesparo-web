import { ArrowRight, ArrowUpRight, Phone, RefreshCw, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { BUSINESS } from "@/lib/business";
import { getCategoryTree, listProducts, type CategoryNode } from "@/lib/catalogue/queries";
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
    range: "checked-lungi",
    label: "Lungi",
  },
  {
    year: "1999",
    title: "The next generation",
    body: "His son, Y. Sathish, joins as a trainee after a business administration degree, and soon takes a leading role in the company’s growth and expansion.",
  },
  {
    year: "2001",
    title: "Y. Sathish & Co.",
    body: "After about two years in the family business, he starts Y. Sathish & Co.: churidar materials, Kerala special dhoties and Kerala sarees, sold to showrooms, chain stores and wholesalers in Kerala and Tamil Nadu.",
    range: "kavi-dhothy",
    label: "Kavi dhothy",
  },
  {
    year: "2017",
    title: "Abija Exports and LESPARO",
    body: "After his own market survey, he launches Abija Exports, the unit behind LESPARO: knitted and woven unisex and kids’ casual wear. Shorts, 3/4th pants and track suits for leisure, sports and ethnic wear.",
    range: "gents-tracks",
    label: "Gents tracks",
  },
];

/** Vision text as words, so each can pull into focus with scroll. */
const VISION = ["To be India’s most customer-centric company of leisure wear", "for people who need comfort, perfect wear."];

const flatten = (nodes: CategoryNode[]): CategoryNode[] => nodes.flatMap((n) => [n, ...flatten(n.children)]);

export default async function AboutPage() {
  const tree = await getCategoryTree();
  const all = flatten(tree);
  const cover = (slug: string) => all.find((c) => c.slug === slug)?.coverUrl ?? null;
  const garments = tree.find((t) => t.slug === "garments")?.children ?? [];
  const fabrics = tree.find((t) => t.slug !== "garments");

  const { products } = await listProducts({ pageSize: 200 });
  const photo = (slug: string) => products.find((p) => p.slug === slug)?.images[0]?.url ?? null;
  const adult = photo("loom-don-track-with-rib");
  const kid = photo("new-york-kids-track");

  const ranges = [
    { cat: garments.find((g) => /gent/i.test(g.slug)), note: "Shorts, tracks, 3/4th and T-shirts for men.", bg: "bg-[#eef0ff]", img: photo("fine-comfort-track") },
    { cat: garments.find((g) => /kid/i.test(g.slug)), note: "Shorts, tracks and 3/4th for kids.", bg: "bg-[#f4f1ea]", img: photo("loom-kids") },
    { cat: fabrics, note: "Lungi, kavi dhothy, towels and kerchiefs: the woven lines the family trade began with.", bg: "bg-[#eaf3f1]", img: null },
  ];

  return (
    <>
      {/* ============================================================ hero */}
      <section aria-labelledby="about-heading" className="bg-white">
        <div className="mx-auto grid max-w-page items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-14 lg:px-10 lg:py-24">
          <div className="lg:col-span-7">
            <p data-reveal="up" className="eyebrow">
              About LESPARO
            </p>
            <h1 id="about-heading" data-reveal="mask" className="mt-5 font-display text-[clamp(2.8rem,1.4rem+6vw,7.5rem)] font-extrabold leading-[0.9] tracking-[-0.05em]">
              Forty years of textiles <span className="text-indigo">from Erode.</span>
            </h1>
            <p data-reveal="up" className="mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              Built on four decades of hands-on textile experience, LESPARO today supplies textile showrooms across Tamil Nadu, Kerala and Karnataka, with the aim of taking the brand across India.
            </p>
            <dl data-reveal="stagger" className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-line pt-6">
              {[
                ["1979", "Family trade begins"],
                ["3 states", "Tamil Nadu, Kerala, Karnataka"],
                ["2017", "LESPARO launches"],
              ].map(([v, l]) => (
                <div key={v}>
                  <dd className="font-display text-[clamp(1.5rem,1.1rem+1.6vw,2.4rem)] font-extrabold leading-none tracking-[-0.04em] text-indigo">{v}</dd>
                  <dt className="mt-2 text-xs leading-snug text-muted">{l}</dt>
                </div>
              ))}
            </dl>
          </div>
          <div data-reveal="clip" className="relative min-h-[24rem] overflow-hidden rounded-[2rem] bg-[#eef0ff] lg:col-span-5 lg:min-h-[34rem]">
            <div aria-hidden className="ab-panel absolute inset-0 bg-[radial-gradient(60%_50%_at_60%_30%,#fff,transparent)]" />
            <p className="absolute left-6 top-6 z-10 rounded-full bg-white px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-indigo shadow-sm">Abija Exports · Erode</p>
            {adult && (
              <div className="ab-lag-a absolute bottom-0 right-[4%] h-[90%] w-[78%] mix-blend-multiply">
                <Image src={adult} alt="LESPARO gents track pants and vest" fill priority sizes="(min-width:1024px) 26vw, 70vw" className="cutout object-contain object-bottom" />
              </div>
            )}
            {kid && (
              <div className="ab-lag-b absolute bottom-0 left-[2%] z-10 h-[56%] w-[40%] mix-blend-multiply">
                <Image src={kid} alt="LESPARO kids track pants and t-shirt" fill sizes="(min-width:1024px) 14vw, 36vw" className="cutout object-contain object-bottom" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================== vision */}
      <section aria-labelledby="vision-heading" className="bg-[#f4f5ff] py-20 lg:py-28">
        <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
          <p data-reveal="up" className="eyebrow">
            Our vision
          </p>
          <h2 id="vision-heading" data-reveal="mask" className="mt-5 max-w-5xl font-display text-[clamp(2rem,1.1rem+4vw,5rem)] font-extrabold leading-[1] tracking-[-0.045em]">
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
      <section aria-labelledby="history-heading" className="overflow-x-clip bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p data-reveal="up" className="eyebrow">
                Company history
              </p>
              <h2 id="history-heading" data-reveal="mask" className="mt-4 font-display text-[clamp(2.2rem,1.2rem+4vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
                One family, four chapters.
              </h2>
            </div>
            <p data-reveal="up" className="max-w-md leading-relaxed text-ink-soft lg:col-span-5 lg:justify-self-end">
              Photographs show products from today’s LESPARO range that match what the business made in each era.
            </p>
          </div>

          <ol className="timeline relative mt-14 lg:mt-20">
            <span aria-hidden className="absolute bottom-0 left-[5px] top-2 w-px bg-line lg:left-1/2" />
            <span aria-hidden className="timeline-fill absolute bottom-0 left-[5px] top-2 w-px origin-top bg-indigo lg:left-1/2" />
            {HISTORY.map((h, i) => {
              const img = h.range ? cover(h.range) : null;
              const flip = i % 2 === 1;
              return (
                <li key={h.year} className="relative grid gap-6 pb-14 pl-10 last:pb-0 lg:grid-cols-2 lg:gap-24 lg:pb-24 lg:pl-0">
                  <span aria-hidden className="absolute left-0 top-3 size-[11px] rounded-full bg-indigo ring-[5px] ring-white lg:left-1/2 lg:-translate-x-1/2" />
                  <div data-reveal="up" className={flip ? "lg:order-2" : ""}>
                    <p className="font-display text-[clamp(4.5rem,2.5rem+8vw,9.5rem)] font-extrabold leading-[0.8] tracking-[-0.07em] text-indigo">{h.year}</p>
                    <h3 className="mt-5 font-display text-2xl font-bold tracking-tight sm:text-3xl">{h.title}</h3>
                    <p className="mt-3 max-w-prose text-lg leading-relaxed text-ink-soft">{h.body}</p>
                  </div>
                  <div className={`ab-zoom relative aspect-[4/3] w-full max-w-md self-center overflow-hidden rounded-2xl bg-[#f4f5ff] ${flip ? "lg:order-1 lg:justify-self-end" : ""}`}>
                    {img ? (
                      <>
                        <Image src={img} alt={`${h.label}, from today’s LESPARO range`} fill sizes="(min-width:1024px) 28rem, 90vw" className="cutout object-contain p-6 pb-12" />
                        <p className="absolute inset-x-0 bottom-0 px-5 py-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-indigo">From today’s range · {h.label}</p>
                      </>
                    ) : (
                      <p aria-hidden className="absolute inset-0 grid place-items-center font-display text-[7rem] font-extrabold tracking-[-0.06em] text-indigo/25">
                        {h.year.slice(2)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* =========================================================== range */}
      <section aria-labelledby="range-heading" className="overflow-x-clip bg-[#f4f5ff] py-20 lg:py-28">
        <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
          <p data-reveal="up" className="eyebrow">
            What we make
          </p>
          <h2 id="range-heading" data-reveal="mask" className="mt-4 max-w-4xl font-display text-[clamp(2.2rem,1.2rem+4vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
            Garments, and the cloth behind them.
          </h2>
          <ul className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6 lg:mt-16">
            {ranges.map(({ cat, note, bg, img }, ri) =>
              cat ? (
                <li key={cat.id} className="ab-fan" style={{ ["--k" as string]: ri - 1 }}>
                  <Link href={`/collections/${cat.slug}`} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-line transition-shadow duration-500 hover:shadow-[0_24px_50px_-28px_rgb(18_22_76/0.35)]">
                    <div className={`relative aspect-[4/3] md:aspect-[4/5] ${bg}`}>
                      {fabrics && cat.id === fabrics.id ? (
                        <div className="absolute inset-0 grid grid-cols-2 gap-2 p-5">
                          {cat.children.slice(0, 4).map((c) => (
                            <div key={c.id} className="relative">
                              {c.coverUrl && <Image src={c.coverUrl} alt="" fill sizes="(min-width:768px) 14vw, 40vw" className="cutout object-contain" />}
                            </div>
                          ))}
                        </div>
                      ) : (
                        (img ?? cat.coverUrl) && <Image src={(img ?? cat.coverUrl)!} alt="" fill sizes="(min-width:768px) 30vw, 90vw" className="cutout object-contain object-bottom p-5" />
                      )}
                    </div>
                    <div className="flex items-end justify-between gap-4 p-6">
                      <div>
                        <p className="font-display text-2xl font-extrabold tracking-[-0.03em]">{cat.name}</p>
                        <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-ink-soft">{note}</p>
                      </div>
                      <ArrowUpRight className="size-6 shrink-0 text-indigo transition-transform duration-500 group-hover:rotate-45" aria-hidden />
                    </div>
                  </Link>
                </li>
              ) : null,
            )}
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
            <h2 id="quality-heading" data-reveal="mask" className="mt-4 font-display text-[clamp(2.2rem,1.2rem+3.6vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
              Made to be worn, <span className="text-indigo">and trusted.</span>
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
      <section aria-labelledby="channels-heading" className="bg-[#f4f5ff] py-20 lg:py-28">
        <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
          <p data-reveal="up" className="eyebrow">
            How to buy
          </p>
          <h2 id="channels-heading" data-reveal="mask" className="mt-4 max-w-4xl font-display text-[clamp(2.2rem,1.2rem+4vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
            For shoppers, and for showrooms.
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

      <section className="overflow-hidden bg-[#f4f5ff] pt-14 lg:pt-16">
        <div className="mx-auto flex max-w-page flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-10">
          <p className="font-display text-[clamp(1.6rem,1.1rem+1.8vw,2.6rem)] font-extrabold leading-tight tracking-[-0.03em]">Sourcing for your store?</p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/wholesale#enquire" size="lg">
              Wholesale enquiries <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary" size="lg">
              Contact us
            </ButtonLink>
          </div>
        </div>
        <p aria-hidden className="ab-wordmark mt-10 select-none whitespace-nowrap text-center font-display text-[clamp(4.5rem,22vw,28rem)] font-extrabold leading-[0.74] tracking-[-0.06em] text-indigo/[0.09]">
          LESPARO
        </p>
      </section>
    </>
  );
}
