"use client";

import { ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import "./hero3d.css";

// three.js is fetched on the client only, after the text has painted.
const Scene = dynamic(() => import("./hero-3d-scene"), { ssr: false });

type Cta = { label: string; href: string };

/**
 * An editorial hero: the headline and two actions on the left, one large interactive 3D garment on the right.
 * All text is real DOM; the 3D scene is a separate, lazily loaded component.
 */
export function Hero3D({ heading, subheading, cta, secondary, model, poster, modelLabel }: { heading: string; subheading: string; cta: Cta; secondary: Cta; model: string; poster: string; modelLabel: string }) {
  const [first, ...rest] = heading.split(". ");
  return (
    <section aria-labelledby="hero3d-heading" className="h3 relative isolate overflow-hidden bg-paper">
      <div aria-hidden className="h3-light" />
      <div className="relative mx-auto grid min-h-[calc(100svh-var(--hdr,4.5rem))] max-w-[96rem] grid-cols-1 items-center gap-0 px-5 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:px-[max(2rem,5vw)]">
        <div className="relative z-10 pb-2 pt-12 lg:py-20">
          <h1 id="hero3d-heading" className="font-display text-[clamp(2.4rem,1.2rem+4.2vw,5rem)] leading-[1.02] tracking-[-0.035em] text-ink">
            <span className="h3-line block font-light" style={{ ["--i" as string]: 0 }}>
              {first}.
            </span>
            <span className="h3-line block font-bold text-indigo" style={{ ["--i" as string]: 1 }}>
              {rest.join(". ")}
            </span>
          </h1>
          <p className="h3-line mt-6 max-w-[30rem] text-[1.05rem] leading-relaxed text-ink-soft" style={{ ["--i" as string]: 2 }}>
            {subheading}
          </p>
          <div className="h3-line mt-9 flex flex-wrap gap-3" style={{ ["--i" as string]: 3 }}>
            <Link href={cta.href} className="inline-flex h-12 items-center gap-2 bg-ink px-7 text-[0.78rem] font-bold uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:bg-indigo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo">
              {cta.label} <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href={secondary.href} className="inline-flex h-12 items-center border border-ink/30 px-7 text-[0.78rem] font-bold uppercase tracking-[0.16em] text-ink transition-colors duration-200 hover:border-ink hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo">
              {secondary.label}
            </Link>
          </div>
        </div>

        {/* The viewer keeps its height from the first paint so nothing shifts when the scene arrives. */}
        <div className="h3-stage relative h-[68svh] min-h-[26rem] w-full lg:h-[calc(100svh-var(--hdr,4.5rem))] lg:min-h-[38rem]">
          <Scene src={model} poster={poster} label={modelLabel} />
        </div>
      </div>
    </section>
  );
}
