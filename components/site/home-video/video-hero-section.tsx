import { existsSync } from "node:fs";
import { join } from "node:path";
import type { HomepageContent } from "@/lib/validation/content";
import { HeroCopy, type HeroRange } from "./hero-copy";
import { HeroVideo } from "./video-hero";
import "./video.css";

/** Drop the film at public/video/lesparo-hero.mp4 (and optionally .webm); it plays automatically. */
const FILM = { mp4: "/video/lesparo-hero.mp4", webm: "/video/lesparo-hero.webm" };

/**
 * Cinematic hero: the film runs almost ungraded so the picture stays clearly visible. The only shade is
 * a thin one at the foot, under the facts strip; the type stays readable through its own text shadow,
 * so there is no panel or banner over the film.
 */
export function VideoHero({ hero, ranges }: { hero: HomepageContent["hero"]; ranges: HeroRange[] }) {
  const hasFilm = existsSync(join(process.cwd(), "public", "video", "lesparo-hero.mp4"));

  return (
    <section aria-labelledby="hero-heading" className="relative isolate h-[calc(100svh-var(--hdr))] min-h-[36rem] overflow-hidden text-white">
      <div className="hv-film absolute inset-0 -z-10">
        <div className="hv-frame absolute inset-0 overflow-hidden">
          <div aria-hidden className="hv-weave absolute inset-0" />
          <div className="hv-zoom absolute inset-0">{hasFilm && <HeroVideo src={FILM.mp4} webm={FILM.webm} />}</div>
        </div>
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgb(18_22_76/0.5),transparent_28%)]" />
      </div>

      <HeroCopy eyebrow={hero.eyebrow || "Abija Exports · Erode, Tamil Nadu"} heading={hero.heading} subheading={hero.subheading} ranges={ranges} />

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
