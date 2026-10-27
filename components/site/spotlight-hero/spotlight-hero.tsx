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
  const activeIdx = active ? visibleSpots.indexOf(active) : -1;
  const words = heading.trim().split(/\s+/);
  const cut = Math.ceil(words.length / 2);
  const keyFrames = product.spin ? [0, 1, 2, 3].map((k) => Math.round((k * n) / 4)) : product.frames.map((_, i) => i);

  return (
    <section aria-labelledby="hero-heading" className="sp-stage relative isolate overflow-hidden text-white lg:grid lg:h-[calc(100svh-var(--hdr))] lg:min-h-[38rem] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.62fr)] lg:grid-rows-[minmax(0,1fr)]">
      {/* ---------------------------------------------------------------- left: the words */}
      <div className="sp-copy flex flex-col justify-center gap-10 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/70">{eyebrow}</p>
          <h1 id="hero-heading" className="mt-4 max-w-[13ch] font-display text-[clamp(2.2rem,0.9rem+3.3vw,4.3rem)] leading-[0.97] tracking-[-0.035em]">
            <span className="block font-light text-white/85">
              {words.slice(0, cut).map((w, i) => (
                <span key={i} className="sp-word inline-block" style={{ ["--w" as string]: i }}>
                  {w}&nbsp;
                </span>
              ))}
            </span>
            <span className="block font-extrabold">
              {words.slice(cut).map((w, i) => (
                <span key={i} className="sp-word inline-block" style={{ ["--w" as string]: cut + i }}>
                  {w}&nbsp;
                </span>
              ))}
            </span>
          </h1>
          <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-white/80">{subheading}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={cta.href} className="inline-flex h-12 items-center gap-2 bg-white px-7 text-xs font-bold uppercase tracking-[0.18em] text-[#0e1b4f] transition-colors hover:bg-[#ffc82c]">
              {cta.label} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <Link href={secondary.href} className="inline-flex h-12 items-center border border-white/50 px-6 text-xs font-bold uppercase tracking-[0.18em] transition-colors hover:bg-white/10">
              {secondary.label}
            </Link>
          </div>
        </div>
        <dl className="grid max-w-md grid-cols-3 gap-4 border-t border-white/20 pt-5">
          {[
            ["1979", "Family trade begins"],
            ["3 states", "Tamil Nadu, Kerala, Karnataka"],
            ["2017", "LESPARO launches"],
          ].map(([val, label]) => (
            <div key={val}>
              <dd className="font-display text-xl font-extrabold leading-none tracking-[-0.03em] sm:text-2xl">{val}</dd>
              <dt className="mt-1.5 text-[0.62rem] font-semibold uppercase leading-snug tracking-[0.1em] text-white/60">{label}</dt>
            </div>
          ))}
        </dl>
      </div>

      {/* -------------------------------------------------- centre: the 360-degree viewer */}
      <div
        ref={box}
        role="group"
        aria-label={`${product.label}. Drag sideways, or use the arrow keys, to turn it. Plus and minus zoom.`}
        tabIndex={0}
        className={`sp-product relative mx-auto h-[68svh] min-h-[26rem] w-full max-w-[26rem] select-none overflow-hidden outline-offset-[-3px] lg:h-full lg:min-h-0 lg:w-auto lg:max-w-none ${zoom > 1 ? "cursor-move" : "cursor-grab active:cursor-grabbing"} touch-pan-y`}
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
        {/* Selvedge: the woven edge of a length of cloth. */}
        <div aria-hidden className="sp-selvedge absolute inset-y-0 left-0 z-10 hidden w-3 lg:block" />

        <div className="absolute inset-0 bg-[#a8a595]" style={{ transform: `translate(${pan.x}%, ${pan.y}%) scale(${zoom})`, transformOrigin: "50% 50%", transition: dragging ? "none" : "transform 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- frames swap quickly and are preloaded; the optimiser would add a round trip per frame */}
          <img src={product.frames[frame]} alt={`${product.label}, frame ${frame + 1} of ${n}`} draggable={false} decoding="async" fetchPriority="high" className="pointer-events-none absolute inset-0 size-full object-cover" />
        </div>

        {/* Stitched hem around the photograph. */}
        <div aria-hidden className="pointer-events-none absolute inset-3 border border-dashed border-white/45" />

        {/* Running stitch between the points on this frame. */}
        {visibleSpots.length > 1 && (
          <svg aria-hidden viewBox="0 0 100 150" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
            <polyline points={visibleSpots.map((p) => `${p.x * 100},${p.y * 150}`).join(" ")} fill="none" stroke="#ffc82c" strokeOpacity="0.9" strokeWidth="0.55" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2.4 1.6" className="sp-stitch" />
          </svg>
        )}
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
            className={`sp-pin absolute -ml-4 -mt-4 grid size-8 cursor-pointer place-items-center rounded-full text-[0.7rem] font-extrabold shadow-[0_2px_10px_rgb(0_0_0/0.35)] transition-colors ${p === active ? "bg-[#ffc82c] text-[#0e1b4f]" : "bg-white text-[#0e1b4f]"}`}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          >
            {i + 1}
          </button>
        ))}

        {/* Zoom controls. */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col border border-white/40 bg-[#0e1b4f]/70 backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Zoom in" disabled={zoom >= 2.6} onClick={() => setZ(zoom + 0.6)} className="grid size-10 place-items-center hover:bg-white/15 disabled:opacity-40">
            <Plus className="size-4" aria-hidden />
          </button>
          <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZ(zoom - 0.6)} className="grid size-10 place-items-center border-t border-white/30 hover:bg-white/15 disabled:opacity-40">
            <Minus className="size-4" aria-hidden />
          </button>
        </div>

        <p aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-5 z-10 text-center text-[0.68rem] font-bold uppercase tracking-[0.22em] text-white drop-shadow-[0_1px_6px_rgb(0_0_0/0.6)] transition-opacity duration-700 ${touched ? "opacity-0" : "opacity-100"}`}>
          {product.spin ? "Drag to spin 360°" : "◀ Drag to turn ▶"}
        </p>
        {loaded < n && (
          <p aria-hidden className="pointer-events-none absolute left-5 top-5 z-10 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/80 drop-shadow-[0_1px_4px_rgb(0_0_0/0.6)]">
            Loading {loaded}/{n}
          </p>
        )}
      </div>

      {/* ------------------------------------------------- right: product, angle, loupe */}
      <div className="sp-copy flex flex-col gap-6 bg-[#0b1642] px-5 py-8 sm:px-8 lg:px-7 lg:py-10">
        <div role="group" aria-label="Product">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-white/55">Product</p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {products.map((p, i) => (
              <li key={p.id}>
                <button type="button" aria-pressed={pi === i} onClick={() => choose(i)} className={`h-11 w-full border px-3 text-[0.66rem] font-bold uppercase tracking-[0.14em] transition-colors ${pi === i ? "border-white bg-white text-[#0e1b4f]" : "border-white/30 text-white/80 hover:border-white/70 hover:text-white"}`}>
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div role="group" aria-label="Angle">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-white/55">{product.spin ? "Jump to" : "Angle"}</p>
          <ul className="mt-3 grid grid-cols-4 gap-1.5">
            {keyFrames.map((f, i) => {
              const on = ringDist(f, frame, n) <= (product.spin ? Math.floor(n / 8) : 0);
              return (
                <li key={f}>
                  <button type="button" aria-pressed={on} aria-label={product.keyLabels[i]} onClick={() => goTo(f)} className={`block w-full text-left transition-opacity ${on ? "opacity-100" : "opacity-60 hover:opacity-100"}`}>
                    <span className={`relative block aspect-[3/4] overflow-hidden bg-[#a8a595] ${on ? "ring-2 ring-white" : "ring-1 ring-white/25"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnail of a frame already cached by the viewer */}
                      <img src={product.frames[f]} alt="" loading="lazy" draggable={false} className="size-full object-cover" />
                    </span>
                    <span className="mt-1.5 block text-[0.6rem] font-bold uppercase tracking-[0.12em]">{product.keyLabels[i]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-auto">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-white/55">Under the loupe</p>
          {active ? (
            <div className="mt-3 flex items-center gap-4 lg:flex-col lg:items-center lg:gap-3 lg:text-center">
              <span aria-hidden key={keyOf(active)} className="sp-loupe size-24 shrink-0 rounded-full ring-2 ring-white/80 lg:mx-auto lg:size-44" style={{ backgroundImage: `url(${product.frames[active.frame]})`, backgroundSize: "460% auto", backgroundPosition: `${active.x * 100}% ${active.y * 100}%` }} />
              <p role="status" className="font-display text-lg font-bold leading-tight tracking-tight">
                <span className="mr-2 text-[#ffc82c]">{activeIdx + 1}</span>
                {active.label}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-white/60">Turn the garment to a marked angle, then point at a number to inspect the cloth.</p>
          )}
        </div>
      </div>
    </section>
  );
}
