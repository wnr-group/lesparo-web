"use client";

import { ArrowRight, Minus, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import "./spotlight.css";

// three.js is only fetched when a product has a .glb in public/models.
// The premium viewer is the default; add ?viewer=classic to the address to see the earlier orbit-controls one.
const Garment3D = dynamic(() => import("./garment-3d-premium"), { ssr: false });
const GarmentClassic = dynamic(() => import("./garment-3d"), { ssr: false });
import type { Part, Point3D } from "./garment-3d";

/**
 * Where each named point sits on a real 3D model: a ray is fired at the model from that side, across and up its
 * box, and the point is pinned where it hits the cloth. Labels match the photo spots, which supply the close-up.
 */
/**
 * Guided views of a 3D model, like the tabs on a luxury product page: each one glides the camera round to that angle.
 * `az` is the angle round the garment, `zoom` how close (1 is the whole garment), `aimY` where to look (0 is the middle,
 * 0.5 the top edge) and `point` the numbered point that view introduces.
 */
type View3DDef = { id: string; label: string; az: number; zoom: number; aimY: number; point: string };
const VIEWS_3D: Record<string, View3DDef[]> = {
  pants: [
    { id: "front", label: "Front", az: 0, zoom: 1, aimY: 0, point: "Drawstring waistband" },
    { id: "side", label: "Side", az: Math.PI / 2, zoom: 1, aimY: 0, point: "Cargo pocket" },
    { id: "back", label: "Back", az: Math.PI, zoom: 1, aimY: 0, point: "Back pocket" },
    { id: "waist", label: "Waistband", az: 0, zoom: 0.5, aimY: 0.36, point: "Drawstring waistband" },
  ],
  tee: [
    { id: "front", label: "Front", az: 0, zoom: 1, aimY: 0, point: "Textured knit" },
    { id: "side", label: "Side", az: Math.PI / 2, zoom: 1, aimY: 0, point: "Contrast cuff" },
    { id: "back", label: "Back", az: Math.PI, zoom: 1, aimY: 0, point: "Textured knit" },
    { id: "neck", label: "Collar", az: 0, zoom: 0.45, aimY: 0.33, point: "Polo collar" },
  ],
  look: [
    { id: "front", label: "Front", az: 0, zoom: 1, aimY: 0, point: "" },
    { id: "side", label: "Side", az: Math.PI / 2, zoom: 1, aimY: 0, point: "" },
    { id: "back", label: "Back", az: Math.PI, zoom: 1, aimY: 0, point: "" },
    { id: "top", label: "T-shirt", az: 0, zoom: 0.6, aimY: 0.3, point: "" },
    { id: "pants", label: "Pants", az: 0, zoom: 0.6, aimY: -0.3, point: "" },
  ],
};

/** The full look when there is no look.glb: the T-shirt over the track pants, each scaled to its real proportion (the shirt overlaps the waistband). */
const LOOK_PARTS: Part[] = [
  { src: "/models/pants.glb", height: 1, top: 0 },
  { src: "/models/tee.glb", height: 0.8, top: 0.68 },
];

const POINTS_3D: Record<string, { label: string; side: Point3D["side"]; u: number; v: number }[]> = {
  pants: [
    { label: "Drawstring waistband", side: "front", u: 0.5, v: 0.95 },
    { label: "Cargo pocket", side: "right", u: 0.5, v: 0.62 },
    { label: "Textured fabric", side: "front", u: 0.64, v: 0.5 },
    { label: "Back pocket", side: "back", u: 0.42, v: 0.88 },
  ],
  tee: [
    { label: "Polo collar", side: "front", u: 0.64, v: 0.9 },
    { label: "Textured knit", side: "front", u: 0.4, v: 0.55 },
    { label: "Contrast cuff", side: "right", u: 0.5, v: 0.62 },
    { label: "Cream hem", side: "front", u: 0.5, v: 0.06 },
  ],
};

type Cta = { label: string; href: string };
/** A numbered point on one frame. It shows while the viewer is within `tol` frames of that frame. */
type Spot = { frame: number; x: number; y: number; label: string; detail?: string };
export type TurntableSet = { frames: string[]; spots: Spot[] };
type Product = { id: string; label: string; frames: string[]; spots: Spot[]; spin: boolean; keyLabels: string[] };

/**
 * Stand-in photographs, used until a real 360° turntable set exists for a product. They are real shoot photos
 * from four angles, so the viewer steps between them; labels only name what each photograph shows.
 */
const STAND_IN: Record<string, { frames: string[]; spots: Spot[]; keys: string[] }> = {
  pants: {
    frames: ["/spotlight/front.webp", "/spotlight/model.webp", "/spotlight/side.webp", "/spotlight/waist.jpg"],
    keys: ["Front", "On model", "Back", "Waistband"],
    spots: [
      { frame: 0, x: 0.495, y: 0.085, label: "Drawstring waistband" },
      { frame: 0, x: 0.25, y: 0.35, label: "Cargo pocket" },
      { frame: 0, x: 0.62, y: 0.56, label: "Textured fabric" },
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
    frames: ["/spotlight/polo-front.jpg"],
    keys: ["Front"],
    spots: [
      { frame: 0, x: 0.5, y: 0.09, label: "Polo collar" },
      { frame: 0, x: 0.52, y: 0.5, label: "Textured knit" },
      { frame: 0, x: 0.87, y: 0.49, label: "Contrast cuff" },
      { frame: 0, x: 0.52, y: 0.95, label: "Cream hem" },
    ],
  },
  look: {
    frames: ["/spotlight/model.webp"],
    keys: ["On model"],
    spots: [],
  },
};
const LABELS: Record<string, string> = { pants: "Track pants", tee: "T-shirts", look: "Full look" };
/** Plain-language notes for each point. They only describe what the photograph shows. */
const DETAILS: Record<string, string> = {
  "Drawstring waistband": "A drawstring at the waist lets you adjust the fit.",
  "Elastic waistband": "An elastic waistband holds the pants at the waist.",
  "Herringbone drawstring": "The drawstring is woven in a herringbone pattern.",
  "Cargo pocket": "A cargo pocket on the side of the leg, for carrying small things.",
  "Cargo pocket flap": "The flap that closes over the cargo pocket.",
  "Back pocket": "A pocket on the back, finished with neat stitching.",
  "Textured fabric": "A fine, even texture that shows in the cloth up close.",
  "LESPARO bird mark": "The LESPARO bird mark, the brand's sign on the garment.",
  "Polo collar": "An open polo collar in cream, set against the brown body.",
  "Textured knit": "A raised, woven-look knit that gives the cloth depth.",
  "Contrast cuff": "A cream cuff on each short sleeve, in contrast to the body.",
  "Cream hem": "A cream band at the hem finishes the bottom edge.",
};
const SPIN_KEYS = ["Front", "Right", "Back", "Left"];

/** Frames with a transparent background (.webp or .png) float on the stage; anything else is shown as a photograph. */
const isCut = (src: string) => /\.(webp|png)$/i.test(src);
/** Close-ups in the detail panel use the original photograph, which keeps the cloth and its surroundings. */
const detailSrc = (src: string) => (src.startsWith("/spotlight/") ? src.replace(/\.webp$/, ".jpg") : src);
/** Where a stand-in photograph was cropped by the original shoot, that edge fades instead of ending in a hard line. */
const FADE: Record<string, "top" | "bottom"> = {
  "/spotlight/front.webp": "top",
  "/spotlight/side.webp": "top",
};
const FADE_MASK = {
  top: "linear-gradient(to bottom, transparent 0, #000 9%)",
  bottom: "linear-gradient(to top, transparent 0, #000 9%)",
};

const wrap = (i: number, n: number) => ((Math.round(i) % n) + n) % n;
const ringDist = (a: number, b: number, n: number) => Math.min(Math.abs(a - b), n - Math.abs(a - b));

/**
 * Hero as a tailor's inspection table with a 360-degree product viewer. Drag the photograph to spin the garment
 * through its frames (with momentum), zoom in and pan, switch between the track pants and the T-shirt, and point
 * at a numbered spot to read it and see that cloth under a loupe cut from the same frame. A product with a real
 * turntable set (8 or more frames in public/turntable) spins smoothly; until then four real photographs stand in.
 */
export function SpotlightHero({ eyebrow, heading, subheading, cta, secondary, turntables, models = {} }: { eyebrow: string; heading: string; subheading: string; cta: Cta; secondary: Cta; turntables: Partial<Record<string, TurntableSet>>; models?: Partial<Record<string, string>> }) {
  const products: Product[] = ["pants", "tee", "look"].map((id) => {
    const real = turntables[id];
    return real
      ? { id, label: LABELS[id], frames: real.frames, spots: real.spots, spin: true, keyLabels: SPIN_KEYS }
      : { id, label: LABELS[id], frames: STAND_IN[id].frames, spots: STAND_IN[id].spots, spin: false, keyLabels: STAND_IN[id].keys };
  });

  const [classic, setClassic] = useState(false);
  useEffect(() => {
    // The address is only readable in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClassic(new URLSearchParams(window.location.search).get("viewer") === "classic");
  }, []);
  const Viewer = classic ? GarmentClassic : Garment3D;

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
  const model = models[product.id];
  // The view a 3D model is gliding to (null once the visitor takes hold of it).
  const [view3d, setView3d] = useState<View3DDef & { n: number } | null>(null);
  const points3d = useMemo<Point3D[]>(
    () =>
      (POINTS_3D[product.id] ?? []).flatMap((p) => {
        const sp = STAND_IN[product.id]?.spots.find((x) => x.label === p.label);
        return sp ? [{ ...p, key: `${product.id}-${sp.frame}-${sp.label}` }] : [];
      }),
    [product.id],
  );
  const n = product.frames.length;
  const tol = product.spin ? 2 : 0;

  // Depth: with a mouse, the figure leans a few degrees toward the pointer. It does nothing on its own, never runs on
  // touch screens, and its frame loop sleeps whenever the figure is at rest.
  const tilt = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = tilt.current;
    const stage = box.current;
    if (!el || !stage || !matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    let tx = 0;
    let ty = 0;
    let ry = 0;
    let rx = 0;
    let raf = 0;
    const step = () => {
      raf = 0;
      const gy = tx * 8;
      const gx = -ty * 3.5;
      ry += (gy - ry) * 0.1;
      rx += (gx - rx) * 0.1;
      el.style.transform = `perspective(1100px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
      el.style.setProperty("--sx", `${(-ry * 2.4).toFixed(1)}px`);
      if (Math.abs(gy - ry) > 0.02 || Math.abs(gx - rx) > 0.02) raf = requestAnimationFrame(step);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const move = (e: PointerEvent) => {
      const b = stage.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - b.left) / b.width - 0.5) * 2));
      ty = Math.max(-1, Math.min(1, ((e.clientY - b.top) / b.height - 0.5) * 2));
      wake();
    };
    const leave = () => {
      tx = 0;
      ty = 0;
      wake();
    };
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerleave", leave);
    };
  }, [pi]);

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
    setView3d(null);
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

  // With a 3D model the points are the model's own; each borrows the close-up of the photo spot with the same name.
  const visibleSpots = model ? points3d.flatMap((p) => product.spots.find((s) => s.label === p.label) ?? []) : zoom > 1 ? [] : product.spots.filter((s) => ringDist(s.frame, frame, n) <= tol);
  const keyOf = (s: Spot) => `${product.id}-${s.frame}-${s.label}`;
  const active = visibleSpots.find((s) => keyOf(s) === spotKey) ?? visibleSpots[0] ?? null;
  const activeIdx = active ? visibleSpots.indexOf(active) : -1;
  const cutout = isCut(product.frames[frame]);
  const fade = FADE[product.frames[frame]];
  const keyIndex = product.spin ? Math.min(3, Math.round((frame * 4) / n) % 4) : frame;
  const words = heading.trim().split(/\s+/);
  const cut = Math.ceil(words.length / 2);
  const keyFrames = product.spin ? [0, 1, 2, 3].map((k) => Math.round((k * n) / 4)) : product.frames.map((_, i) => i);

  return (
    <section aria-labelledby="hero-heading" className="sp-stage relative isolate flex flex-col overflow-hidden text-white lg:block lg:h-[calc(100svh-var(--hdr))] lg:min-h-[41rem]">
      {/* The stage: a soft halo of light behind the product and a floor. */}
      <div aria-hidden className="sp-halo" />
      {/* The LESPARO bird from the logo, large and faint behind the product. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative, fixed-size mark */}
      <img aria-hidden src="/lesparo-bird.png" alt="" width={1140} height={1464} className="sp-bird" />
      <div aria-hidden className="sp-floor" />

      <div className="sp-leave-text contents lg:absolute lg:left-8 lg:top-10 lg:z-20 lg:flex lg:max-w-[15rem] lg:flex-col xl:left-12 xl:max-w-[25rem]">
        {/* Text column, top left: a small label, a two-weight title, then the description and actions. */}
        <div className="sp-copy relative z-20 px-5 pt-8 sm:px-8 lg:p-0">
          <p className="flex items-center gap-3 text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-white/75">
            <span aria-hidden className="size-1.5 rounded-full bg-[#ffc82c]" />
            {eyebrow}
          </p>
          <h1 id="hero-heading" className="mt-5 font-display text-[clamp(1.9rem,1rem+1.7vw,2.9rem)] leading-[1.06] tracking-[-0.03em] text-balance">
            <span className="block font-light text-white/85">
              {words.slice(0, cut).map((w, i) => (
                <span key={i} className="sp-word inline-block" style={{ ["--w" as string]: i }}>
                  {w}&nbsp;
                </span>
              ))}
            </span>
            <span className="block font-bold text-white">
              {words.slice(cut).map((w, i) => (
                <span key={i} className="sp-word inline-block" style={{ ["--w" as string]: cut + i }}>
                  {w}&nbsp;
                </span>
              ))}
            </span>
          </h1>
        </div>

          {/* Description and actions, under the headline. */}
        <div className="sp-copy relative z-20 order-last px-5 pb-8 sm:px-8 lg:order-none lg:mt-8 lg:p-0">
          <p className="text-[0.95rem] leading-relaxed text-white/85">{subheading}</p>
          <div className="mt-5 flex flex-wrap gap-3 lg:flex-col lg:items-stretch xl:flex-row">
            <Link href={cta.href} className="inline-flex h-12 items-center justify-center gap-2 bg-white px-7 text-[0.78rem] font-bold uppercase tracking-[0.16em] text-[#0e1b4f] transition-colors duration-200 hover:bg-[#ffc82c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc82c]">
              {cta.label} <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href={secondary.href} className="inline-flex h-12 items-center justify-center border border-white/60 px-6 text-[0.78rem] font-bold uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:border-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc82c]">
              {secondary.label}
            </Link>
          </div>
        </div>
      </div>

      {/* Category selector, top right. */}
      <div role="group" aria-label="Choose a product" className="sp-copy relative z-30 px-5 pt-5 sm:px-8 lg:absolute lg:right-8 lg:top-10 lg:p-0 xl:right-12">
        <ul className="grid grid-cols-3 gap-2 sm:gap-2.5 lg:w-[30rem]">
          {products.map((p, i) => {
            const on = pi === i;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => choose(i)}
                  className={`flex h-12 w-full items-center justify-center gap-2 border px-1.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] sm:px-3 sm:text-[0.8rem] sm:tracking-[0.14em] transition-[background-color,color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc82c] ${
                    on ? "border-white bg-white text-[#0e1b4f]" : "border-white/40 bg-[#0e1b4f]/70 text-white hover:border-white hover:bg-white/10"
                  }`}
                >
                  <span aria-hidden className={`size-1.5 rounded-full transition-colors duration-200 ${on ? "bg-[#e5a800]" : "bg-transparent"}`} />
                  {p.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* The product viewer. */}
      <div className="sp-leave-figure relative z-10 my-6 flex justify-center px-5 lg:absolute lg:inset-x-0 lg:bottom-[5.25rem] lg:top-[6.25rem] lg:my-0 lg:px-0">
        {model ? (
          <div className="sp-product relative w-full max-w-[22rem] overflow-hidden lg:h-full lg:w-auto lg:max-w-none" style={{ aspectRatio: "2 / 3" }}>
            <Viewer key={`${model}-${classic}`} src={model === "/models/look" ? LOOK_PARTS : model} label={product.label} poster={product.frames[0]} points={points3d} activeKey={active ? keyOf(active) : null} onPick={setSpotKey} view={view3d} onGrab={() => setView3d(null)} />
          </div>
        ) : (
        <div
          ref={box}
          role="group"
          aria-label={`${product.label}. Drag sideways, or use the arrow keys, to turn it. Plus and minus zoom.`}
          tabIndex={0}
          className={`sp-product relative w-full max-w-[22rem] select-none overflow-hidden outline-offset-[4px] focus-visible:outline-2 focus-visible:outline-[#ffc82c] lg:h-full lg:w-auto lg:max-w-none ${zoom > 1 ? "cursor-move" : "cursor-grab active:cursor-grabbing"} touch-pan-y`}
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
          {cutout && !fade && <div aria-hidden className="pointer-events-none absolute inset-x-[16%] bottom-0 h-[3.5%] rounded-[50%] bg-black/60 blur-xl" />}
          <div ref={tilt} className="absolute inset-0 will-change-transform" style={{ transformStyle: "preserve-3d" }}>
          <div className="absolute inset-0" style={{ transform: `translate(${pan.x}%, ${pan.y}%) scale(${zoom})`, transformOrigin: "50% 50%", transition: dragging ? "none" : "transform 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- frames swap quickly and are preloaded; the optimiser would add a round trip per frame */}
            <img
              src={product.frames[frame]}
              alt={`${product.label}, ${product.keyLabels[keyIndex]} view`}
              draggable={false}
              decoding="async"
              fetchPriority="high"
              className={`pointer-events-none absolute inset-0 size-full ${cutout ? "object-contain drop-shadow-[var(--sx,0px)_26px_28px_rgb(0_0_0/0.45)]" : "object-cover ring-1 ring-white/15"}`}
              style={fade ? { maskImage: FADE_MASK[fade], WebkitMaskImage: FADE_MASK[fade] } : undefined}
            />
          </div>

          {visibleSpots.map((p, i) => {
            const on = p === active;
            return (
              <button
                key={keyOf(p)}
                type="button"
                aria-label={`${i + 1} of ${visibleSpots.length}. ${p.label}`}
                aria-pressed={on}
                onClick={() => setSpotKey(keyOf(p))}
                onFocus={() => setSpotKey(keyOf(p))}
                onPointerDown={(e) => e.stopPropagation()}
                className="sp-pin group absolute grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ffc82c]"
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
              >
                <span aria-hidden className={`grid size-8 place-items-center rounded-full border-2 transition-[transform,background-color,border-color] duration-200 group-hover:scale-110 ${on ? "border-[#ffc82c] bg-[#0e1b4f]/55" : "border-white bg-[#0e1b4f]/35 group-hover:bg-[#0e1b4f]/60"}`}>
                  <span className={`size-2.5 rounded-full transition-colors duration-200 ${on ? "bg-[#ffc82c]" : "bg-white"}`} />
                </span>
              </button>
            );
          })}
          </div>

          <div className="absolute bottom-3 right-3 z-20 flex flex-col border border-white/40 bg-[#0e1b4f]/80 backdrop-blur" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Zoom in" disabled={zoom >= 2.6} onClick={() => setZ(zoom + 0.6)} className="grid size-10 place-items-center hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-[#ffc82c] disabled:opacity-40">
              <Plus className="size-4" aria-hidden />
            </button>
            <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZ(zoom - 0.6)} className="grid size-10 place-items-center border-t border-white/30 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-[#ffc82c] disabled:opacity-40">
              <Minus className="size-4" aria-hidden />
            </button>
          </div>

          <p aria-hidden className={`pointer-events-none absolute inset-x-0 top-2 z-10 text-center text-[0.7rem] font-bold uppercase tracking-[0.2em] text-white drop-shadow-[0_1px_6px_rgb(0_0_0/0.7)] transition-opacity duration-700 ${touched ? "opacity-0" : "opacity-100"}`}>
            {product.spin ? "Drag to spin 360°" : "◀ Drag to turn ▶"}
          </p>
          {loaded < n && (
            <p aria-hidden className="pointer-events-none absolute bottom-3 left-3 z-10 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/85 drop-shadow-[0_1px_4px_rgb(0_0_0/0.6)]">
              Loading {loaded}/{n}
            </p>
          )}
        </div>
        )}
      </div>

      {/* View tabs, bottom centre. */}
      {model && (
        <div role="group" aria-label="View" className="sp-copy relative z-20 flex justify-center px-5 pb-6 lg:absolute lg:inset-x-0 lg:bottom-7 lg:p-0">
          <ul className="flex w-full max-w-[24rem] border border-white/30 bg-[#0e1b4f]/70 backdrop-blur-sm sm:w-auto sm:max-w-full">
            {(VIEWS_3D[product.id] ?? []).map((v) => {
              const on = view3d?.id === v.id;
              return (
                <li key={v.id} className="flex-1 sm:flex-none">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setView3d({ ...v, n: (view3d?.n ?? 0) + 1 });
                      const sp = product.spots.find((s) => s.label === v.point);
                      if (sp) setSpotKey(keyOf(sp));
                    }}
                    className={`min-h-11 w-full px-2 py-2 text-center text-[0.7rem] leading-tight sm:whitespace-nowrap sm:text-[0.75rem] font-bold uppercase tracking-[0.14em] transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ffc82c] sm:px-5 sm:py-0 ${on ? "bg-white text-[#0e1b4f]" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                  >
                    {v.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {!model && <div role="group" aria-label="View" className="sp-copy relative z-20 flex justify-center px-5 pb-6 lg:absolute lg:inset-x-0 lg:bottom-7 lg:p-0">
        <ul className="flex w-full max-w-[24rem] border border-white/30 bg-[#0e1b4f]/70 backdrop-blur-sm sm:w-auto sm:max-w-full">
          {keyFrames.map((f, i) => {
            const on = ringDist(f, frame, n) <= (product.spin ? Math.floor(n / 8) : 0);
            return (
              <li key={f} className="flex-1 sm:flex-none">
                <button type="button" aria-pressed={on} onClick={() => goTo(f)} className={`min-h-11 w-full px-2 py-2 text-center text-[0.7rem] leading-tight sm:whitespace-nowrap sm:text-[0.75rem] font-bold uppercase tracking-[0.14em] transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ffc82c] sm:px-5 sm:py-0 ${on ? "bg-white text-[#0e1b4f]" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                  {product.keyLabels[i]}
                </button>
              </li>
            );
          })}
        </ul>
      </div>}

      {/* Detail panel, bottom right: the close-up, its name and what it is. */}
      <div aria-live="polite" className="sp-copy relative z-20 px-5 pb-7 sm:px-8 lg:absolute lg:bottom-7 lg:right-8 lg:w-[16rem] lg:p-0 xl:w-[23rem] 2xl:right-12 2xl:w-[26rem]">
        {active ? (
          <div key={keyOf(active)} className="sp-detail flex flex-col gap-4 bg-[#081038]/85 p-4 ring-1 ring-white/15 backdrop-blur-sm ">
            <span aria-hidden className="block h-44 w-full shrink-0 bg-no-repeat sm:h-52 lg:h-44 xl:h-52 2xl:h-56" style={{ backgroundImage: `url(${detailSrc(product.frames[active.frame])})`, backgroundSize: "400% auto", backgroundPosition: `${active.x * 100}% ${active.y * 100}%` }} />
            <div className="min-w-0">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[#ffc82c]">
                Detail {activeIdx + 1} of {visibleSpots.length}
              </p>
              <h2 className="mt-1 font-display text-[1.2rem] font-bold leading-tight tracking-tight">{active.label}</h2>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-white/85">{active.detail ?? DETAILS[active.label] ?? "Select another point to compare the cloth."}</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#081038]/85 p-4 ring-1 ring-white/15 backdrop-blur-sm">
            <p className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[#ffc82c]">Product detail</p>
            <h2 className="mt-1 font-display text-[1.2rem] font-bold leading-tight tracking-tight">{product.label}</h2>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-white/85">{model ? (points3d.length ? "Select a numbered point on the garment to see it close up." : "Drag to turn the full look, or choose a view below.") : zoom > 1 ? "Zoom out to see the marked points on the garment." : "Turn the garment to a view with marked points, then select one to see it close up."}</p>
          </div>
        )}
      </div>

    </section>
  );
}
