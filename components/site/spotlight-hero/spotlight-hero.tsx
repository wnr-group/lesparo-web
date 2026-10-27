"use client";

import { ArrowRight, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./spotlight.css";

type Cta = { label: string; href: string };
/** A numbered point on one frame. It shows while the viewer is within `tol` frames of that frame. */
type Spot = { frame: number; x: number; y: number; label: string };
export type TurntableSet = { frames: string[]; spots: Spot[] };
type Product = { id: string; label: string; frames: string[]; spots: Spot[]; spin: boolean; keyLabels: string[] };

/**
 * Stand-in photographs, used until a real 360° turntable set exists for a product. They are real shoot photos
 * from four angles, so the viewer steps between them; labels only name what each photograph shows.
 */
const STAND_IN: Record<string, { frames: string[]; spots: Spot[]; keys: string[] }> = {
  pants: {
    frames: ["/spotlight/front.jpg", "/spotlight/model.jpg", "/spotlight/side.jpg", "/spotlight/waist.jpg"],
    keys: ["Front", "On model", "Back", "Waistband"],
    spots: [
      { frame: 0, x: 0.495, y: 0.085, label: "Drawstring waistband" },
      { frame: 0, x: 0.25, y: 0.35, label: "Cargo pocket" },
      { frame: 0, x: 0.54, y: 0.56, label: "Textured fabric" },
      { frame: 1, x: 0.525, y: 0.475, label: "Drawstring waistband" },
      { frame: 1, x: 0.37, y: 0.56, label: "Cargo pocket" },
      { frame: 2, x: 0.57, y: 0.15, label: "Back pocket" },
      { frame: 2, x: 0.68, y: 0.415, label: "Cargo pocket" },
      { frame: 2, x: 0.375, y: 0.07, label: "Elastic waistband" },
      { frame: 3, x: 0.13, y: 0.165, label: "Herringbone drawstring" },
      { frame: 3, x: 0.795, y: 0.655, label: "LESPARO bird mark" },
      { frame: 3, x: 0.78, y: 0.89, label: "Cargo pocket flap" },
    ],
  },
  tee: {
    frames: ["/spotlight/tee-front.jpg", "/spotlight/tee-three-quarter.jpg", "/spotlight/tee-detail.jpg", "/spotlight/tee-back.jpg"],
    keys: ["Front", "Three-quarter", "On model", "Back"],
    spots: [
      { frame: 0, x: 0.5, y: 0.295, label: "Crew neckline" },
      { frame: 0, x: 0.626, y: 0.435, label: "LESPARO bird mark" },
      { frame: 0, x: 0.45, y: 0.625, label: "Textured fabric" },
      { frame: 0, x: 0.77, y: 0.525, label: "Short sleeve" },
      { frame: 1, x: 0.44, y: 0.295, label: "Crew neckline" },
      { frame: 1, x: 0.6, y: 0.37, label: "LESPARO bird mark" },
      { frame: 1, x: 0.525, y: 0.525, label: "Textured fabric" },
      { frame: 2, x: 0.55, y: 0.285, label: "Crew neckline" },
      { frame: 2, x: 0.64, y: 0.39, label: "LESPARO bird mark" },
      { frame: 2, x: 0.525, y: 0.55, label: "Textured fabric" },
      { frame: 3, x: 0.44, y: 0.27, label: "Back neckline" },
      { frame: 3, x: 0.45, y: 0.55, label: "Textured fabric" },
      { frame: 3, x: 0.45, y: 0.88, label: "Stitched hem" },
    ],
  },
};
const LABELS: Record<string, string> = { pants: "Track pants", tee: "T-shirt" };
const SPIN_KEYS = ["Front", "Right", "Back", "Left"];

const wrap = (i: number, n: number) => ((Math.round(i) % n) + n) % n;
const ringDist = (a: number, b: number, n: number) => Math.min(Math.abs(a - b), n - Math.abs(a - b));

/**
 * Hero as a tailor's inspection table with a 360-degree product viewer. Drag the photograph to spin the garment
 * through its frames (with momentum), zoom in and pan, switch between the track pants and the T-shirt, and point
 * at a numbered spot to read it and see that cloth under a loupe cut from the same frame. A product with a real
 * turntable set (8 or more frames in public/turntable) spins smoothly; until then four real photographs stand in.
 */
export function SpotlightHero({ eyebrow, heading, subheading, cta, secondary, turntables }: { eyebrow: string; heading: string; subheading: string; cta: Cta; secondary: Cta; turntables: Partial<Record<string, TurntableSet>> }) {
  const products: Product[] = ["pants", "tee"].map((id) => {
    const real = turntables[id];
    return real
      ? { id, label: LABELS[id], frames: real.frames, spots: real.spots, spin: true, keyLabels: SPIN_KEYS }
      : { id, label: LABELS[id], frames: STAND_IN[id].frames, spots: STAND_IN[id].spots, spin: false, keyLabels: STAND_IN[id].keys };
  });

  const [pi, setPi] = useState(0);
  const [frame, setFrame] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [spotKey, setSpotKey] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const live = useRef({ pos: 0, vel: 0, drag: false, x: 0, y: 0, moved: false, hover: false, zoom: 1, pan: { x: 0, y: 0 } });

  const product = products[pi];
  const n = product.frames.length;
  const tol = product.spin ? 2 : 0;

  // Keep the animation loop's view of zoom and pan current.
  useEffect(() => {
    live.current.zoom = zoom;
    live.current.pan = pan;
  }, [zoom, pan]);

  // Preload this product's frames so spinning never waits on the network.
  useEffect(() => {
    let cancelled = false;
    let done = 0;
    product.frames.forEach((src) => {
      const img = new window.Image();
      img.onload = img.onerror = () => {
        done += 1;
        if (!cancelled) setLoaded(done);
      };
      img.src = src;
    });
    return () => {
      cancelled = true;
    };
  }, [product.frames]);

  // The spin: momentum after a flick, and a slow idle turn until the viewer is touched (real turntables only).
  useEffect(() => {
    if (!product.spin) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (box.current) io.observe(box.current);
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = live.current;
      if (!visible || document.hidden || s.drag) return;
      if (Math.abs(s.vel) > 0.02) {
        s.pos += s.vel * dt;
        s.vel *= Math.pow(0.03, dt);
      } else if (!s.moved && !s.hover && !reduced) {
        s.pos += dt * 7;
      }
      const f = wrap(s.pos, n);
      setFrame((p) => (p === f ? p : f));
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [product.spin, n, pi]);

  const choose = (i: number) => {
    setPi(i);
    setFrame(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSpotKey(null);
    setLoaded(0);
    live.current = { ...live.current, pos: 0, vel: 0, moved: false };
  };
  const goTo = (f: number) => {
    live.current.pos = f;
    live.current.vel = 0;
    setFrame(wrap(f, n));
  };
  const setZ = (z: number) => {
    const c = Math.max(1, Math.min(2.6, z));
    setZoom(c);
    if (c === 1) setPan({ x: 0, y: 0 });
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = live.current;
    s.drag = true;
    setDragging(true);
    s.x = e.clientX;
    s.y = e.clientY;
    s.vel = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = live.current;
    if (!s.drag) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    s.x = e.clientX;
    s.y = e.clientY;
    if (s.zoom > 1) {
      const lim = (s.zoom - 1) * 50;
      const w = e.currentTarget.clientWidth;
      const h = e.currentTarget.clientHeight;
      setPan((p) => ({ x: Math.max(-lim, Math.min(lim, p.x + (dx / w) * 100)), y: Math.max(-lim, Math.min(lim, p.y + (dy / h) * 100)) }));
      return;
    }
    const w = e.currentTarget.clientWidth;
    // A full turn takes about one and a half widths of drag; the four-photo stand-in steps every 70 px.
    const perFrame = product.spin ? Math.max(5, (w * 1.5) / n) : 70;
    const df = -dx / perFrame;
    s.moved = true;
    setTouched(true);
    if (product.spin) {
      s.pos += df;
      s.vel = df * 60;
      setFrame(wrap(s.pos, n));
    } else {
      s.vel += df;
      if (Math.abs(s.vel) >= 1) {
        s.pos += Math.sign(s.vel);
        s.vel = 0;
        setFrame(wrap(s.pos, n));
      }
    }
  };
  const onUp = () => {
    live.current.drag = false;
    setDragging(false);
    if (!product.spin) live.current.vel = 0;
  };

  const visibleSpots = zoom > 1 ? [] : product.spots.filter((s) => ringDist(s.frame, frame, n) <= tol);
  const keyOf = (s: Spot) => `${product.id}-${s.frame}-${s.label}`;
  const active = visibleSpots.find((s) => keyOf(s) === spotKey) ?? visibleSpots[0] ?? null;
  const words = heading.trim().split(/\s+/);
  const cut = Math.ceil(words.length / 2);
  const keyFrames = product.spin ? [0, 1, 2, 3].map((k) => Math.round((k * n) / 4)) : product.frames.map((_, i) => i);

  return (
    <section aria-labelledby="hero-heading" className="sp-stage relative isolate flex flex-col overflow-hidden text-white lg:block lg:h-[calc(100svh-var(--hdr))] lg:min-h-[40rem]">
      {/* The stage: two beams from above, drifting dust, a floor. */}
      <div aria-hidden className="sp-beam sp-beam-a" />
      <div aria-hidden className="sp-beam sp-beam-b" />
      <div aria-hidden className="sp-dust" />
      <div aria-hidden className="sp-floor" />

      {/* Words, top left. */}
      <div className="sp-copy relative z-20 px-5 pt-7 sm:px-8 lg:absolute lg:left-10 lg:top-8 lg:max-w-[34rem] lg:p-0">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-white/60">{eyebrow}</p>
        <h1 id="hero-heading" className="mt-3 font-display text-[clamp(2rem,0.9rem+2.6vw,3.5rem)] uppercase leading-[0.98] tracking-[-0.03em]">
          <span className="block font-light text-white/80">
            {words.slice(0, cut).map((w, i) => (
              <span key={i} className="sp-word inline-block" style={{ ["--w" as string]: i }}>
                {w}&nbsp;
              </span>
            ))}
          </span>
          <span className="block font-extrabold text-white">
            {words.slice(cut).map((w, i) => (
              <span key={i} className="sp-word inline-block" style={{ ["--w" as string]: cut + i }}>
                {w}&nbsp;
              </span>
            ))}
          </span>
        </h1>
      </div>

      {/* Product switch, top right. */}
      <div role="group" aria-label="Product" className="sp-copy relative z-20 mt-5 flex px-5 sm:px-8 lg:absolute lg:right-10 lg:top-8 lg:mt-0 lg:p-0">
        <ul className="inline-flex border border-white/25 bg-white/5 backdrop-blur-sm">
          {products.map((p, i) => (
            <li key={p.id}>
              <button type="button" aria-pressed={pi === i} onClick={() => choose(i)} className={`h-10 px-5 text-[0.66rem] font-bold uppercase tracking-[0.18em] transition-colors ${pi === i ? "bg-white/90 text-[#0e1b4f]" : "text-white/65 hover:text-white"}`}>
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* The 360-degree viewer, floating in the middle of the stage. */}
      <div className="relative z-10 my-5 flex justify-center px-5 lg:absolute lg:inset-x-0 lg:bottom-[5rem] lg:top-[4.75rem] lg:my-0 lg:px-0">
        <div
          ref={box}
          role="group"
          aria-label={`${product.label}. Drag sideways, or use the arrow keys, to turn it. Plus and minus zoom.`}
          tabIndex={0}
          className={`sp-product relative w-full max-w-[22rem] select-none overflow-hidden outline-offset-[3px] lg:h-full lg:w-auto lg:max-w-none ${zoom > 1 ? "cursor-move" : "cursor-grab active:cursor-grabbing"} touch-pan-y`}
          style={{ aspectRatio: "2 / 3" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerEnter={() => (live.current.hover = true)}
          onPointerLeave={() => (live.current.hover = false)}
          onDoubleClick={() => setZ(zoom > 1 ? 1 : 2)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") goTo(live.current.pos + 1);
            if (e.key === "ArrowLeft") goTo(live.current.pos - 1);
            if (e.key === "+" || e.key === "=") setZ(zoom + 0.6);
            if (e.key === "-") setZ(zoom - 0.6);
          }}
        >
          <div className="absolute inset-0 bg-[#a8a595]" style={{ transform: `translate(${pan.x}%, ${pan.y}%) scale(${zoom})`, transformOrigin: "50% 50%", transition: dragging ? "none" : "transform 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- frames swap quickly and are preloaded; the optimiser would add a round trip per frame */}
            <img src={product.frames[frame]} alt={`${product.label}, frame ${frame + 1} of ${n}`} draggable={false} decoding="async" fetchPriority="high" className="pointer-events-none absolute inset-0 size-full object-cover" />
          </div>

          {visibleSpots.map((p, i) => (
            <button
              key={keyOf(p)}
              type="button"
              aria-label={`${i + 1}. ${p.label}`}
              aria-pressed={p === active}
              onClick={() => setSpotKey(keyOf(p))}
              onMouseEnter={() => setSpotKey(keyOf(p))}
              onFocus={() => setSpotKey(keyOf(p))}
              onPointerDown={(e) => e.stopPropagation()}
              className="sp-pin absolute grid size-9 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-white/80 bg-black/10 backdrop-blur-[1px]"
              style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            >
              <span aria-hidden className={`size-2.5 rounded-full ${p === active ? "bg-[#ffc82c]" : "bg-white"}`} />
            </button>
          ))}

          <div className="absolute bottom-3 right-3 z-20 flex flex-col border border-white/40 bg-[#0e1b4f]/70 backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Zoom in" disabled={zoom >= 2.6} onClick={() => setZ(zoom + 0.6)} className="grid size-9 place-items-center hover:bg-white/15 disabled:opacity-40">
              <Plus className="size-4" aria-hidden />
            </button>
            <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZ(zoom - 0.6)} className="grid size-9 place-items-center border-t border-white/30 hover:bg-white/15 disabled:opacity-40">
              <Minus className="size-4" aria-hidden />
            </button>
          </div>

          <p aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-4 z-10 text-center text-[0.64rem] font-bold uppercase tracking-[0.22em] text-white drop-shadow-[0_1px_6px_rgb(0_0_0/0.6)] transition-opacity duration-700 ${touched ? "opacity-0" : "opacity-100"}`}>
            {product.spin ? "Drag to spin 360°" : "◀ Drag to turn ▶"}
          </p>
          {loaded < n && (
            <p aria-hidden className="pointer-events-none absolute left-4 top-4 z-10 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/80 drop-shadow-[0_1px_4px_rgb(0_0_0/0.6)]">
              Loading {loaded}/{n}
            </p>
          )}
        </div>
      </div>

      {/* Angle tabs, bottom centre. */}
      <div role="group" aria-label="Angle" className="sp-copy relative z-20 flex justify-center px-5 pb-5 lg:absolute lg:inset-x-0 lg:bottom-6 lg:p-0">
        <ul className="inline-flex border border-white/25 bg-white/5 backdrop-blur-sm">
          {keyFrames.map((f, i) => {
            const on = ringDist(f, frame, n) <= (product.spin ? Math.floor(n / 8) : 0);
            return (
              <li key={f}>
                <button type="button" aria-pressed={on} onClick={() => goTo(f)} className={`h-10 px-4 text-[0.66rem] font-bold uppercase tracking-[0.18em] transition-colors sm:px-5 ${on ? "bg-white/90 text-[#0e1b4f]" : "text-white/60 hover:text-white"}`}>
                  {product.keyLabels[i]}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Loupe, bottom left. */}
      {active && (
        <div className="sp-copy relative z-20 flex items-center gap-4 px-5 pb-5 sm:px-8 lg:absolute lg:bottom-8 lg:left-10 lg:p-0">
          <span aria-hidden key={keyOf(active)} className="sp-loupe size-20 shrink-0 rounded-full ring-1 ring-white/70 lg:size-28" style={{ backgroundImage: `url(${product.frames[active.frame]})`, backgroundSize: "460% auto", backgroundPosition: `${active.x * 100}% ${active.y * 100}%` }} />
          <p role="status" className="max-w-[10rem] text-[0.66rem] font-bold uppercase leading-snug tracking-[0.16em] text-white/80">
            <span className="mb-1 block text-white/45">Under the loupe</span>
            {active.label}
          </p>
        </div>
      )}

      {/* Blurb and calls to action, bottom right. */}
      <div className="sp-copy relative z-20 px-5 pb-8 sm:px-8 lg:absolute lg:bottom-8 lg:right-10 lg:max-w-[25rem] lg:p-0 lg:text-right">
        <p className="text-[0.68rem] font-medium uppercase leading-relaxed tracking-[0.07em] text-white/65">{subheading}</p>
        <div className="mt-4 flex flex-wrap gap-2.5 lg:justify-end">
          <Link href={cta.href} className="inline-flex h-11 items-center gap-2 border border-white/80 px-6 text-[0.66rem] font-bold uppercase tracking-[0.2em] transition-colors hover:bg-white hover:text-[#0e1b4f]">
            {cta.label} <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          <Link href={secondary.href} className="inline-flex h-11 items-center border border-white/25 px-5 text-[0.66rem] font-bold uppercase tracking-[0.2em] text-white/75 transition-colors hover:border-white/60 hover:text-white">
            {secondary.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
