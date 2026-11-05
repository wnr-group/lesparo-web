"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

type Slide = {
  id: string;
  /** object-position of the photograph inside its frame, as percentages. */
  pos: [number, number];
  /** The 3D garment this slide goes with. */
  product: "tee" | "pants" | "look";
  caption: [string, string];
  cta: { label: string; href: string };
};


// Campaign images generated in Google Flow for LESPARO (public/hero-bg). Illustrative, not catalogue product photos.
export const SLIDES: Slide[] = [
  { id: "lifestyle", pos: [50, 55], product: "look", caption: ["Everyday Wear.", "Made to Move."], cta: { label: "Shop the look", href: "/shop" } },
  { id: "sprint", pos: [55, 28], product: "pants", caption: ["Move Better.", "Live Brighter."], cta: { label: "Shop track pants", href: "/collections/gents-tracks" } },
  { id: "minimal", pos: [55, 42], product: "tee", caption: ["Style in", "Every Stitch."], cta: { label: "Shop T-shirts", href: "/shop" } },
  { id: "kids", pos: [72, 55], product: "tee", caption: ["Little Ones.", "Big Energy."], cta: { label: "Shop kids", href: "/collections/kids" } },
];
export const PRODUCT_FOR_SLIDE = SLIDES.map((s) => s.product);
export const SLIDE_FOR_PRODUCT: Record<string, number> = { look: 0, pants: 1, tee: 2 };

/**
 * The hero's banner. On wide screens it is a clear, full-colour rounded frame on the right: the campaign photographs crossfade, each
 * with a caption and a "shop" link. The hero controls which slide
 * is showing (so the 3D garment can follow it); the dots here let a visitor pick one. On phones it is a soft background under a light wash.
 */
export type BannerProgress = "run" | "paused" | "hold";

export function HeroBanner({ index, onSelect, exploring, stage3d = false, progress = "run", onStep }: { index: number; onSelect: (n: number) => void; exploring: boolean; stage3d?: boolean; progress?: BannerProgress; onStep?: (d: number) => void }) {
  const frameBox = "pointer-events-none absolute inset-0";

  return (
    <>
      {/* The photographs. */}
      <div aria-hidden data-stage={stage3d} className={`hbg z-0 overflow-hidden bg-[#0c0f2e] ${frameBox} `}>
        {/* The soft stage the 3D garments stand on when 3D is open. */}
        <span className="hbg-stage absolute inset-0" />
        {SLIDES.map((s, n) => {
          const on = n === index;
          const near = on || n === (index + 1) % SLIDES.length;
          return (
            <div key={s.id} className="hbg-slide absolute inset-0" data-on={on}>
              {near && (
                <>
                  {/* A soft, darkened copy of the photograph fills the space the full-height photograph does not reach. */}
                  <Image src={`/hero-bg/banner-${s.id}.webp`} alt="" aria-hidden fill sizes="100vw" className="hbg-blur hidden object-cover sm:block" />
                  <Image src={`/hero-bg/banner-${s.id}-mobile.webp`} alt="" aria-hidden fill sizes="100vw" className="hbg-blur object-cover sm:hidden" />
                  {/* The photograph itself, scaled to the full height of the hero, never cropped. Its left edge fades into the backdrop. */}
                  <div className="hbg-fit hidden sm:block">
                    <Image src={`/hero-bg/banner-${s.id}.webp`} alt="" fill priority={n === 0} sizes="(min-width:640px) 100vw, 0px" className="hbg-img object-cover" />
                  </div>
                  <div className="hbg-fit-m sm:hidden">
                    <Image src={`/hero-bg/banner-${s.id}-mobile.webp`} alt="" fill priority={n === 0} sizes="(min-width:640px) 0px, 100vw" className="hbg-img object-cover" />
                  </div>
                </>
              )}
            </div>
          );
        })}
        {/* A dark-to-clear scrim (from the bottom on phones, from the left on wide screens) so the headline reads on every photograph. */}
        <span className="hbg-scrim absolute inset-0 z-[4]" />
      </div>

      {/* The counter and progress dots, above the 3D viewer so they can be used. Wide screens only; hidden while looking closer. */}
      <div className={`${frameBox} z-[15] block transition-opacity duration-300 ${exploring ? "opacity-0" : "opacity-100"}`} style={{ pointerEvents: "none" }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className={`${exploring ? "pointer-events-none" : "pointer-events-auto"} absolute bottom-4 left-5 flex items-center gap-3 text-white sm:gap-5 lg:bottom-7 lg:left-[max(3.5rem,calc(50vw-39.25rem+1rem))]`}>
            <span className="font-sport text-[0.95rem] font-extrabold italic tabular-nums tracking-wide">
              {String(index + 1).padStart(2, "0")}
              <span className="text-white/50"> / {String(SLIDES.length).padStart(2, "0")}</span>
            </span>
            <div className="flex gap-2" role="tablist" aria-label="Choose a banner">
              {SLIDES.map((s, n) => (
                <button key={s.id} type="button" role="tab" aria-selected={n === index} aria-label={`Banner ${n + 1}`} tabIndex={exploring ? -1 : 0} onClick={() => onSelect(n)} className="hbg-dot grid h-6 place-items-center">
                  <span className="block h-[3px] w-6 overflow-hidden rounded-full bg-white/30 sm:w-10">
                    <span key={`${n === index}-${index}-${progress}`} className="block h-full rounded-full bg-[#ffd23f]" style={n === index ? (progress === "hold" ? { width: "100%" } : { animation: "hbg-fill 6000ms linear forwards", animationPlayState: progress === "paused" ? "paused" : "running" }) : n < index ? { width: "100%" } : { width: 0 }} />
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className={`${exploring ? "pointer-events-none" : "pointer-events-auto"} absolute bottom-3 right-4 flex gap-2 sm:bottom-4 lg:bottom-7 lg:right-10 lg:gap-2.5 xl:right-14`}>
            <button type="button" aria-label="Previous banner" tabIndex={exploring ? -1 : 0} onClick={() => onStep?.(-1)} className="hbg-arrow">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" aria-label="Next banner" tabIndex={exploring ? -1 : 0} onClick={() => onStep?.(1)} className="hbg-arrow">
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .hbg-scrim { background: linear-gradient(0deg, rgba(12,15,46,.88) 0%, rgba(12,15,46,.62) 42%, rgba(12,15,46,.18) 100%); transition: opacity .8s var(--ease-out-soft); }
        @media (min-width: 1024px) { .hbg-scrim { background: linear-gradient(90deg, rgba(12,15,46,.82) 0%, rgba(12,15,46,.62) 28%, rgba(12,15,46,.2) 52%, rgba(12,15,46,0) 70%), linear-gradient(0deg, rgba(12,15,46,.45) 0%, rgba(12,15,46,0) 28%); } }
        .hbg[data-stage="true"] .hbg-scrim { opacity: 0; }
        .hbg-stage { opacity: 0; background: radial-gradient(60% 60% at 50% 38%, rgba(255,255,255,.95), transparent 70%), linear-gradient(135deg, #fbf1dc 0%, #e4e8fa 55%, #f6dde2 100%); transition: opacity .8s var(--ease-out-soft); }
        .hbg[data-stage="true"] .hbg-stage { opacity: 1; z-index: 3; }
        .hbg-blur { filter: blur(34px) brightness(0.7) saturate(1.15); transform: scale(1.25); }
        .hbg-fit { position: absolute; top: 0; bottom: 0; right: 0; aspect-ratio: 2200 / 1228; -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 26%); mask-image: linear-gradient(90deg, transparent 0%, #000 26%); }
        .hbg-fit-m { position: absolute; top: 0; bottom: 0; left: 50%; translate: -50% 0; aspect-ratio: 9 / 16; -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%); mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%); }
        .hbg-slide { opacity: 0; z-index: 1; transition: opacity 0.2s linear 1.4s; }
        .hbg-slide[data-on="true"] { opacity: 1; z-index: 2; transition: opacity 1.4s var(--ease-out-soft); }
        .hbg-img { transform: scale(1.03); transition: transform 12s ease-out; }
        .hbg-slide[data-on="true"] .hbg-img { transform: scale(1); }
        @keyframes hbg-fill { from { width: 0; } to { width: 100%; } }
        .hbg-arrow { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 999px; background: rgba(255,255,255,.14); color: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.4); backdrop-filter: blur(10px); transition: background-color .3s, color .3s, transform .3s var(--ease-out-soft); }
        @media (min-width: 1024px) { .hbg-arrow { width: 3rem; height: 3rem; } }
        .hbg-arrow:focus-visible, .hbg-dot:focus-visible { outline: 2px solid #ffd23f; outline-offset: 3px; }
        .hbg-arrow:hover { background: #fff; color: #12164c; transform: scale(1.08); }
        .hbg-arrow:active { transform: scale(.94); }
        .hbg-cap { animation: hbg-cap .9s var(--ease-out-soft) both; }
        @keyframes hbg-cap { from { opacity: 0; transform: translateY(14px); } }
        .hbg-cta { display: inline-flex; align-items: center; gap: .5rem; height: 2.6rem; padding: 0 1.2rem; border-radius: 999px; background: #ffd23f; color: #0c0f2e; font-size: .82rem; font-weight: 700; box-shadow: 0 10px 24px -12px rgba(0,0,0,.6); transition: background-color .3s, transform .3s var(--ease-out-soft); }
        .hbg-cta:hover { background: #fff; transform: translateY(-2px); }
        @media (prefers-reduced-motion: reduce) { .hbg-img { transform: none; transition: none; } .hbg-cap { animation: none; } }
      `}</style>
    </>
  );
}
