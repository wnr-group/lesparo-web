import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CountUp } from "@/components/site/count-up";
import { Magnetic } from "@/components/site/pointer-fx";
import { SplitWords } from "@/components/site/split-words";
import { BUSINESS } from "@/lib/business";

/** The brand line, large, on a light panel beside a studio photograph. */
export function BrandStatement() {
  const points = ["Gents and kids wear", "Woven fabrics from the family trade", "Made in Erode, supplied across three states"];
  return (
    <section aria-labelledby="brand-line" className="mx-auto max-w-page px-4 py-6 sm:px-6 lg:px-10">
      <div className="grid overflow-clip rounded-[1.6rem] bg-[#f2f3f5] lg:min-h-[32rem] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 lg:py-16">
          <p className="eyebrow">The LESPARO promise</p>
          <h2 id="brand-line" className="mt-5 font-display text-[clamp(2.4rem,1.2rem+4.6vw,5.4rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
            <SplitWords>{BUSINESS.tagline}</SplitWords>
          </h2>
          <ul data-reveal="stagger" className="mt-10 space-y-3">
            {points.map((t) => (
              <li key={t} className="flex items-center gap-3 border-t border-ink/15 pt-3 text-lg text-ink-soft">
                <span aria-hidden className="size-2 rounded-full bg-ink" />
                {t}
              </li>
            ))}
          </ul>
          <Magnetic className="mt-10 w-fit">
          <Link href="/shop" className="group/btn inline-flex h-12 w-fit items-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-indigo-deep">
            Shop the range <ArrowRight className="size-4 transition-transform duration-300 group-hover/btn:translate-x-1" aria-hidden />
          </Link>
          </Magnetic>
        </div>
        <div className="group relative min-h-80 overflow-clip lg:min-h-0">
          <Image src="/looks/training.jpg" alt="" fill sizes="(min-width:1024px) 38vw, 100vw" className="scrub-parallax hz object-cover" style={{ objectPosition: "50% 30%" }} />
        </div>
      </div>
    </section>
  );
}

/** The story in one screen: a tall photograph beside the dates that are on the About page, and a way in to read more. */
export function BrandStory() {
  const facts = [
    ["1979", "The family cloth trade begins in Erode"],
    ["2017", "LESPARO launches as its own brand"],
    ["3 states", "Tamil Nadu, Kerala and Karnataka"],
  ];
  return (
    <section aria-labelledby="brand-story" className="py-16 lg:py-24">
      <div className="mx-auto grid max-w-page items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-10">
        <div data-reveal="clip" className="group relative aspect-[4/5] lg:sticky lg:top-32 lg:self-start overflow-clip rounded-[1.6rem] bg-[#22231f]">
          <Image src="/collections/range.jpg" alt="A LESPARO polo in brown knit, worn in the studio" fill sizes="(min-width:1024px) 42vw, 100vw" className="scrub-parallax hz object-cover" style={{ objectPosition: "50% 30%" }} />
        </div>
        <div>
          <p data-reveal="up" className="eyebrow">
            Our story
          </p>
          <h2 id="brand-story" className="mt-4 font-display text-[clamp(2rem,1.2rem+3.4vw,4.2rem)] font-extrabold uppercase leading-[0.98] tracking-tight">
            <SplitWords>Four decades of cloth, one new name.</SplitWords>
          </h2>
          <p data-reveal="up" className="mt-6 max-w-lg leading-relaxed text-ink-soft">
            LESPARO grows out of a family textile trade in Erode. Today it brings gents and kids casual wear to showrooms, alongside the family’s woven fabrics: lungi, kavi dhothies, towels and kerchiefs.
          </p>
          <dl data-reveal="stagger" className="mt-10 divide-y divide-line border-y border-line">
            {facts.map(([v, l]) => (
              <div key={v} className="grid grid-cols-[8.5rem_1fr] items-baseline gap-4 py-5">
                <dt className="font-display text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl">{v === "3 states" ? <><CountUp value={3} /> states</> : v}</dt>
                <dd className="text-ink-soft">{l}</dd>
              </div>
            ))}
          </dl>
          <Magnetic className="mt-8">
          <Link href="/about" className="group/btn inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-indigo-deep">
            Read our story <ArrowRight className="size-4 transition-transform duration-300 group-hover/btn:translate-x-1" aria-hidden />
          </Link>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}
