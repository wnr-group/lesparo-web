"use client";

import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type BannerCategory = { name: string; slug: string; coverUrl: string; blurb?: string };

type Campaign = { kind: "campaign"; id: string; a: string; b: string; text: string; cta: { label: string; href: string }; img: string; alt: string; bg: string; shape: "lifestyle" | "energy" | "minimal" };
type CategorySlide = { kind: "category"; id: string; a: string; b: string; text: string; cta: { label: string; href: string }; img: string; alt: string; bg: string; tint: string };
type Slide = Campaign | CategorySlide;

// Campaign slides: real LESPARO studio photographs, cut out onto colour. Copy follows the banner brief.
const CAMPAIGNS: Campaign[] = [
  { kind: "campaign", id: "lifestyle", a: "Everyday Wear.", b: "Made to Move.", text: "Discover thoughtfully crafted apparel for everyday comfort and style.", cta: { label: "Shop Collection", href: "/shop" }, img: "/hero/banner-gents.webp", alt: "Model in a LESPARO polo and relaxed trousers", bg: "linear-gradient(115deg,#cfe3fb 0%,#eef3fb 45%,#fbe6d8 100%)", shape: "lifestyle" },
  { kind: "campaign", id: "energy", a: "Move Better.", b: "Live Brighter.", text: "Premium casualwear for every generation.", cta: { label: "Shop Collection", href: "/collections/gents-tracks" }, img: "/hero/banner-move.webp", alt: "Model in a LESPARO tee and cargo track pants", bg: "linear-gradient(115deg,#b9d4f6 0%,#dbe8fa 60%,#eaf2fc 100%)", shape: "energy" },
  { kind: "campaign", id: "minimal", a: "Style in", b: "Every Stitch.", text: "Knitted & woven fabrics from Erode.", cta: { label: "Shop Collection", href: "/shop" }, img: "/hero/banner-beige.webp", alt: "Model in a LESPARO tee and cargo pants", bg: "linear-gradient(115deg,#f8f2ea 0%,#efe9f6 55%,#e6ecfa 100%)", shape: "minimal" },
];
// Category slides cycle through these colour fields (sky, lavender, butter, peach).
const FIELDS = [
  { bg: "linear-gradient(115deg,#d4e6fb 0%,#eef4fc 100%)", tint: "#bcd6f7" },
  { bg: "linear-gradient(115deg,#e8e0f8 0%,#f5f1fc 100%)", tint: "#d6c9f2" },
  { bg: "linear-gradient(115deg,#fff0c4 0%,#fff9e4 100%)", tint: "#ffe08a" },
  { bg: "linear-gradient(115deg,#fde2d4 0%,#fff1e9 100%)", tint: "#f9c9b0" },
];
const THUMBS = [
  { src: "/looks/c5.jpg", label: "T-shirts", href: "/shop" },
  { src: "/looks/c1.jpg", label: "Track pants", href: "/collections/gents-tracks" },
  { src: "/looks/c4.jpg", label: "Cargo wear", href: "/collections/gents-tracks" },
];
const MS = 5500;

/**
 * Campaign banner. Three campaign slides in the style of the LESPARO banner brief (lifestyle, bold and energetic, modern minimal), then
 * one slide per catalogue category using that category's own cover photograph. It advances by itself (every 5.5 seconds), pauses only
 * while a mouse is over it or when the pause button is pressed, and has arrows, a counter and swipe. Reduced motion keeps the automatic
 * advance (with a plain fade) but removes the entrance and drift animation.
 */
export function HeroBanner({ categories = [] }: { categories?: BannerCategory[] }) {
  const slides: Slide[] = [
    ...CAMPAIGNS,
    ...categories.map<Slide>((c, n) => ({
      kind: "category",
      id: `cat-${c.slug}`,
      a: c.name,
      b: "Collection",
      text: c.blurb ?? `Browse the ${c.name} range from LESPARO.`,
      cta: { label: `Shop ${c.name}`, href: `/collections/${c.slug}` },
      img: c.coverUrl,
      alt: `${c.name}: LESPARO catalogue photograph`,
      bg: FIELDS[n % FIELDS.length].bg,
      tint: FIELDS[n % FIELDS.length].tint,
    })),
  ];
  const total = slides.length;
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const touch = useRef(0);
  const running = !hover && !userPaused;

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
      <div className="relative h-[40rem] sm:h-[42rem] lg:h-[min(37rem,calc(100svh-6.5rem))] lg:min-h-[32rem]">
        {slides.map((s, n) => {
          const on = n === i;
          const near = Math.abs(n - i) <= 1 || (i === 0 && n === total - 1) || (i === total - 1 && n === 0);
          return (
            <div key={s.id} role="group" aria-roledescription="slide" aria-label={`${n + 1} of ${total}`} aria-hidden={!on} data-on={on} className="hb-slide absolute inset-0" style={{ background: s.bg }}>
              {s.kind === "campaign" && s.shape === "lifestyle" && (
                <>
                  <span aria-hidden className="hb-circle" style={{ right: "4%", top: "-14%", width: "34rem", height: "34rem", background: "rgba(255,255,255,.55)" }} />
                  <span aria-hidden className="hb-circle" style={{ right: "26%", bottom: "-24%", width: "26rem", height: "26rem", background: "rgba(251,214,196,.7)" }} />
                </>
              )}
              {s.kind === "campaign" && s.shape === "energy" && <span aria-hidden className="hb-band" />}
              {s.kind === "campaign" && s.shape === "minimal" && <span aria-hidden className="hb-arch" />}
              {s.kind === "category" && (
                <span aria-hidden className="hb-ghost hidden lg:block">
                  {s.a}
                </span>
              )}
              {s.kind === "category" && <span aria-hidden className="hb-circle" style={{ right: "6%", top: "-18%", width: "36rem", height: "36rem", background: s.tint, opacity: 0.55 }} />}

              {s.kind === "campaign" ? (
                <div className="hb-fig absolute bottom-0 right-0 h-[58%] w-full sm:h-[62%] lg:right-[5%] lg:h-[96%] lg:w-[48%]">
                  {near && <Image src={s.img} alt={on ? s.alt : ""} fill priority={n === 0} sizes="(min-width:1024px) 46vw, 90vw" className="object-contain object-bottom drop-shadow-[0_30px_30px_rgba(38,46,134,0.25)]" />}
                </div>
              ) : (
                <div className="hb-fig absolute bottom-0 right-5 h-[56%] w-[calc(100%-2.5rem)] sm:right-8 sm:w-[calc(100%-4rem)] lg:bottom-[6%] lg:right-[7%] lg:h-[88%] lg:w-[40%]">
                  <div className="absolute inset-0 overflow-hidden rounded-t-[999px] rounded-b-[1.5rem] bg-white shadow-[0_40px_70px_-40px_rgba(38,46,134,0.55)] ring-1 ring-white lg:rounded-b-[2rem]">
                    {near && <Image src={s.img} alt={on ? s.alt : ""} fill sizes="(min-width:1024px) 34vw, 90vw" className="object-cover object-top" />}
                  </div>
                </div>
              )}

              <div className="relative z-10 mx-auto flex h-full max-w-[88rem] flex-col justify-start px-5 pt-9 sm:px-8 lg:justify-center lg:pt-0">
                <p className="hb-up text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-ink-soft">{s.kind === "category" ? "Shop by category" : "LESPARO by Abija Exports"}</p>
                <p role="heading" aria-level={2} className="hb-up font-display mt-4 max-w-[44rem] font-bold leading-[0.98] tracking-[-0.04em] text-ink" style={{ ["--d" as string]: "90ms", fontSize: "clamp(2.6rem, 1rem + 4vw, 5rem)" }}>
                  {s.a}
                  <span className="block text-indigo">{s.b}</span>
                </p>
                <p className="hb-up mt-4 max-w-sm text-base leading-relaxed text-ink-soft sm:text-lg" style={{ ["--d" as string]: "190ms" }}>
                  {s.text}
                </p>
                <div className="hb-up mt-6 flex flex-wrap gap-3" style={{ ["--d" as string]: "290ms" }}>
                  <Link href={s.cta.href} tabIndex={on ? 0 : -1} className="hb-cta bg-ink text-white hover:bg-indigo">
                    {s.cta.label} <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <Link href="/wholesale#enquire" tabIndex={on ? 0 : -1} className="hb-cta border border-ink/25 bg-white/50 text-ink hover:border-ink hover:bg-white">
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

        {/* Controls: counter with a progress line, pause and arrows. */}
        <div className="absolute inset-x-5 bottom-5 z-20 flex items-center justify-between gap-4 sm:inset-x-8 lg:bottom-6">
          <div className="flex items-center gap-3 text-[0.72rem] font-semibold tabular-nums tracking-[0.14em] text-ink">
            <span aria-live="off">{pad(i + 1)}</span>
            <span aria-hidden className="block h-[3px] w-20 overflow-hidden rounded-full bg-ink/20 sm:w-32">
              <span key={`${i}-${running}`} className="block h-full rounded-full bg-ink" style={running ? { animation: `hb-fill ${MS}ms linear forwards` } : { width: "100%" }} />
            </span>
            <span className="text-ink/50">{pad(total)}</span>
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
        .hb-ghost { position: absolute; left: 24%; bottom: -0.12em; font-family: var(--font-display); font-weight: 800; font-size: clamp(8rem, 17vw, 17rem); letter-spacing: -0.05em; line-height: 1; white-space: nowrap; color: rgba(255,255,255,.6); pointer-events: none; user-select: none; }
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
        .hb-cta { display: inline-flex; align-items: center; gap: .6rem; height: 3rem; padding: 0 1.5rem; border-radius: 999px; font-size: .85rem; font-weight: 600; transition: background-color .3s, border-color .3s, transform .3s var(--ease-out-soft); }
        .hb-cta:active { transform: scale(.97); }
        .hb-arrow { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 999px; background: #fff; color: #0c0f2e; box-shadow: 0 8px 20px -10px rgb(12 15 46 / .5); transition: transform .3s var(--ease-out-soft); }
        .hb-arrow:hover { transform: scale(1.08); }
        @media (prefers-reduced-motion: reduce) { .hb-fig, .hb-up { opacity: 1; transform: none; animation: none !important; } .hb-band { animation: none !important; } }
      `}</style>
    </section>
  );
}
