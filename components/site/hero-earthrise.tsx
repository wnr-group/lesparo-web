"use client";

import { ArrowRight, MoveHorizontal } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { ProductRing, type RingItem } from "@/components/site/product-ring";
import { ButtonLink } from "@/components/ui/button";

type Cta = { label: string; href: string };

/** Length of the entrance sequence, played once on load. */
const ENTER_MS = 6500;

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
 * Homepage banner, "earthrise": stacked layers, the way SELENE stages its Earthrise, each moved
 * at its own rate so the frame reads as depth rather than a flat picture. No scroll effects: the
 * sequence plays once, slowly, on load (`ENTER_MS`), then the banner is an ordinary section.
 * Back to front:
 *
 *   sky → LESPARO wordmark → product ring → closing rim → copy
 *
 *   (fractions of the entrance)
 *   0.00 – 0.22  a veil of drifting cotton fibres clears off the lens
 *   0.00 – 0.80  the sky settles from a slight zoom
 *   0.08 – 0.32  LESPARO resolves out of wide, blurred tracking behind the ring…
 *   0.40 – 0.52  …and yields as the ring climbs in front of it
 *   0.13 – 0.83  the ring rises up into the frame (it keeps turning throughout)
 *   0.42 – 0.90  a dark rim closes in around the view
 *   0.53 – 0.77  the headline resolves; 0.67 – 0.93 the introduction and actions come up
 *
 * Styles are written straight to the elements from one rAF loop, which stops when the entrance
 * ends; nothing goes through React state. Reduced motion: no veil, the finished composition at rest.
 */
export function HeroEarthrise({ eyebrow, heading, subheading, primaryCta, secondaryCta, items }: { eyebrow: string; heading: string; subheading: string; primaryCta: Cta; secondaryCta: Cta; items: RingItem[] }) {
  const reduced = useReducedMotion();
  const sky = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLParagraphElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const rim = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const fibres = useRef<HTMLCanvasElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (reduced) return;
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
    let start = 0;

    const move = (el: HTMLElement, y: number, scale = 1, opacity?: number) => {
      el.style.transform = `translate3d(0, ${y.toFixed(3)}vh, 0) scale(${scale.toFixed(4)})`;
      if (opacity !== undefined) el.style.opacity = String(opacity);
    };

    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      const dt = lastTime ? Math.min(0.1, (time - lastTime) / 1000) : 1 / 60;
      lastTime = time;
      // Progress through the entrance: 0 on the first frame, 1 when it has played out.
      if (!start) start = time;
      const p = clamp((time - start) / ENTER_MS);

      // Fibres drift every frame while the veil is up.
      const v = 1 - range(p, 0, 0.22);
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
      } else if (lastP < 0.22) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      if (Math.abs(p - lastP) < 0.00005) return;
      lastP = p;

      const clear = range(p, 0, 0.22);
      veil.current!.style.opacity = String(1 - clear);
      veil.current!.style.transform = `translate3d(0, ${-clear * 20}vh, 0) scale(${1 + clear * 0.2})`;
      veil.current!.style.visibility = clear >= 1 ? "hidden" : "";
      canvas.style.opacity = String(1 - clear);

      // Far → near, each at its own rate.
      move(sky.current!, lerp(0, -5, p), lerp(1.14, 1, easeOut(range(p, 0, 0.8))));

      const mIn = easeOut(range(p, 0.08, 0.32));
      // Gone before the headline starts, so the two never overlap.
      const mOut = range(p, 0.4, 0.52);
      const m = mark.current!;
      m.style.opacity = String(mIn * (1 - mOut));
      m.style.letterSpacing = `${lerp(0.9, 0.32, mIn).toFixed(3)}em`;
      m.style.filter = mIn < 0.99 ? `blur(${((1 - mIn) * 12).toFixed(2)}px)` : "";
      move(m, -p * 8 - mOut * 4);

      const rise = easeOut(range(p, 0.13, 0.83));
      move(ring.current!, lerp(56, 0, rise), lerp(0.78, 0.86, rise));

      const close = easeOut(range(p, 0.42, 0.9));
      move(rim.current!, 0, lerp(1.6, 1, close), close);

      const tIn = easeOut(range(p, 0.53, 0.77));
      const t = title.current!;
      t.style.opacity = String(tIn);
      t.style.letterSpacing = `${lerp(0.4, 0, tIn).toFixed(3)}em`;
      t.style.filter = tIn < 0.99 ? `blur(${((1 - tIn) * 10).toFixed(2)}px)` : "";

      const fIn = easeOut(range(p, 0.67, 0.93));
      move(foot.current!, lerp(5, 0, fIn), 1, fIn);
      hint.current!.style.opacity = String(range(p, 0.83, 0.96));

      // Played out: stop the loop; the banner rests in its finished composition.
      if (p >= 1) cancelAnimationFrame(frame);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [reduced]);

  // Server HTML and first paint match progress 0, so nothing jumps when the loop takes over.
  const at0 = !reduced;
  const unresolved = (spacing: string, blur: number) => (at0 ? { opacity: 0, letterSpacing: spacing, filter: `blur(${blur}px)` } : undefined);

  return (
    <section aria-label="LESPARO" className="relative">
      <div className="relative h-[calc(100svh-4.5rem)] min-h-[34rem] overflow-hidden rounded-b-[2rem] bg-indigo-deep text-white lg:rounded-b-[3rem]">
        {/* Sky: brand indigo, lightest low down where the ring will rise, deep at the top. Taller than
            the stage, so its edge never shows as it drifts up. */}
        <div
          ref={sky}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -inset-y-[10%] bg-[radial-gradient(70%_60%_at_50%_78%,#3d48c4_0%,var(--color-indigo)_45%,var(--color-indigo-deep)_100%)] will-change-transform"
          style={at0 ? { transform: "scale(1.14)" } : undefined}
        />
        {/* Faint woven grain, so the indigo reads as cloth rather than a flat fill. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Act one: the wordmark, behind the ring. Decorative; the headline is the h1. */}
        {!reduced && (
          <p
            ref={mark}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[30%] whitespace-nowrap text-center font-display text-[clamp(2.75rem,10vw,10rem)] font-extrabold leading-none text-white [text-shadow:0_6px_50px_rgb(5_6_30/0.5)] will-change-transform"
            style={{ ...unresolved("0.9em", 12), marginRight: "-0.32em" }}
          >
            LESPARO
          </p>
        )}

        {/* The ring rises into the frame. (Its own floor shadow is hidden: this banner lights its own floor.
            The photo plates are white here, so each white-backed photo merges into its card.) */}
        <div
          ref={ring}
          className="absolute inset-x-0 top-[17%] will-change-transform [&_[role=region]>[aria-hidden]]:hidden [&_[role=region]_a>span:first-child]:bg-white max-sm:[&_[role=region]]:h-[19rem] max-sm:[&_[role=region]]:[--card-w:4.5rem] sm:top-[20%] lg:top-[13%]"
          style={at0 ? { transform: "translate3d(0, 56vh, 0) scale(0.78)" } : { transform: "scale(0.86)" }}
        >
          {/* Grounding under the cards' feet: a pool of light with a soft contact shadow in it. */}
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-[84%] h-32 w-[min(80%,52rem)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_255_255/0.12),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-[84%] h-12 w-[min(46%,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(5_6_30/0.55),transparent)]" />
          <ProductRing items={items} frontOnly />
        </div>

        {/* Rim: the dark edge of the view, closing in from outside the frame. */}
        <div
          ref={rim}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_80%_at_50%_45%,transparent_55%,rgb(6_8_32/0.75)_100%)] will-change-transform"
          style={at0 ? { transform: "scale(1.6)", opacity: 0 } : undefined}
        />

        {/* Act two: the headline resolves out of wide, blurred tracking. */}
        <div ref={title} className="absolute inset-x-0 top-[4%] z-10 px-4 text-center will-change-transform sm:top-[5%]" style={unresolved("0.4em", 10)}>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-white/70">{eyebrow}</p>
          <h1 className="mx-auto mt-4 max-w-5xl font-display text-[clamp(2.5rem,1.1rem+4vw,5.25rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-white [text-shadow:0_8px_40px_rgb(10_12_50/0.35)]">{heading}</h1>
        </div>

        {/* Introduction, the drag hint and the actions: one aligned row at the foot. Comes up last in
            the entrance, and is fully shown the moment anything in it takes keyboard focus. */}
        <div
          ref={foot}
          className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-page px-4 pb-6 will-change-transform focus-within:![transform:none] focus-within:!opacity-100 sm:px-6 lg:px-10 lg:pb-8"
          style={at0 ? { opacity: 0, transform: "translate3d(0, 5vh, 0)" } : undefined}
        >
          <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
            <p className="max-w-md text-[0.86rem] leading-relaxed text-white/70 sm:text-[0.92rem]">{subheading}</p>
            <p ref={hint} aria-hidden className="hidden items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-white/45 lg:flex" style={at0 ? { opacity: 0 } : undefined}>
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

        {!reduced && (
          <>
            {/* Veil of cotton fibres on the lens; clears as the entrance begins. */}
            <div
              ref={veil}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-40 will-change-transform"
              style={{
                background:
                  "radial-gradient(60% 50% at 30% 40%, rgb(70 80 200 / 0.7), transparent 70%), radial-gradient(50% 60% at 75% 60%, rgb(18 22 76 / 0.75), transparent 70%), radial-gradient(80% 80% at 50% 50%, rgb(38 46 134 / 0.82), rgb(18 22 76 / 0.95))",
              }}
            />
            <canvas ref={fibres} aria-hidden className="pointer-events-none absolute inset-0 z-40 size-full" />
          </>
        )}
      </div>
    </section>
  );
}
