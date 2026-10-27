"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./spotlight.css";

type Cta = { label: string; href: string };
type Spot = { x: number; y: number; label: string };
type View = { id: string; label: string; src: string; alt: string; spots: Spot[] };

/**
 * Photographs of one cargo track pant from the LESPARO shoot. Hotspot positions are fractions of each photo,
 * and every label names only what the photograph shows: no fabric or performance claims.
 */
const VIEWS: View[] = [
  {
    id: "front",
    label: "Front",
    src: "/spotlight/front.jpg",
    alt: "Brown cargo track pants, front view",
    spots: [
      { x: 0.495, y: 0.085, label: "Drawstring waistband" },
      { x: 0.25, y: 0.35, label: "Cargo pocket" },
      { x: 0.54, y: 0.56, label: "Textured fabric" },
    ],
  },
  {
    id: "back",
    label: "Back",
    src: "/spotlight/side.jpg",
    alt: "Brown cargo track pants, back view",
    spots: [
      { x: 0.57, y: 0.15, label: "Back pocket" },
      { x: 0.68, y: 0.415, label: "Cargo pocket" },
      { x: 0.375, y: 0.07, label: "Elastic waistband" },
    ],
  },
  {
    id: "detail",
    label: "Waistband",
    src: "/spotlight/waist.jpg",
    alt: "Close-up of the cargo track pants waistband and drawstring",
    spots: [
      { x: 0.13, y: 0.165, label: "Herringbone drawstring" },
      { x: 0.795, y: 0.655, label: "LESPARO bird mark" },
      { x: 0.78, y: 0.89, label: "Cargo pocket flap" },
    ],
  },
  {
    id: "model",
    label: "On model",
    src: "/spotlight/model.jpg",
    alt: "Model wearing the brown cargo track pants",
    spots: [
      { x: 0.525, y: 0.475, label: "Drawstring waistband" },
      { x: 0.37, y: 0.56, label: "Cargo pocket" },
    ],
  },
];

/** Deterministic dust motes so server and client render the same. */
const DUST = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  top: (i * 53 + 7) % 78,
  size: 2 + (i % 3),
  t: 7 + (i % 6) * 1.6,
  dl: -((i * 1.3) % 9),
}));

export function SpotlightHero({ eyebrow, heading, subheading, cta }: { eyebrow: string; heading: string; subheading: string; cta: Cta }) {
  const [view, setView] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);

  // Pointer parallax: sets --px/--py (-1..1) on the hero; the product and the beams read them.
  useEffect(() => {
    const el = root.current;
    if (!el || !matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    const step = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      el.style.setProperty("--px", cx.toFixed(3));
      el.style.setProperty("--py", cy.toFixed(3));
      frame = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => (frame ||= requestAnimationFrame(step));
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    };
    const leave = () => {
      tx = ty = 0;
      kick();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  const words = heading.trim().split(/\s+/);
  const cut = Math.ceil(words.length / 2);
  const v = VIEWS[view];

  return (
    <section ref={root} aria-labelledby="hero-heading" className="sp-stage relative isolate h-[calc(100svh-var(--hdr))] min-h-[36rem] overflow-hidden text-white">
      <div aria-hidden className="sp-beams -z-10" />
      <div aria-hidden className="sp-floor -z-10">
        <div className="sp-loom" />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10">
        {DUST.map((d, i) => (
          <span key={i} className="sp-dust" style={{ left: `${d.left}%`, top: `${d.top}%`, width: 8 + d.size * 5, ["--r" as string]: `${((d.left * 7) % 160) - 80}deg`, ["--t" as string]: `${d.t}s`, ["--dl" as string]: `${d.dl}s` }} />
        ))}
      </div>

      {/* The product. */}
      <div className="sp-product absolute left-1/2 top-[16%] h-[62%] -translate-x-1/2 sm:top-[8%] sm:h-[70%]" style={{ aspectRatio: "2 / 3", translate: "calc(-50% + var(--px, 0) * -14px) calc(var(--py, 0) * -8px)", left: "50%", transform: "none" }}>
        <div className="sp-photo absolute inset-0">
          {VIEWS.map((x, i) => (
            <Image key={x.id} src={x.src} alt={i === view ? x.alt : ""} fill priority={i === 0} sizes="(min-width:1024px) 34vw, 70vw" className={`object-cover transition-opacity duration-700 ${i === view ? "opacity-100" : "opacity-0"}`} />
          ))}
        </div>
        {/* Running stitch sewn between the hotspots. */}
        <svg aria-hidden viewBox="0 0 100 150" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
          <polyline points={v.spots.map((p) => `${p.x * 100},${p.y * 150}`).join(" ")} fill="none" stroke="#ffc82c" strokeOpacity="0.75" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2.4 1.6" className="sp-stitch" />
        </svg>

        {v.spots.map((s) => {
          const id = `${v.id}-${s.label}`;
          const on = open === id;
          return (
            <div key={id} className="absolute" style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }}>
              <button
                type="button"
                aria-label={s.label}
                aria-expanded={on}
                onClick={() => setOpen(on ? null : id)}
                onMouseEnter={() => setOpen(id)}
                onMouseLeave={() => setOpen(null)}
                onFocus={() => setOpen(id)}
                onBlur={() => setOpen(null)}
                className="sp-ring relative -ml-4 -mt-4 grid size-8 place-items-center rounded-full outline-offset-4"
              >
                <span className="size-2 rounded-full bg-white shadow-[0_0_10px_rgb(255_255_255/0.9)]" />
              </button>
              <span role="status" className={`pointer-events-none absolute left-7 top-1/2 flex -translate-y-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-[#0e1b4f]/80 py-1.5 pl-1.5 pr-4 text-xs font-semibold ring-1 ring-white/35 backdrop-blur-md transition-all duration-300 ${on ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"}`}>
                {on && (
                  <>
                    {/* Fabric loupe: the same photograph, magnified at this exact spot. */}
                    <span aria-hidden className="sp-loupe size-14 shrink-0 rounded-full ring-2 ring-white/80" style={{ backgroundImage: `url(${v.src})`, backgroundSize: "420% auto", backgroundPosition: `${s.x * 100}% ${s.y * 100}%` }} />
                    {s.label}
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Headline, top left: a light line over a heavy one, after Blue & Blues. */}
      <div className="sp-copy absolute left-4 top-5 z-10 sm:left-8 sm:top-7 lg:left-10">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/70">{eyebrow}</p>
        <h1 id="hero-heading" className="mt-3 max-w-[min(26rem,36vw)] font-display text-[clamp(1.6rem,0.8rem+2.6vw,3.3rem)] uppercase leading-[0.98] tracking-[-0.03em] max-sm:max-w-[80vw]">
          <span className="block font-light text-white/85">
            {words.slice(0, cut).map((w, n) => (
              <span key={n} className="sp-word inline-block" style={{ ["--w" as string]: n }}>
                {w}&nbsp;
              </span>
            ))}
          </span>
          <span className="block font-extrabold">
            {words.slice(cut).map((w, n) => (
              <span key={n} className="sp-word inline-block" style={{ ["--w" as string]: cut + n }}>
                {w}&nbsp;
              </span>
            ))}
          </span>
        </h1>
      </div>

      {/* Tagline and action, bottom right. */}
      <div className="sp-copy absolute bottom-5 right-4 z-10 hidden max-w-[22rem] text-right sm:right-8 md:block lg:right-10">
        <p className="text-[0.78rem] font-medium uppercase leading-relaxed tracking-[0.06em] text-white/75">{subheading}</p>
        <Link href={cta.href} className="mt-5 inline-flex h-12 items-center gap-2 border border-white/70 px-7 text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:bg-white hover:text-[#0e1b4f]">
          {cta.label} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      {/* View switcher, bottom centre. */}
      <div className="sp-copy absolute inset-x-0 bottom-5 z-10 flex flex-col items-center gap-3 px-4">
        <div role="group" aria-label="Product view" className="inline-flex max-w-full overflow-x-auto [scrollbar-width:none] border border-white/25 bg-[#0e1b4f]/60 backdrop-blur-md">
          {VIEWS.map((x, i) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={view === i}
              onClick={() => {
                setView(i);
                setOpen(null);
              }}
              className={`h-11 shrink-0 px-3 text-[0.62rem] font-bold uppercase tracking-[0.1em] transition-colors sm:px-6 sm:text-[0.7rem] sm:tracking-[0.16em] ${view === i ? "bg-white/20 text-white shadow-[inset_0_-2px_0_#fff]" : "text-white/55 hover:text-white"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <Link href={cta.href} className="inline-flex h-11 items-center gap-2 border border-white/70 px-6 text-xs font-bold uppercase tracking-[0.2em] md:hidden">
          {cta.label} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <p aria-hidden className="absolute bottom-6 left-4 z-10 hidden text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/45 sm:left-8 md:block lg:left-10">
        Move to catch the light
      </p>
    </section>
  );
}
