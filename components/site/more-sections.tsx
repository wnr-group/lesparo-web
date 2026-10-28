import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Magnetic } from "@/components/site/pointer-fx";
import { SplitWords } from "@/components/site/split-words";
import { BUSINESS } from "@/lib/business";

/** Three close-ups of the actual garments, each with a caption that only says what the photograph shows. */
export function DetailPanels() {
  const panels = [
    { src: "/spotlight/waist.jpg", pos: "50% 25%", title: "Drawcord waistband", text: "A soft elasticated waist with a woven drawcord, set into a fine textured knit." },
    { src: "/spotlight/tee-detail.jpg", pos: "50% 55%", title: "Textured jacquard knit", text: "A raised, crinkled surface knitted into the cloth, with the LESPARO bird on the chest." },
    { src: "/collections/garments.jpg", pos: "50% 25%", title: "Contrast collar and cuffs", text: "A brown honeycomb knit polo, trimmed in cream at the collar and sleeves." },
  ];
  return (
    <section aria-labelledby="details" className="bg-[#efece3] py-16 lg:py-24">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <p data-reveal="up" className="eyebrow">
          In the detail
        </p>
        <h2 id="details" className="mt-4 max-w-3xl font-display text-[clamp(2rem,1.2rem+3.4vw,4.2rem)] font-extrabold uppercase leading-[0.98] tracking-tight">
          <SplitWords>Look closer at the cloth.</SplitWords>
        </h2>
        <ul className="mt-12 grid gap-4 md:grid-cols-3 lg:gap-6">
          {panels.map((p, i) => (
            <li key={p.title} data-reveal="up" style={{ ["--delay" as string]: `${i * 110}ms` }}>
              <figure className="group">
                <div className="relative aspect-[4/5] overflow-clip bg-[#22231f]">
                  <Image src={p.src} alt="" fill sizes="(min-width:768px) 32vw, 100vw" className="scrub-parallax hz object-cover" style={{ objectPosition: p.pos }} />
                  <span aria-hidden className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/15" />
                </div>
                <figcaption className="mt-4 transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:translate-x-1.5">
                  <span className="hline font-display text-xl font-extrabold uppercase tracking-tight">{p.title}</span>
                  <span className="mt-1.5 block max-w-sm text-sm leading-relaxed text-ink-soft">{p.text}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Four studio looks from the LESPARO shoot. On wide screens this is a pinned, scroll-driven sequence: the looks slide
 * sideways as the page scrolls (see .edit-track in globals.css). Elsewhere it is a plain grid of links.
 */
export function StudioLooks() {
  const looks = [
    { src: "/looks/grey-tee.jpg", pos: "50% 30%", title: "Everyday tee", href: "/shop" },
    { src: "/looks/cargo-pants.jpg", pos: "50% 60%", title: "Cargo track pants", href: "/collections/gents-tracks" },
    { src: "/looks/beige-tee.jpg", pos: "50% 35%", title: "Tee and cargos", href: "/shop" },
    { src: "/looks/white-tee.jpg", pos: "50% 35%", title: "Training fit", href: "/collections/gents" },
  ];
  return (
    <section aria-labelledby="looks" className="edit-track">
      <div className="edit-sticky mx-auto w-full py-16 lg:py-0">
        <div className="mx-auto flex w-full max-w-page flex-wrap items-end justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <h2 id="looks" className="edit-title font-display text-[clamp(1.8rem,1.2rem+2.4vw,3.2rem)] font-extrabold uppercase tracking-tight">
            <SplitWords>The studio edit</SplitWords>
          </h2>
          <Link href="/shop" className="inline-flex h-11 items-center rounded-full bg-[#e4e0d3] px-5 text-sm font-semibold transition-colors hover:bg-ink hover:text-white">
            Shop everything
          </Link>
        </div>
        <ul className="edit-row mx-auto mt-8 grid max-w-page grid-cols-2 gap-3 px-4 sm:px-6 md:grid-cols-4 lg:gap-5 lg:px-10">
          {looks.map((l, i) => (
            <li key={l.title} data-reveal="up" style={{ ["--delay" as string]: `${i * 90}ms` }} className={`edit-item ${i % 2 ? "md:mt-10" : ""}`}>
              <Link href={l.href} className="group block">
                <span className="relative block aspect-[3/4] overflow-clip bg-[#22231f]">
                  <Image src={l.src} alt="" fill sizes="(min-width:768px) 26vw, 48vw" className="scrub-parallax hz object-cover" style={{ objectPosition: l.pos }} />
                </span>
                <span className="mt-3 flex items-center justify-between gap-3">
                  <span className="hline font-display text-lg font-extrabold uppercase tracking-tight">{l.title}</span>
                  <span aria-hidden className="text-xl transition-transform duration-300 group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const FAQ: [string, string][] = [
  ["How do I get wholesale prices?", "Wholesale rates are quoted, not listed. Add products to your enquiry list or send a wholesale enquiry with quantities, sizes and colours, and our sales team will come back with a quotation."],
  ["Can I buy a single piece online?", "Products that show a retail price can be added to the cart and bought online. Everything else is by enquiry."],
  ["Where do you supply?", "LESPARO supplies textile showrooms across Tamil Nadu, Kerala and Karnataka, from Erode."],
  ["What does the range include?", "Gents and kids shorts, track pants and 3/4ths, plus lungi, kavi dhothies, towels and kerchiefs."],
  ["How can I reach you?", `Call the office on ${BUSINESS.phone.display}, or customer care on ${BUSINESS.customerCare.display} (${BUSINESS.customerCare.hours}). You can also write to ${BUSINESS.email}.`],
];

/** Plain disclosure widgets: keyboard and screen-reader friendly with no script. */
export function BuyerFaq() {
  return (
    <section aria-labelledby="faq" className="py-16 lg:py-24">
      <div className="mx-auto grid max-w-page gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-10">
        <div>
          <p data-reveal="up" className="eyebrow">
            Buying from LESPARO
          </p>
          <h2 id="faq" className="mt-4 font-display text-[clamp(2rem,1.2rem+3vw,3.8rem)] font-extrabold uppercase leading-[0.98] tracking-tight">
            <SplitWords>Questions, answered.</SplitWords>
          </h2>
          <Magnetic className="mt-8">
            <Link href="/contact" className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-sm font-bold text-white transition-colors hover:bg-indigo-deep">
              Ask us directly
            </Link>
          </Magnetic>
        </div>
        <div data-reveal="up" className="divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer transition-colors hover:text-indigo list-none items-center justify-between gap-6 font-display text-lg font-bold sm:text-xl [&::-webkit-details-marker]:hidden">
                {q}
                <Plus className="size-5 shrink-0 transition-transform duration-300 group-open:rotate-45" aria-hidden />
              </summary>
              <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
