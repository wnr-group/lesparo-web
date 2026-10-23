"use client";

import { ArrowRight, MoveHorizontal } from "lucide-react";
import { Fragment, useEffect, useRef, useSyncExternalStore } from "react";
import { ProductRing, type RingItem } from "@/components/site/product-ring";
import { ButtonLink } from "@/components/ui/button";

type Cta = { label: string; href: string };

/** Pinned scroll length of the banner; the sequence plays over the part beyond one screen. */
const STAGE_SVH = 180;

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
/** Where v sits between a and b, clamped to 0..1. */
const range = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(motionQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useReducedMotion = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(motionQuery).matches,
    () => false,
  );

type Fibre = { x: number; y: number; len: number; ang: number; curl: number; s: number; a: number };

/**
 * Homepage banner, scroll-driven ("rise"): the banner pins below the header and one scroll range
 * moves each layer at its own rate, the way a parallax "earthrise" is staged:
 *
 *   0.00 – 0.16  a veil of drifting cotton fibres clears off the lens
 *   0.00 – 0.50  the gradient backdrop settles from a slight zoom
 *   0.04 – 0.50  the product ring rises from behind a misty horizon (it keeps turning throughout)
 *   0.08 – 0.30  the headline resolves: wide tracking closes in and the blur clears
 *   0.26 – 0.46  the introduction and actions come up at the foot of the frame
 *   0.40 – 0.50  a small "drag to turn" hint fades in
 *
 * Kept deliberately sparse: one headline, the ring (front half only), one line of copy, two
 * actions and the hint.
 *
 * Styles are written straight to the elements from one rAF loop while the banner is on screen;
 * nothing goes through React state while scrolling. Reduced motion: no pin, no veil, the
 * finished composition at rest.
 */
export function HeroRise({ eyebrow, heading, subheading, primaryCta, secondaryCta, items }: { eyebrow: string; heading: string; subheading: string; primaryCta: Cta; secondaryCta: Cta; items: RingItem[] }) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const horizon = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const fibres = useRef<HTMLCanvasElement>(null);
  const hud = useRef<HTMLParagraphElement>(null);
  const words = heading.split(/\s+/);

  useEffect(() => {
    if (reduced) return;
    const rt = root.current!;
    const st = stage.current!;
    const canvas = fibres.current!;
    const ctx = canvas.getContext("2d")!;

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };
    sizeCanvas();
    const ro = new ResizeObserver(sizeCanvas);
    ro.observe(canvas);

    // Seeded, so the fibres fall the same way on every visit.
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const strands: Fibre[] = Array.from({ length: 120 }, () => ({
      x: rand(),
      y: rand(),
      len: 6 + rand() * 22,
      ang: rand() * Math.PI,
      curl: (rand() - 0.5) * 1.2,
      s: 0.3 + rand(),
      a: 0.25 + rand() * 0.5,
    }));

    let frame = 0;
    let lastP = -1;
    let lastTime = 0;

    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      const dt = lastTime ? Math.min(0.1, (time - lastTime) / 1000) : 1 / 60;
      lastTime = time;
      const r = rt.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      // Progress through the pin: 0 when the stage sticks below the header, 1 as it unpins.
      const pinTop = parseFloat(getComputedStyle(st).top) || 0;
      const span = Math.max(1, r.height - st.offsetHeight);
      const p = clamp((pinTop - r.top) / span);

      // Fibres drift every frame while the veil is up.
      const v = 1 - range(p, 0, 0.16);
      if (v > 0.001) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        const dpr = canvas.width / Math.max(1, w);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.lineCap = "round";
        for (const f of strands) {
          f.x += 0.008 * f.s * dt;
          f.y -= 0.005 * f.s * dt;
          f.ang += 0.15 * f.s * dt;
          if (f.x > 1.05) f.x -= 1.1;
          if (f.y < -0.05) f.y += 1.1;
          const cx = f.x * w;
          const cy = (f.y - p * 0.8) * h;
          const len = f.len * (1 + p * 3);
          const dx = Math.cos(f.ang) * len;
          const dy = Math.sin(f.ang) * len;
          ctx.globalAlpha = f.a * v;
          ctx.strokeStyle = f.s > 1.1 ? "#ffc82c" : "#e8eafc";
          ctx.lineWidth = 0.8 + f.s * 0.6;
          ctx.beginPath();
          ctx.moveTo(cx - dx / 2, cy - dy / 2);
          ctx.quadraticCurveTo(cx + dy * f.curl, cy - dx * f.curl, cx + dx / 2, cy + dy / 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (lastP < 0.16) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      if (Math.abs(p - lastP) < 0.00005) return;
      lastP = p;

      const clear = range(p, 0, 0.16);
      veil.current!.style.opacity = String(1 - clear);
      veil.current!.style.transform = `translate3d(0, ${-clear * 20}vh, 0) scale(${1 + clear * 0.2})`;
      veil.current!.style.visibility = clear >= 1 ? "hidden" : "";
      canvas.style.opacity = String(1 - clear);

      const settle = easeOut(range(p, 0, 0.5));
      sky.current!.style.transform = `translate3d(0, ${lerp(0, -5, p)}vh, 0) scale(${lerp(1.14, 1, settle)})`;

      const rise = easeOut(range(p, 0.04, 0.5));
      ring.current!.style.transform = `translate3d(0, ${lerp(38, 0, rise)}vh, 0) scale(${lerp(0.78, 0.86, rise)})`;
      horizon.current!.style.transform = `translate3d(0, ${lerp(10, 0, settle)}vh, 0)`;

      const tIn = easeOut(range(p, 0.08, 0.3));
      const t = title.current!;
      // Starts faintly visible, so the headline already shows through the veil on arrival.
      t.style.opacity = String(lerp(0.3, 1, tIn));
      t.style.letterSpacing = `${lerp(0.4, 0, tIn).toFixed(3)}em`;
      t.style.filter = tIn < 0.99 ? `blur(${((1 - tIn) * 10).toFixed(2)}px)` : "";

      const fIn = easeOut(range(p, 0.26, 0.46));
      foot.current!.style.opacity = String(fIn);
      foot.current!.style.transform = `translate3d(0, ${lerp(5, 0, fIn)}vh, 0)`;

      hud.current!.style.opacity = String(range(p, 0.4, 0.5));
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [reduced]);

  // Server HTML and first paint match progress 0, so nothing jumps when the loop takes over.
  const at0 = !reduced;

  return (
    <section ref={root} aria-label="LESPARO" className="relative" style={{ height: reduced ? undefined : `${STAGE_SVH}svh` }}>
      <div
        ref={stage}
        className={`relative overflow-hidden rounded-b-[2rem] bg-indigo text-white lg:rounded-b-[3rem] ${reduced ? "min-h-[46rem]" : "sticky top-[4.5rem] h-[calc(100svh-4.5rem)] min-h-[34rem]"}`}
      >
        {/* Backdrop: brand indigo, a lighter pool of light behind the ring and darker edges; settles from a slight zoom.
            Taller than the stage, so its edge never shows as it drifts up. */}
        <div
          ref={sky}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -inset-y-[10%] bg-[radial-gradient(60%_55%_at_50%_58%,#3a44b8_0%,var(--color-indigo)_60%,var(--color-indigo-deep)_120%)] will-change-transform"
          style={at0 ? { transform: "scale(1.14)" } : undefined}
        />

        {/* Lighter indigo floor the ring stands over; rises a little as the scene settles. */}
        <div
          ref={horizon}
          aria-hidden
          className="pointer-events-none absolute bottom-[-12%] left-1/2 h-[46%] w-[110%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(120_132_235/0.45),rgb(80_92_210/0.18)_60%,transparent)] will-change-transform"
          style={at0 ? { transform: "translate3d(0, 10vh, 0)" } : undefined}
        />

        {/* Faint woven grain over the indigo, so the surface reads as cloth rather than a flat fill. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Headline: resolves out of wide, blurred tracking. */}
        <div ref={title} className="absolute inset-x-0 top-[4%] z-10 px-4 text-center sm:top-[5%]" style={at0 ? { opacity: 0.3, letterSpacing: "0.4em", filter: "blur(10px)" } : undefined}>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-white/70">{eyebrow}</p>
          <h1 className="mx-auto mt-4 max-w-5xl font-display text-[clamp(2.5rem,1.1rem+4vw,5.25rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-white [text-shadow:0_8px_40px_rgb(10_12_50/0.35)]">
            {words.map((w, i) => (
              <Fragment key={i}>
                <span>{w}</span>
                {i < words.length - 1 && " "}
              </Fragment>
            ))}
          </h1>
        </div>

        {/* The ring rises from behind the horizon. (Its own floor shadow is hidden: this banner lights its own floor.
            The photo plates are white here, so each white-backed photo merges into its card.) */}
        <div
          ref={ring}
          className="absolute inset-x-0 top-[17%] will-change-transform [&_[role=region]>[aria-hidden]]:hidden [&_[role=region]_a>span:first-child]:bg-white max-sm:[&_[role=region]]:h-[19rem] max-sm:[&_[role=region]]:[--card-w:4.5rem] sm:top-[20%] lg:top-[13%]"
          style={at0 ? { transform: "translate3d(0, 38vh, 0) scale(0.78)" } : { transform: "scale(0.86)" }}
        >
          {/* Grounding under the cards' feet: a pool of light with a soft contact shadow in it. */}
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-[84%] h-32 w-[min(80%,52rem)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_255_255/0.12),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-[84%] h-12 w-[min(46%,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(5_6_30/0.55),transparent)]" />
          <ProductRing items={items} frontOnly />
        </div>

        {/* Introduction, the drag hint and the actions: one aligned row under a hairline. Comes up with the
            scroll, and is fully shown the moment anything in it takes keyboard focus. */}
        <div
          ref={foot}
          className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-page px-4 pb-6 focus-within:![transform:none] focus-within:!opacity-100 sm:px-6 lg:px-10 lg:pb-8"
          style={at0 ? { opacity: 0, transform: "translate3d(0, 5vh, 0)" } : undefined}
        >
          <div className="grid items-center gap-5 border-t border-white/15 pt-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-8 lg:pt-6">
            <p className="max-w-md text-[0.86rem] leading-relaxed text-white/70 sm:text-[0.92rem]">{subheading}</p>
            <p ref={hud} aria-hidden className="hidden items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-white/45 lg:flex" style={at0 ? { opacity: 0 } : undefined}>
              <MoveHorizontal className="size-3.5" /> Drag to turn
            </p>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <ButtonLink href={primaryCta.href} size="lg" variant="accent">
                {primaryCta.label} <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" aria-hidden />
              </ButtonLink>
              <ButtonLink href={secondaryCta.href} size="lg" variant="secondary" className="!border-white/50 !bg-white/5 !text-white before:!bg-white hover:!text-ink focus-visible:!text-ink">
                {secondaryCta.label}
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* Veil of cotton fibres on the lens; scrolling clears it. */}
        {!reduced && (
          <>
            <div
              ref={veil}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 will-change-transform"
              style={{
                background:
                  "radial-gradient(60% 50% at 30% 40%, rgb(70 80 200 / 0.7), transparent 70%), radial-gradient(50% 60% at 75% 60%, rgb(18 22 76 / 0.75), transparent 70%), radial-gradient(80% 80% at 50% 50%, rgb(38 46 134 / 0.82), rgb(18 22 76 / 0.95))",
              }}
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
                <p className="eyebrow !text-white/80">{eyebrow}</p>
                <p className="mt-3 font-display text-[0.8rem] font-bold uppercase tracking-[0.5em] text-white" style={{ marginRight: "-0.5em" }}>
                  Scroll to unfold
                </p>
                <span className="mt-6 inline-block animate-bounce text-sun">↓</span>
              </div>
            </div>
            <canvas ref={fibres} aria-hidden className="pointer-events-none absolute inset-0 z-20 size-full" />
          </>
        )}
      </div>
    </section>
  );
}
