import { existsSync } from "node:fs";
import { join } from "node:path";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import type { HomepageContent } from "@/lib/validation/content";
import { HeroVideo } from "./video-hero";
import "./video.css";

/** Drop the film at public/video/lesparo-hero.mp4 (and optionally .webm); it plays automatically. */
const FILM = { mp4: "/video/lesparo-hero.mp4", webm: "/video/lesparo-hero.webm" };

/**
 * Cinematic hero: the film runs almost ungraded so the cloth stays clearly visible. Only two soft
 * shades sit over it, one at the foot (under the facts strip) and one at the left (under the headline),
 * and the headline carries its own faint shadow, so nothing hides the picture.
 */
export function VideoHero({ hero }: { hero: HomepageContent["hero"] }) {
  const hasFilm = existsSync(join(process.cwd(), "public", "video", "lesparo-hero.mp4"));

  return (
    <section aria-labelledby="hero-heading" className="relative isolate h-[calc(100svh-var(--hdr))] min-h-[36rem] overflow-hidden text-white">
      <div className="hv-film absolute inset-0 -z-10">
        <div aria-hidden className="hv-weave absolute inset-0" />
        {hasFilm && <HeroVideo src={FILM.mp4} webm={FILM.webm} />}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgb(18_22_76/0.42),transparent_62%),linear-gradient(to_top,rgb(18_22_76/0.55),transparent_38%)]" />
      </div>

      <div className="hv-copy mx-auto flex h-full max-w-page flex-col justify-end px-4 pb-28 sm:px-6 lg:px-10 lg:pb-32 [text-shadow:0_2px_28px_rgb(10_12_40/0.45)]">
        <p className="hv-in eyebrow !text-white" style={{ ["--d" as string]: 0 }}>
          {hero.eyebrow || "Abija Exports · Erode, Tamil Nadu"}
        </p>
        <h1 id="hero-heading" className="hv-in mt-5 max-w-[14ch] font-display text-[clamp(2.8rem,1.3rem+6.4vw,8rem)] font-extrabold leading-[0.9] tracking-[-0.05em]" style={{ ["--d" as string]: 1 }}>
          {hero.heading}
        </h1>
        <p className="hv-in mt-6 max-w-lg text-lg leading-relaxed text-white" style={{ ["--d" as string]: 2 }}>
          {hero.subheading}
        </p>
        <div className="hv-in mt-8 flex flex-wrap items-center gap-3 [text-shadow:none]" style={{ ["--d" as string]: 3 }}>
          <ButtonLink href={hero.primaryCta.href} variant="accent" size="lg">
            {hero.primaryCta.label} <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <Link href={hero.secondaryCta.href} className="inline-flex h-13 items-center gap-2 rounded-full border border-white/70 bg-white/10 px-6 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-white hover:text-indigo-deep">
            {hero.secondaryCta.label}
          </Link>
        </div>
      </div>

      <dl className="absolute inset-x-0 bottom-0 mx-auto grid max-w-page grid-cols-3 border-t border-white/35 px-4 sm:px-6 lg:px-10">
        {[
          ["1979", "Family trade begins"],
          ["3 states", "Tamil Nadu, Kerala, Karnataka"],
          ["2017", "LESPARO launches"],
        ].map(([v, l], i) => (
          <div key={v} className={`py-4 lg:py-5 ${i ? "border-l border-white/35 pl-4 sm:pl-8" : ""}`}>
            <dd className="font-display text-[clamp(1.2rem,0.9rem+1.4vw,2rem)] font-extrabold leading-none tracking-[-0.03em]">{v}</dd>
            <dt className="mt-1.5 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-white/85">{l}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
