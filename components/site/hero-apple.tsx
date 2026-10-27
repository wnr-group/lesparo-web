import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { HeroActions } from "./hero-actions";
import { HeroPointer } from "./hero-pointer";
import { HeroSpotlight } from "./hero-spotlight";

type Cta = { label: string; href: string };
export type LineupModel = { id: string; slug: string; name: string; image: string; kid?: boolean };

/**
 * Homepage opening in the manner of an Apple product page: a very quiet white stage, one centred
 * headline in two tones (the first half in near-black, the rest in grey), one short line of copy and
 * two clear actions, then the whole range standing in a single line-up below.
 *
 * The headline, copy and actions come from the admin homepage content. The line-up is real catalogue
 * photography: full-length models standing on the white stage (the studio white of the photographs
 * is lifted to pure white to meet it), each linking to its product, kids drawn smaller than adults.
 *
 * Motion (after Dribbble and Scrolltide): headline words pull into focus, a soft disc opens behind the line-up,
 * a Buy online / Wholesale pill drives the main action, and a spotlight walks along the figures with a
 * "Now showing" chip. Also: the headline lines rise from behind a mask, the line-up eases up from below with a soft fade,
 * one figure after another from the centre outwards. As the page scrolls the line-up swells a little
 * and the headline softens (CSS scroll timeline, so nothing runs in JavaScript; static where
 * unsupported). Reduced motion: everything in place.
 */
export function HeroApple({ heading, subheading, primaryCta, secondaryCta, models }: { heading: string; subheading: string; primaryCta: Cta; secondaryCta: Cta; models: LineupModel[] }) {
  const words = heading.trim().split(/\s+/);
  const split = Math.ceil(words.length / 2);
  const lines = [words.slice(0, split).join(" "), words.slice(split).join(" ")].filter(Boolean);
  const mid = (models.length - 1) / 2;

  return (
    <section data-hero-apple aria-labelledby="hero-heading" className="relative isolate overflow-hidden bg-white text-[#1d1d1f]">
      <HeroPointer />
      <div className="mx-auto flex max-w-page flex-col items-center px-4 pt-[5svh] text-center sm:min-h-[calc(100svh-4rem)] sm:px-6 lg:min-h-[calc(100svh-4.5rem)] lg:px-10">
        <div className="hero-fade">
          <h1 id="hero-heading" className="font-sans text-[clamp(2.5rem,0.8rem+5vw,5.4rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
            {lines.map((line, li) => (
              <span key={line} className="block">
                {line.split(" ").map((word, wi) => (
                  <Fragment key={wi}>
                    {wi > 0 && " "}
                    <span className={li === 0 ? "hero-word inline-block" : "hero-word inline-block text-[#86868b]"} style={{ ["--w" as string]: li * 3 + wi }}>
                      {word}
                    </span>
                  </Fragment>
                ))}
              </span>
            ))}
          </h1>
          <p className="mx-auto mt-5 max-w-[36rem] text-[clamp(1rem,0.92rem+0.35vw,1.2rem)] leading-snug tracking-[-0.01em] text-[#6e6e73] animate-rise [animation-delay:0.55s]">{subheading}</p>
          <HeroActions primary={primaryCta} secondary={secondaryCta} />
        </div>

        <HeroSpotlight models={models.map((m) => ({ slug: m.slug, name: m.name }))} />

        {/* The line-up: one row of full-length models on the stage floor. */}
        <ul className="hero-lineup relative mt-10 flex h-[min(36svh,28rem,38vw)] sm:mt-auto sm:h-[min(36svh,28rem,46vw)] w-full max-w-[84rem] items-end justify-center gap-[2%] pt-6">
          {models.map((m, i) => {
            const d = Math.abs(i - mid);
            return (
              <li
                key={m.id}
                style={{ ["--d" as string]: `${0.9 + d * 0.12}s`, ["--k" as string]: 6 + d * 7, height: m.kid ? "74%" : "100%", aspectRatio: "513 / 655" }}
                className={`hero-figure relative shrink-0 mix-blend-multiply ${d > 1.5 ? "max-sm:hidden" : ""}`}
              >
                <Link href={`/products/${m.slug}`} aria-label={m.name} className="hero-depth group block size-full">
                  <div className="relative size-full">
                    <Image src={m.image} alt="" fill priority sizes="(min-width:1024px) 18vw, 30vw" className="cutout object-contain object-bottom transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:-translate-y-2" />
                  </div>
                  <span className="pointer-events-none absolute inset-x-0 -bottom-6 text-center text-xs font-medium text-[#6e6e73] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">{m.name}</span>
                </Link>
              </li>
            );
          })}
          {/* Zoom reveal: a soft disc opens behind the line-up. Last child, so figure order is unchanged. */}
          <li aria-hidden className="hero-halo" />
        </ul>
      </div>
    </section>
  );
}
