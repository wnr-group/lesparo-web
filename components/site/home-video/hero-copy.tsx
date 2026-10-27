"use client";

import { ArrowRight, ArrowUpRight, ShoppingBag, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";

export type HeroRange = { name: string; slug: string; image: string | null };

const CHANNELS = {
  retail: { label: "Buy online", icon: ShoppingBag, line: "See the price, choose your size, then Add to cart or Buy now.", cta: { label: "Shop the range", href: "/shop" } },
  wholesale: { label: "Wholesale", icon: Store, line: "Showrooms and wholesalers: tell us what you need and we will send a quotation.", cta: { label: "Enquire now", href: "/wholesale#enquire" } },
} as const;

/**
 * Hero copy with the motion vocabulary of Dribbble and Scrolltide:
 *   focus reveal   headline words pull from blur into sharp, one after another (CSS, on load)
 *   pill switch    Buy online / Wholesale: one control that swaps the line and the main action,
 *                  so retail and wholesale visitors each see their own route
 *   chip           a "Now showing" chip beside the film rolls through the real collections and links
 *                  the one currently named
 * The roll is the only timer: it runs while the tab is visible, pauses on hover or focus, and stays on
 * the first name for reduced motion.
 */
export function HeroCopy({ eyebrow, heading, subheading, ranges }: { eyebrow: string; heading: string; subheading: string; ranges: HeroRange[] }) {
  const [channel, setChannel] = useState<keyof typeof CHANNELS>("retail");
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const c = CHANNELS[channel];

  useEffect(() => {
    if (ranges.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => !document.hidden && setI((n) => (n + 1) % ranges.length), 2600);
    return () => window.clearInterval(t);
  }, [ranges.length, paused]);

  const current = ranges[i];
  return (
    <>
      <div className="hv-copy mx-auto flex h-full max-w-page flex-col justify-end px-4 pb-28 sm:px-6 lg:px-10 lg:pb-32 [text-shadow:0_2px_30px_rgb(10_12_40/0.65),0_1px_4px_rgb(10_12_40/0.4)]">
        <p className="hv-in eyebrow !text-white" style={{ ["--d" as string]: 0 }}>
          {eyebrow}
        </p>
        <h1 id="hero-heading" className="mt-4 max-w-[15ch] font-display text-[clamp(2.6rem,1.2rem+5.4vw,6.6rem)] font-extrabold leading-[0.9] tracking-[-0.05em]">
          {heading.split(" ").map((w, n) => (
            <span key={n}>
              <span className="hv-focus inline-block" style={{ ["--w" as string]: n }}>
                {w}
              </span>{" "}
            </span>
          ))}
        </h1>

        <p className="hv-in mt-6 max-w-md text-[1.05rem] font-medium leading-relaxed text-white" style={{ ["--d" as string]: 3 }}>
          {subheading}
        </p>

        <div className="hv-in mt-7 flex flex-wrap items-center gap-3 [text-shadow:none]" style={{ ["--d" as string]: 4 }}>
          {/* Pill switch: retail or wholesale. */}
          <div role="group" aria-label="How do you want to buy?" className="inline-flex rounded-full bg-indigo-deep/40 p-1 backdrop-blur-md ring-1 ring-white/40">
            {(Object.keys(CHANNELS) as (keyof typeof CHANNELS)[]).map((k) => {
              const Icon = CHANNELS[k].icon;
              const on = channel === k;
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => setChannel(k)} className={`inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-300 ${on ? "bg-white text-indigo-deep shadow-sm" : "text-white hover:bg-white/15"}`}>
                  <Icon className="size-4" aria-hidden /> {CHANNELS[k].label}
                </button>
              );
            })}
          </div>
          <ButtonLink href={c.cta.href} variant="accent" size="lg" className="hv-pop" key={channel}>
            {c.cta.label} <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
        <p aria-live="polite" className="sr-only">
          {c.line}
        </p>
      </div>

      {/* "Now showing" chip, after Dribbble's credit pill. */}
      {current && (
        <Link
          key={current.slug}
          href={`/collections/${current.slug}`}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="hv-chip absolute bottom-24 right-4 z-10 hidden items-center gap-3 rounded-full bg-white py-2 pl-2 pr-5 text-indigo-deep shadow-[0_18px_40px_-18px_rgb(10_12_40/0.6)] sm:flex lg:bottom-28 lg:right-10"
        >
          <span className="relative size-11 overflow-hidden rounded-full bg-[#eef0ff]">{current.image && <Image src={current.image} alt="" fill sizes="44px" className="cutout object-cover object-top" />}</span>
          <span className="leading-tight">
            <span className="block text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">Now showing</span>
            <span className="block font-display text-base font-bold">{current.name}</span>
          </span>
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      )}
    </>
  );
}
