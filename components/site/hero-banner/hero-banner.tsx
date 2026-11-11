"use client";

import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Cta = { label: string; href: string };
/** A full-bleed campaign banner: the photograph under a dark fade, white headline, yellow button. */
type PhotoSlide = { kind: "photo"; id: string; eyebrow?: string; a: string; b: string; text: string; cta: Cta; img: string; imgM: string; pos: [number, number]; alt: string; bg: string };
/** A cut-out model on a pastel field with a bold shape behind (off by default, see SHOW_CUTOUT_CAMPAIGNS). */
type Campaign = { kind: "campaign"; id: string; a: string; b: string; text: string; cta: Cta; img: string; alt: string; bg: string; shape: "lifestyle" | "energy" | "minimal" };
type Slide = PhotoSlide | Campaign;

const NAVY = "#0c0f2e";
const BRAND = "Abija Exports · Erode, Tamil Nadu";

// Banner photographs (public/hero-bg): a wide image (the 2200:1228 shape) and a 9:16 phone crop of each. `pos` is the focal point as percentages.
// Slides 1 to 4 are the campaign banners. Slides 5 to 8 are category banners generated for LESPARO, each linking to its collection page.
const PHOTOS: PhotoSlide[] = [
  { kind: "photo", id: "lifestyle", a: "Everyday Wear.", b: "Made to Move.", text: "Soft cotton knits for men, women and kids.", cta: { label: "Shop the look", href: "/shop" }, img: "/hero-bg/banner-lifestyle.webp", imgM: "/hero-bg/banner-lifestyle-mobile.webp", pos: [50, 55], alt: "A young woman and man laughing together on old stone steps, wearing LESPARO tees and track pants", bg: NAVY },
  { kind: "photo", id: "sprint", a: "Move Better.", b: "Live Brighter.", text: "Plain, rib and jogger track pants that keep up.", cta: { label: "Shop track pants", href: "/collections/gents-tracks" }, img: "/hero-bg/banner-sprint.webp", imgM: "/hero-bg/banner-sprint-mobile.webp", pos: [55, 28], alt: "A runner mid-stride on a track in a mustard LESPARO tee and navy track pants", bg: NAVY },
  { kind: "photo", id: "minimal", a: "Style in", b: "Every Stitch.", text: "Everyday and training tees you will live in.", cta: { label: "Shop T-shirts", href: "/shop" }, img: "/hero-bg/banner-minimal.webp", imgM: "/hero-bg/banner-minimal-mobile.webp", pos: [55, 42], alt: "A woman seated in front of colourful arches, wearing a mauve LESPARO tee", bg: NAVY },
  { kind: "photo", id: "kids", a: "Little Ones.", b: "Big Energy.", text: "Tees, tracks and shorts for kids.", cta: { label: "Shop kids", href: "/collections/kids" }, img: "/hero-bg/banner-kids.webp", imgM: "/hero-bg/banner-kids-mobile.webp", pos: [72, 55], alt: "Two children jumping in a park at sunset in navy and yellow LESPARO outfits", bg: NAVY },

  { kind: "photo", id: "cat-boys", eyebrow: "Boys Collection", a: "Game On.", b: "All Day.", text: "T-shirts, tracks, shorts and 3/4ths for boys.", cta: { label: "Shop Boys", href: "/collections/boys" }, img: "/hero-bg/banner-category-boys.webp", imgM: "/hero-bg/banner-category-boys-mobile.webp", pos: [50, 50], alt: "Two boys standing on a rooftop at sunset, one holding a cricket bat, in LESPARO tees and track pants", bg: NAVY },
  { kind: "photo", id: "cat-women", eyebrow: "Women Collection", a: "Easy Days.", b: "Effortless Style.", text: "T-shirts, tracks and 3/4ths for women.", cta: { label: "Shop Women", href: "/collections/women" }, img: "/hero-bg/banner-category-women.webp", imgM: "/hero-bg/banner-category-women-mobile.webp", pos: [50, 50], alt: "A woman seated on a window seat in a bright loft, wearing a lavender LESPARO tee and grey track pants", bg: NAVY },
  { kind: "photo", id: "cat-hoodies", eyebrow: "Hoodies Collection", a: "Layer Up.", b: "Stay Cool.", text: "Hoodies for cooler days.", cta: { label: "Shop Hoodies", href: "/collections/hoodies" }, img: "/hero-bg/banner-category-hoodies.webp", imgM: "/hero-bg/banner-category-hoodies-mobile.webp", pos: [50, 50], alt: "A man in a slate-blue LESPARO zip hoodie standing on a city overpass", bg: NAVY },
  { kind: "photo", id: "cat-new-styles", eyebrow: "New Styles", a: "Just In.", b: "Fresh Looks.", text: "The newest styles from LESPARO.", cta: { label: "Shop New Styles", href: "/collections/new-styles" }, img: "/hero-bg/banner-category-new-styles.webp", imgM: "/hero-bg/banner-category-new-styles-mobile.webp", pos: [50, 50], alt: "A man in a cream LESPARO tee and black trousers posing against pastel colour blocks and arches", bg: NAVY },
];

// The pastel cut-out campaign slides. They carry the same messages as the first photo banners, so they are off by default.
// Set to true to play them after the photo banners.
const SHOW_CUTOUT_CAMPAIGNS = false;
const CAMPAIGNS: Campaign[] = [
  { kind: "campaign", id: "lifestyle", a: "Everyday Wear.", b: "Made to Move.", text: "Discover thoughtfully crafted apparel for everyday comfort and style.", cta: { label: "Shop Collection", href: "/shop" }, img: "/hero/banner-gents.webp", alt: "Model in a LESPARO polo and relaxed trousers", bg: "linear-gradient(115deg,#cfe3fb 0%,#eef3fb 45%,#fbe6d8 100%)", shape: "lifestyle" },
  { kind: "campaign", id: "energy", a: "Move Better.", b: "Live Brighter.", text: "Premium casualwear for every generation.", cta: { label: "Shop Collection", href: "/collections/gents-tracks" }, img: "/hero/banner-move.webp", alt: "Model in a LESPARO tee and cargo track pants", bg: "linear-gradient(115deg,#b9d4f6 0%,#dbe8fa 60%,#eaf2fc 100%)", shape: "energy" },
  { kind: "campaign", id: "minimal", a: "Style in", b: "Every Stitch.", text: "Knitted & woven fabrics from Erode.", cta: { label: "Shop Collection", href: "/shop" }, img: "/hero/banner-beige.webp", alt: "Model in a LESPARO tee and cargo pants", bg: "linear-gradient(115deg,#f8f2ea 0%,#efe9f6 55%,#e6ecfa 100%)", shape: "minimal" },
];
const THUMBS = [
  { src: "/looks/c5.jpg", label: "T-shirts", href: "/shop" },
  { src: "/looks/c1.jpg", label: "Track pants", href: "/collections/gents-tracks" },
  { src: "/looks/c4.jpg", label: "Cargo wear", href: "/collections/gents-tracks" },
];
const MS = 4000;
const SUN = "#ffd23f";
const SLIDES: Slide[] = [...PHOTOS, ...(SHOW_CUTOUT_CAMPAIGNS ? CAMPAIGNS : [])];

/**
 * Hero banner: eight full-bleed campaign banners in one format. The first four are campaign messages, the next four are category
 * banners (Boys, Women, Hoodies, New Styles) linking to their collection pages. A counter with a progress line, pause, arrows and
 * swipe control them, and the controls are light because every banner is dark. It advances by itself (every 4 seconds), pauses only
 * while a mouse is over it or when the pause button is pressed. Reduced motion keeps the automatic advance (with a plain fade) but
 * removes the entrance and drift animation.
 */
export function HeroBanner() {
  const slides = SLIDES;
  const total = slides.length;
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const touch = useRef(0);
  const running = !hover && !userPaused;
  // Photo banners are dark, so the controls turn light while one is showing.
  const light = slides[i]?.kind === "photo";

  const go = useCallback((n: number) => setI(((n % total) + total) % total), [total]);
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setI((v) => (v + 1) % total), MS);
    return () => clearTimeout(t);
  }, [i, running, total]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section
      aria-roledescription="carousel"
      aria-label="LESPARO campaigns and categories"
      className="hb relative overflow-hidden"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const d = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(d) > 50) go(i + (d < 0 ? 1 : -1));
      }}
    >
      <div className="relative h-[44rem] sm:h-[46rem] lg:h-[min(44rem,calc(100svh-6.5rem))] lg:min-h-[36rem]">
        {slides.map((s, n) => {
          const on = n === i;
          const near = Math.abs(n - i) <= 1 || (i === 0 && n === total - 1) || (i === total - 1 && n === 0);
          const photo = s.kind === "photo";
          return (
            <div key={s.id} role="group" aria-roledescription="slide" aria-label={`${n + 1} of ${total}`} aria-hidden={!on} data-on={on} className="hb-slide absolute inset-0" style={{ background: s.bg }}>
              {s.kind === "photo" && (
                <>
                  {/* A soft, darkened copy fills the space the full-height photograph does not reach. */}
                  {near && (
                    <>
                      <Image src={s.img} alt="" aria-hidden fill sizes="100vw" className="hb-blur hidden object-cover sm:block" />
                      <Image src={s.imgM} alt="" aria-hidden fill sizes="100vw" className="hb-blur object-cover sm:hidden" />
                      {/* The photograph itself, scaled to the full height of the hero and never cropped. Its left edge fades into the backdrop. */}
                      <div className="hb-fit hidden sm:block">
                        <Image src={s.img} alt={on ? s.alt : ""} fill priority={n === 0} sizes="(min-width:640px) 100vw, 0px" className="hb-photo object-cover" style={{ objectPosition: `${s.pos[0]}% ${s.pos[1]}%` }} />
                      </div>
                      <div className="hb-fit-m sm:hidden">
                        <Image src={s.imgM} alt={on ? s.alt : ""} fill priority={n === 0} sizes="(min-width:640px) 0px, 100vw" className="hb-photo object-cover" />
                      </div>
                    </>
                  )}
                  {/* A dark fade (from the foot on phones, from the left on wide screens) so the headline reads on every photograph. */}
                  <span aria-hidden className="hb-scrim absolute inset-0 z-[4]" />
                </>
              )}
              {s.kind === "campaign" && s.shape === "lifestyle" && (
                <>
                  <span aria-hidden className="hb-circle" style={{ right: "4%", top: "-14%", width: "34rem", height: "34rem", background: "rgba(255,255,255,.55)" }} />
                  <span aria-hidden className="hb-circle" style={{ right: "26%", bottom: "-24%", width: "26rem", height: "26rem", background: "rgba(251,214,196,.7)" }} />
                </>
              )}
              {s.kind === "campaign" && s.shape === "energy" && <span aria-hidden className="hb-band" />}
              {s.kind === "campaign" && s.shape === "minimal" && <span aria-hidden className="hb-arch" />}

              {s.kind === "campaign" && (
                <div className="hb-fig absolute bottom-0 right-0 h-[58%] w-full sm:h-[62%] lg:right-[5%] lg:h-[96%] lg:w-[48%]">
                  {near && <Image src={s.img} alt={on ? s.alt : ""} fill sizes="(min-width:1024px) 46vw, 90vw" className="object-contain object-bottom drop-shadow-[0_30px_30px_rgba(38,46,134,0.25)]" />}
                </div>
              )}

              {/* On phones a photograph's text sits at the foot (above the controls) so it never covers the faces; from tablet up it is top-left or centred. */}
              <div className={`relative z-10 mx-auto flex h-full max-w-[88rem] flex-col px-5 sm:px-8 lg:justify-center lg:pt-0 ${photo ? "justify-end pb-24 sm:justify-start sm:pb-0 sm:pt-9" : "justify-start pt-9"}`}>
                {s.kind === "photo" ? (
                  <p className="hb-up hidden w-fit items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white ring-1 ring-white/25 backdrop-blur sm:inline-flex">
                    <span aria-hidden className="size-1.5 rounded-full" style={{ background: SUN }} />
                    {s.eyebrow ?? BRAND}
                  </p>
                ) : (
                  <p className="hb-up text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-ink-soft">LESPARO by Abija Exports</p>
                )}
                <p role="heading" aria-level={2} className={`hb-up font-display mt-4 max-w-[44rem] font-bold leading-[0.98] tracking-[-0.04em] ${photo ? "text-white" : "text-ink"}`} style={{ ["--d" as string]: "90ms", fontSize: "clamp(2.6rem, 1rem + 4vw, 5rem)" }}>
                  {s.a}
                  <span className={`block ${photo ? "" : "text-indigo"}`} style={photo ? { color: SUN } : undefined}>
                    {s.b}
                  </span>
                </p>
                <p className={`hb-up mt-4 max-w-sm text-base leading-relaxed sm:text-lg ${photo ? "hidden text-white/85 sm:block" : "text-ink-soft"}`} style={{ ["--d" as string]: "190ms" }}>
                  {s.text}
                </p>
                <div className="hb-up mt-6 flex flex-wrap gap-3" style={{ ["--d" as string]: "290ms" }}>
                  <Link href={s.cta.href} tabIndex={on ? 0 : -1} className={`hb-cta inline-flex ${photo ? "text-ink hover:bg-white" : "bg-ink text-white hover:bg-indigo"}`} style={photo ? { background: SUN } : undefined}>
                    {s.cta.label} <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <Link href="/wholesale#enquire" tabIndex={on ? 0 : -1} className={`hb-cta border ${photo ? "hidden border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white hover:text-ink sm:inline-flex" : "inline-flex border-ink/25 bg-white/50 text-ink hover:border-ink hover:bg-white"}`}>
                    Wholesale Enquiry <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>

              {s.kind === "campaign" && s.shape === "minimal" && (
                <ul className="hb-up absolute right-5 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 lg:flex xl:right-10" style={{ ["--d" as string]: "420ms" }}>
                  {THUMBS.map((t) => (
                    <li key={t.label}>
                      <Link href={t.href} tabIndex={on ? 0 : -1} aria-label={t.label} className="relative block size-20 overflow-hidden rounded-2xl bg-white shadow-[0_14px_30px_-16px_rgba(38,46,134,0.5)] ring-1 ring-white transition-transform hover:-translate-y-1">
                        <Image src={t.src} alt="" fill sizes="80px" className="object-cover" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {/* Controls: counter with a progress line, pause and arrows. The counter is light over a photograph. */}
        <div className="absolute inset-x-5 bottom-5 z-20 flex items-center justify-between gap-4 sm:inset-x-8 lg:bottom-6">
          <div className={`flex items-center gap-3 text-[0.72rem] font-semibold tabular-nums tracking-[0.14em] transition-colors duration-500 ${light ? "text-white" : "text-ink"}`}>
            <span aria-live="off">{pad(i + 1)}</span>
            <span aria-hidden className={`block h-[3px] w-20 overflow-hidden rounded-full transition-colors duration-500 sm:w-32 ${light ? "bg-white/30" : "bg-ink/20"}`}>
              <span key={`${i}-${running}`} className="block h-full rounded-full" style={{ background: light ? SUN : NAVY, ...(running ? { animation: `hb-fill ${MS}ms linear forwards` } : { width: "100%" }) }} />
            </span>
            <span className={light ? "text-white/55" : "text-ink/50"}>{pad(total)}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" aria-label={userPaused ? "Play banner" : "Pause banner"} onClick={() => setUserPaused((p) => !p)} className="hb-arrow">
              {userPaused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
            </button>
            <button type="button" aria-label="Previous banner" onClick={() => go(i - 1)} className="hb-arrow">
              <ArrowLeft className="size-4" aria-hidden />
            </button>
            <button type="button" aria-label="Next banner" onClick={() => go(i + 1)} className="hb-arrow">
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .hb-slide { opacity: 0; pointer-events: none; transition: opacity .8s var(--ease-out-soft); }
        .hb-slide[data-on="true"] { opacity: 1; pointer-events: auto; }
        .hb-circle { position: absolute; border-radius: 50%; }
        .hb-band { position: absolute; inset: 0 0 0 auto; width: 62%; background: #ffd23f; clip-path: polygon(34% 0, 82% 0, 44% 100%, 0 100%); }
        .hb-arch { position: absolute; right: 12%; bottom: 0; width: min(30rem, 42vw); height: 88%; border-radius: 999px 999px 0 0; background: linear-gradient(180deg, #e5dcf6, #d6e4fa); }
        @media (max-width: 1023px) { .hb-band { width: 100%; clip-path: polygon(30% 35%, 100% 35%, 100% 100%, 0 100%); } .hb-arch { right: 8%; width: 70vw; height: 62%; } }
        .hb-fig { transform: translateX(8%); opacity: 0; }
        .hb-slide[data-on="true"] .hb-fig { animation: hb-in 1.1s var(--ease-out-soft) .15s forwards; }
        .hb-slide[data-on="true"] .hb-band { animation: hb-wipe 1s var(--ease-out-soft) both; }
        @keyframes hb-in { to { opacity: 1; transform: none; } }
        @keyframes hb-wipe { from { transform: translateX(14%); opacity: 0; } }
        .hb-up { opacity: 0; transform: translateY(22px); }
        .hb-slide[data-on="true"] .hb-up { animation: hb-rise .9s var(--ease-out-soft) var(--d, 0ms) forwards; }
        @keyframes hb-rise { to { opacity: 1; transform: none; } }
        @keyframes hb-fill { from { width: 0; } to { width: 100%; } }

        /* Photo banners. */
        .hb-blur { filter: blur(34px) brightness(0.7) saturate(1.15); transform: scale(1.25); }
        .hb-fit { position: absolute; top: 0; bottom: 0; right: 0; aspect-ratio: 2200 / 1228; -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 26%); mask-image: linear-gradient(90deg, transparent 0%, #000 26%); }
        .hb-fit-m { position: absolute; top: 0; bottom: 0; left: 50%; translate: -50% 0; aspect-ratio: 9 / 16; -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%); mask-image: linear-gradient(90deg, transparent 0%, #000 16%, #000 84%, transparent 100%); }
        .hb-photo { transform: scale(1.03); transition: transform 7s ease-out; }
        .hb-slide[data-on="true"] .hb-photo { transform: scale(1); }
        .hb-scrim { background: linear-gradient(0deg, rgba(12,15,46,.92) 0%, rgba(12,15,46,.7) 26%, rgba(12,15,46,.2) 52%, rgba(12,15,46,0) 72%); }
        @media (min-width: 640px) { .hb-scrim { background: linear-gradient(180deg, rgba(12,15,46,.86) 0%, rgba(12,15,46,.6) 38%, rgba(12,15,46,.12) 72%, rgba(12,15,46,.4) 100%); } }
        @media (min-width: 1024px) { .hb-scrim { background: linear-gradient(90deg, rgba(12,15,46,.82) 0%, rgba(12,15,46,.62) 28%, rgba(12,15,46,.2) 52%, rgba(12,15,46,0) 70%), linear-gradient(0deg, rgba(12,15,46,.45) 0%, rgba(12,15,46,0) 28%); } }

        .hb-cta { align-items: center; gap: .6rem; height: 3rem; padding: 0 1.5rem; border-radius: 999px; font-size: .85rem; font-weight: 600; transition: background-color .3s, color .3s, border-color .3s, transform .3s var(--ease-out-soft); }
        .hb-cta:active { transform: scale(.97); }
        .hb-arrow { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 999px; background: #fff; color: #0c0f2e; box-shadow: 0 8px 20px -10px rgb(12 15 46 / .5); transition: transform .3s var(--ease-out-soft); }
        .hb-arrow:hover { transform: scale(1.08); }
        @media (prefers-reduced-motion: reduce) { .hb-fig, .hb-up { opacity: 1; transform: none; animation: none !important; } .hb-band { animation: none !important; } .hb-photo { transform: none; transition: none; } }
      `}</style>
    </section>
  );
}
