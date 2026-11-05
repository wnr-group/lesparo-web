"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Point3D, View3D } from "@/components/site/spotlight-hero/garment-3d";

const Garment3D = dynamic(() => import("@/components/site/spotlight-hero/garment-3d-premium"), { ssr: false });

type Item = "tee" | "pants" | "look";
type Cta = { label: string; href: string };

const ITEMS: { id: Item; label: string; src: string; poster: string; word: string }[] = [
  { id: "tee", label: "T-shirts", src: "/models/tee.glb", poster: "/spotlight/polo-front.jpg", word: "POLO" },
  { id: "pants", label: "Track pants", src: "/models/pants.glb", poster: "/spotlight/front.webp", word: "PANTS" },
  { id: "look", label: "Full look", src: "/models/look.glb", poster: "/spotlight/model.webp", word: "LOOK" },
];

// Numbered points on the real models, with what each shows. The close-up comes from the shoot photograph at (x, y).
type Spot = { label: string; side: Point3D["side"]; u: number; v: number; text: string; photo?: string; x?: number; y?: number; art?: string };
const SPOTS: Partial<Record<Item, Spot[]>> = {
  tee: [
    { label: "LESPARO brand", side: "front", u: 0.7, v: 0.68, text: "The LESPARO bird mark, the brand's sign, shown here on the chest.", art: "/lesparo-bird.png" },
    { label: "Polo collar", side: "front", u: 0.64, v: 0.9, text: "An open polo collar in cream, set against the brown body.", photo: "/spotlight/polo-front.jpg", x: 0.5, y: 0.09 },
    { label: "Textured knit", side: "front", u: 0.4, v: 0.55, text: "A raised, woven-look knit that gives the cloth depth.", photo: "/spotlight/polo-front.jpg", x: 0.52, y: 0.5 },
    { label: "Contrast cuff", side: "right", u: 0.5, v: 0.62, text: "A cream cuff on each short sleeve, in contrast to the body.", photo: "/spotlight/polo-front.jpg", x: 0.87, y: 0.49 },
    { label: "Cream hem", side: "front", u: 0.5, v: 0.06, text: "A cream band at the hem finishes the bottom edge.", photo: "/spotlight/polo-front.jpg", x: 0.52, y: 0.95 },
  ],
  pants: [
    { label: "Drawstring waistband", side: "front", u: 0.5, v: 0.95, text: "A drawstring at the waist lets you adjust the fit.", photo: "/spotlight/front.jpg", x: 0.495, y: 0.085 },
    { label: "Cargo pocket", side: "right", u: 0.5, v: 0.62, text: "A cargo pocket on the side of the leg, for carrying small things.", photo: "/spotlight/front.jpg", x: 0.25, y: 0.35 },
    { label: "Textured fabric", side: "front", u: 0.64, v: 0.5, text: "A fine, even texture that shows in the cloth up close.", photo: "/spotlight/front.jpg", x: 0.62, y: 0.56 },
    { label: "Back pocket", side: "back", u: 0.42, v: 0.88, text: "A pocket on the back, finished with neat stitching.", photo: "/spotlight/side.jpg", x: 0.57, y: 0.15 },
  ],
};

// Guided angles: each glides the camera round to that view.
type ViewDef = { id: string; label: string; az: number; zoom: number; aimY: number };
const FRONT = { id: "front", label: "Front", az: 0, zoom: 1, aimY: 0 };
const SIDE = { id: "side", label: "Side", az: Math.PI / 2, zoom: 1, aimY: 0 };
const BACK = { id: "back", label: "Back", az: Math.PI, zoom: 1, aimY: 0 };
const VIEWS: Record<Item, ViewDef[]> = {
  tee: [FRONT, SIDE, BACK, { id: "collar", label: "Collar", az: 0, zoom: 0.45, aimY: 0.33 }],
  pants: [FRONT, SIDE, BACK, { id: "waist", label: "Waistband", az: 0, zoom: 0.5, aimY: 0.36 }],
  look: [FRONT, SIDE, BACK, { id: "top", label: "T-shirt", az: 0, zoom: 0.6, aimY: 0.3 }],
};

// Real on-model photographs for each range (public/collections, public/looks, public/menu).
const MODEL_PHOTOS: Record<Item, { src: string; pos: string }[]> = {
  tee: [
    { src: "/collections/gents.jpg", pos: "50% 22%" },
    { src: "/looks/back-polo.jpg", pos: "50% 30%" },
    { src: "/collections/kavi.jpg", pos: "50% 22%" },
  ],
  pants: [
    { src: "/looks/pants-front.jpg", pos: "50% 62%" },
    { src: "/looks/pants-side.jpg", pos: "50% 62%" },
    { src: "/looks/cargo-pants.jpg", pos: "50% 55%" },
  ],
  look: [
    { src: "/menu/men-movement.jpg", pos: "50% 28%" },
    { src: "/looks/training.jpg", pos: "50% 28%" },
    { src: "/looks/beige-tee.jpg", pos: "50% 28%" },
  ],
};

// The stage colours: the coloured planes behind the garment (sky, navy, lavender, rust, sun) on a warm base.
const STAGE = { bg: "#f3ece1", sky: "#8ac8ff", navy: "#3a4aa6", lav: "#b9a8ec", rust: "#8a4b3c", sun: "#ffc82c" };

/**
 * Hero, design 3. A warm stage with coloured planes behind one large real 3D garment: numbered points with a detail card, guided angles,
 * the three ranges as pills, and real on-model photographs.
 */
export function HeroSwatch({ eyebrow, heading, subheading, cta, secondary }: { eyebrow: string; heading: string; subheading: string; cta: Cta; secondary: Cta }) {
  const [item, setItem] = useState<Item>("tee");
  const [view, setView] = useState<View3D | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [turn, setTurn] = useState(0);

  const cur = ITEMS.find((i) => i.id === item) ?? ITEMS[0];
  const spots = useMemo(() => SPOTS[item] ?? [], [item]);
  const points = useMemo<Point3D[]>(() => spots.map((s) => ({ key: `${item}-${s.label}`, label: s.label, side: s.side, u: s.u, v: s.v })), [item, spots]);
  const active = spots.find((s) => `${item}-${s.label}` === pick) ?? spots[0] ?? null;
  const activeIdx = active ? spots.indexOf(active) : -1;
  const t = STAGE;
  const words = heading.trim().split(/\s+/);
  const light = words.slice(0, 3).join(" ");
  const bold = words.slice(3);

  const goView = (v: ViewDef) => {
    const n = turn + 1;
    setTurn(n);
    setView({ id: v.id, az: v.az, zoom: v.zoom, aimY: v.aimY, n });
  };
  const choose = (id: Item) => {
    setItem(id);
    setPick(null);
    setView(null);
  };
  const reset = () => {
    setPick(null);
    goView(FRONT);
  };

  return (
    <section aria-labelledby="hero-heading" className="hsw relative isolate overflow-hidden" style={{ background: t.bg, ["--sky" as string]: t.sky, ["--navy" as string]: t.navy, ["--lav" as string]: t.lav, ["--rust" as string]: t.rust, ["--sun" as string]: t.sun }}>
      {/* The coloured planes (they follow the BANNER theme). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
        <span className="hsw-plane hsw-sky" />
        <span className="hsw-plane hsw-navy" />
        <span className="hsw-plane hsw-navy2" />
        <span className="hsw-plane hsw-lav" />
        <span className="hsw-plane hsw-rust" />
        <span className="hsw-plane hsw-sun" />
      </div>
      <p aria-hidden className="hsw-ghost pointer-events-none absolute left-1/2 top-[48%] hidden -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display font-extrabold italic leading-none tracking-[-0.05em] lg:block">
        {cur.word}
      </p>

      <div className="relative mx-auto max-w-[96rem] px-5 pb-10 pt-8 sm:px-8 lg:h-[min(52rem,calc(100svh-6.7rem))] lg:min-h-[46rem] lg:p-0">
        {/* Left: label, headline, paragraph, actions, and the on-model photographs. */}
        <div className="relative z-20 lg:absolute lg:left-8 lg:top-[3.4rem] lg:w-[min(29rem,31vw)]">
          <p className="flex items-center gap-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-ink-soft">
            <span aria-hidden className="size-1.5 rounded-full bg-sun" />
            {eyebrow}
          </p>
          <h1 id="hero-heading" className="font-display mt-5 text-[clamp(2.2rem,1rem+2.8vw,3.6rem)] leading-[1.02] tracking-[-0.03em] text-ink">
            <span className="block font-light">{light}</span>
            <span className="block font-bold">{bold.join(" ")}</span>
          </h1>
          <p className="mt-6 max-w-[27rem] text-[0.95rem] leading-relaxed text-ink-soft">{subheading}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={cta.href} className="hsw-btn bg-ink text-white hover:bg-indigo">
              {cta.label} <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href={secondary.href} className="hsw-btn border border-ink/30 bg-white/60 text-ink hover:bg-white">
              {secondary.label}
            </Link>
          </div>
          <div className="mt-9 hidden lg:block">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-ink-soft">On the model</p>
            <ul className="hsw-cards mt-3">
              {MODEL_PHOTOS[item].map((p, n) => (
                <li key={`${item}-${p.src}`} className={`hsw-card hsw-card-${n}`}>
                  <Image src={p.src} alt="" fill sizes="140px" className="object-cover" style={{ objectPosition: p.pos }} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Top right: the three ranges. */}
        <div className="relative z-30 mt-5 flex flex-wrap gap-2.5 lg:absolute lg:right-8 lg:top-[3.4rem] lg:mt-0" role="group" aria-label="Choose a range">
          {ITEMS.map((i) => (
            <button key={i.id} type="button" aria-pressed={item === i.id} onClick={() => choose(i.id)} className="hsw-pill">
              {item === i.id && <span aria-hidden className="size-1.5 rounded-full bg-sun" />}
              {i.label}
            </button>
          ))}
        </div>

        {/* The 3D garment, with its ring, its points and its colour preview. */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[47%] hidden aspect-square h-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/30 lg:block" />
        <div className="hsw-viewer relative mx-auto mt-6 h-[28rem] w-full max-w-[26rem] lg:absolute lg:inset-y-[5.6rem] lg:left-[30%] lg:right-[30%] lg:mt-0 lg:h-auto lg:w-auto lg:max-w-none">
          <Garment3D key={item} src={cur.src} label={cur.label} poster={cur.poster} points={points} activeKey={active ? `${item}-${active.label}` : null} onPick={setPick} view={view} onGrab={() => setView(null)} controls={false} />
        </div>

        {/* Bottom centre: the guided angles and a reset. */}
        <div className="relative z-30 mt-4 flex items-center justify-center gap-3 lg:absolute lg:bottom-6 lg:left-[30%] lg:right-[30%] lg:mt-0">
          <div className="flex gap-1 rounded-full bg-white/80 p-1.5 shadow-[0_10px_26px_-14px_rgba(18,22,76,0.5)] ring-1 ring-white backdrop-blur" role="group" aria-label="View">
            {VIEWS[item].map((v) => (
              <button key={v.id} type="button" onClick={() => goView(v)} className="hsw-tab">
                {v.label}
              </button>
            ))}
          </div>
          <button type="button" aria-label="Reset the view" onClick={reset} className="grid size-11 place-items-center rounded-full bg-white/85 text-ink shadow-[0_10px_26px_-14px_rgba(18,22,76,0.5)] ring-1 ring-white transition-transform hover:rotate-[-40deg]">
            <RotateCcw className="size-4" aria-hidden />
          </button>
        </div>

        {/* Bottom right: the detail card for the chosen point. */}
        {active && (
          <div aria-live="polite" className="relative z-30 mt-5 lg:absolute lg:bottom-7 lg:right-9 lg:mt-0 lg:w-[min(24rem,26vw)]">
            <div key={`${item}-${active.label}`} className="hsw-detail flex flex-col gap-3 overflow-hidden rounded-2xl bg-white/95 p-3 shadow-[0_26px_54px_-26px_rgba(18,22,76,0.55)] ring-1 ring-black/5">
              <span
                aria-hidden
                className="block h-28 w-full shrink-0 rounded-xl bg-no-repeat xl:h-32"
                style={active.art ? { backgroundImage: `url(${active.art})`, backgroundSize: "auto 62%", backgroundPosition: "center", backgroundColor: "#12164c" } : { backgroundImage: `url(${active.photo})`, backgroundSize: "400% auto", backgroundPosition: `${(active.x ?? 0.5) * 100}% ${(active.y ?? 0.5) * 100}%` }}
              />
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-indigo">
                  Detail {activeIdx + 1} of {spots.length}
                </p>
                <h2 className="font-display mt-1 text-[1.2rem] font-bold leading-tight tracking-tight text-ink">{active.label}</h2>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-soft">{active.text}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .hsw-plane { position: absolute; }
        .hsw-sky { right: 0; top: 0; width: 42%; height: 80%; background: var(--sky); clip-path: polygon(34% 0, 100% 0, 100% 100%, 0 66%); }
        .hsw-navy { left: 50%; top: 11%; width: 36%; height: 64%; background: var(--navy); opacity: .85; clip-path: polygon(28% 0, 100% 34%, 76% 100%, 0 62%); }
        .hsw-navy2 { left: 60%; top: 20%; width: 30%; height: 44%; background: var(--navy); opacity: .45; clip-path: polygon(0 20%, 100% 0, 88% 100%, 12% 86%); }
        .hsw-lav { left: 6%; bottom: 0; width: 42%; height: 36%; background: var(--lav); opacity: .9; clip-path: polygon(0 100%, 100% 8%, 100% 100%); }
        .hsw-rust { left: 42%; bottom: 0; width: 30%; height: 44%; background: var(--rust); opacity: .8; clip-path: polygon(16% 0, 100% 26%, 84% 100%, 0 100%); }
        .hsw-sun { right: 2.5%; bottom: -7%; width: clamp(14rem, 22vw, 26rem); aspect-ratio: 1; border-radius: 50%; background: var(--sun); }
        .hsw-ghost { font-size: clamp(14rem, 25vw, 27rem); color: rgb(12 15 46 / .06); }
        .hsw-btn { display: inline-flex; align-items: center; gap: .6rem; height: 3.1rem; padding: 0 1.6rem; border-radius: 999px; font-size: .78rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; transition: background-color .3s, transform .3s var(--ease-out-soft); }
        .hsw-btn:active { transform: scale(.97); }
        .hsw-pill { display: inline-flex; align-items: center; gap: .55rem; height: 3rem; padding: 0 1.6rem; border-radius: 999px; background: rgb(255 255 255 / .75); color: #12164c; font-size: .78rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; box-shadow: inset 0 0 0 1px rgb(138 200 255 / .8); transition: background-color .3s, color .3s, transform .3s var(--ease-out-soft); }
        .hsw-pill:hover { transform: translateY(-2px); background: #fff; }
        .hsw-pill[aria-pressed="true"] { background: #0c0f2e; color: #fff; box-shadow: none; }
        .hsw-pill:focus-visible, .hsw-tab:focus-visible { outline: 2px solid #ffd23f; outline-offset: 2px; }
        .hsw-tab { padding: .6rem 1.1rem; border-radius: 999px; font-size: .72rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #3a3f5e; transition: background-color .25s, color .25s; }
        .hsw-tab:hover { background: #12164c; color: #fff; }
        .hsw-cards { position: relative; margin-top: 1.4rem !important; height: 10.5rem; width: 21rem; margin: 0; padding: 0; list-style: none; }
        .hsw-card { position: absolute; top: 0; width: 7.2rem; height: 9.6rem; overflow: hidden; border-radius: .9rem; background: #fff; box-shadow: 0 14px 28px -14px rgba(18,22,76,.55), 0 0 0 2px #262e86; transition: transform .45s var(--ease-out-soft); }
        .hsw-card-0 { left: 0; rotate: -5deg; }
        .hsw-card-1 { left: 4.6rem; top: -.5rem; z-index: 2; height: 10.2rem; width: 7.8rem; }
        .hsw-card-2 { left: 10rem; rotate: 5deg; }
        .hsw-cards:hover .hsw-card { transform: translateY(-4px); }
        .hsw-detail { animation: hsw-in .5s var(--ease-out-soft) both; }
        @keyframes hsw-in { from { opacity: 0; transform: translateY(10px); } }
        @media (prefers-reduced-motion: reduce) { .hsw-detail { animation: none; } }
      `}</style>
    </section>
  );
}
