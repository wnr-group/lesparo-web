"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useReducedMotion } from "./use-pin-progress";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type HistoryItem = { year: string; title: string; body: string; photo?: { src: string; pos: string; fit?: "contain" }; caption?: string; range?: { src: string; pos: string; label: string; href: string } };

/**
 * The company history as a rail of years. It turns to the next chapter by itself every few seconds while it is on screen, and
 * stops while the pointer or keyboard focus is inside it, after a Pause, and for visitors who asked for reduced motion.
 * Or choose a year (click, tap, arrow keys, or the previous/next buttons) and the panel below turns to that chapter. A line along the rail fills up to the chosen year. Proper tabs for assistive tech: one
 * tablist, one tabpanel, arrow keys and Home/End move between years.
 */
const STEP_MS = 6500;

export function HistoryTabs({ items }: { items: HistoryItem[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [engaged, setEngaged] = useState(false); // pointer or focus inside
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const uid = useId();
  const last = items.length - 1;
  const go = (n: number) => setI(Math.max(0, Math.min(last, n)));

  // Reduced motion: no automatic changes. Otherwise it only runs while the section is on screen.
  useEffect(() => {
    const el = root.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // One timer per chapter: choosing a year by hand restarts it, and the last chapter loops to the first.
  useEffect(() => {
    if (!playing || reduced || !visible || engaged) return;
    const t = window.setTimeout(() => setI((n) => (n >= last ? 0 : n + 1)), STEP_MS);
    return () => window.clearTimeout(t);
  }, [i, playing, reduced, visible, engaged, last]);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    const n = Math.max(0, Math.min(last, next));
    setI(n);
    document.getElementById(`${uid}-tab-${n}`)?.focus();
  };

  const cur = items[i];
  return (
    <div ref={root} onPointerEnter={() => setEngaged(true)} onPointerLeave={() => setEngaged(false)} onFocus={() => setEngaged(true)} onBlur={() => setEngaged(false)}>
      {/* The rail. */}
      <div className="relative">
        <span aria-hidden className="absolute left-0 right-0 top-[1.05rem] h-px bg-line" />
        <span aria-hidden className="absolute left-0 top-[1.05rem] h-px bg-ink transition-[width] duration-700 ease-[var(--ease-out-soft)]" style={{ width: `${(i / last) * 100}%` }} />
        <div role="tablist" aria-label="Company history" className="relative flex justify-between">
          {items.map((h, n) => {
            const on = n === i;
            return (
              <button
                key={h.year}
                id={`${uid}-tab-${n}`}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls={`${uid}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => setI(n)}
                onKeyDown={onKey}
                className="group flex flex-col items-center gap-3 px-1 text-center outline-none first:items-start last:items-end"
              >
                <span aria-hidden className={`grid size-[2.1rem] place-items-center rounded-full border-2 bg-white transition-colors duration-500 group-focus-visible:ring-2 group-focus-visible:ring-ink group-focus-visible:ring-offset-2 ${n <= i ? "border-ink" : "border-line"}`}>
                  <span className={`size-2.5 rounded-full transition-transform duration-500 ${on ? "scale-100 bg-ink" : n < i ? "scale-75 bg-ink" : "scale-0 bg-ink"}`} />
                </span>
                <span className={`font-display text-lg font-extrabold tabular-nums tracking-tight transition-colors duration-300 sm:text-2xl ${on ? "text-ink" : "text-ink/35 group-hover:text-ink/70"}`}>{h.year}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The chapter. Re-mounted per year, so each arrives with its own entrance. */}
      <div key={i} id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${i}`} tabIndex={0} className="hist-panel mt-12 grid gap-8 outline-none lg:mt-16 lg:grid-cols-12 lg:items-center lg:gap-14">
        <div className="lg:col-span-5">
          <p className="hist-year font-display text-[clamp(5.5rem,3rem+10vw,12rem)] font-extrabold leading-[0.8] tracking-[-0.06em]">{cur.year}</p>
          <h3 className="mt-6 font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">{cur.title}</h3>
          <p className="mt-3 max-w-prose text-lg leading-relaxed text-ink-soft">{cur.body}</p>
        </div>
        <figure className="pb-10 lg:col-span-7">
          <div className="relative">
            <div className={`hist-photo relative aspect-[4/3] overflow-clip ${cur.photo?.fit === "contain" ? "bg-[#f2f3f5]" : "bg-[#22231f]"}`}>
              {cur.photo ? (
                <Image src={cur.photo.src} alt={cur.caption ?? cur.title} fill quality={90} sizes="(min-width:1024px) 55vw, 100vw" className={cur.photo.fit === "contain" ? "object-contain p-6" : "object-cover"} style={{ objectPosition: cur.photo.pos }} />
              ) : (
                <p aria-hidden className="absolute inset-0 grid place-items-center font-display text-[clamp(8rem,4rem+18vw,22rem)] font-extrabold leading-none tracking-[-0.07em] text-white/15">
                  {cur.year.slice(2)}
                </p>
              )}
            </div>
            {/* Today: the part of the LESPARO range that carries this chapter forward, linking into the shop. */}
            {cur.range && (
              <Link href={cur.range.href} className="hist-inset group absolute -bottom-10 left-4 block w-[34%] border-4 border-white bg-white shadow-[0_24px_40px_-20px_rgb(0_0_0/0.45)] sm:left-6 lg:-left-8 lg:w-[30%]">
                <span className="relative block aspect-[4/5] overflow-clip bg-[#22231f]">
                  {/* unoptimized: a 900px file shown ~300px wide; the optimiser would re-encode it small and soft. */}
                  <Image src={cur.range.src} alt="" fill unoptimized sizes="400px" className="hz object-cover" style={{ objectPosition: cur.range.pos }} />
                </span>
                <span className="flex items-center justify-between gap-2 px-2.5 py-2 text-[0.62rem] font-bold uppercase leading-tight tracking-[0.14em] text-ink">
                  <span>
                    <span className="block text-muted">Today</span>
                    {cur.range.label}
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 transition-transform duration-300 group-hover:rotate-45" aria-hidden />
                </span>
              </Link>
            )}
          </div>
          {cur.photo && <figcaption className="mt-3 text-right text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">Illustrative photograph · {cur.caption}</figcaption>}
        </figure>
      </div>

      {/* Previous / next. */}
      <div className="mt-10 flex items-center justify-between border-t border-line pt-5">
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/20 px-5 text-sm font-semibold transition-colors hover:bg-ink hover:text-white disabled:pointer-events-none disabled:opacity-30">
          <ArrowLeft className="size-4" aria-hidden /> Earlier
        </button>
        <div className="flex items-center gap-4">
          <p aria-live={playing ? "off" : "polite"} className="font-display text-sm font-bold tabular-nums text-muted">
            {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
          </p>
          {!reduced && (
          <button type="button" onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Pause automatic changes" : "Play automatic changes"} className="grid size-9 place-items-center rounded-full border border-ink/20 transition-colors hover:bg-ink hover:text-white">
            {playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
          </button>
          )}
        </div>
        <button type="button" onClick={() => go(i + 1)} disabled={i === last} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-deep disabled:pointer-events-none disabled:opacity-30">
          Later <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
