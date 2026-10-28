"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useId, useState, type KeyboardEvent } from "react";

export type HistoryItem = { year: string; title: string; body: string; photo?: { src: string; pos: string }; label?: string };

/**
 * The company history as a rail of years. Choose a year (click, tap, arrow keys, or the previous/next buttons) and the panel
 * below turns to that chapter. A line along the rail fills up to the chosen year. Proper tabs for assistive tech: one
 * tablist, one tabpanel, arrow keys and Home/End move between years.
 */
export function HistoryTabs({ items }: { items: HistoryItem[] }) {
  const [i, setI] = useState(0);
  const uid = useId();
  const last = items.length - 1;
  const go = (n: number) => setI(Math.max(0, Math.min(last, n)));

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
    <div>
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
        <figure className="lg:col-span-7">
          <div className="hist-photo relative aspect-[4/3] overflow-clip bg-[#22231f]">
            {cur.photo ? (
              <Image src={cur.photo.src} alt={`${cur.label ?? cur.title}, from today’s LESPARO range`} fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" style={{ objectPosition: cur.photo.pos }} />
            ) : (
              <p aria-hidden className="absolute inset-0 grid place-items-center font-display text-[clamp(8rem,4rem+18vw,22rem)] font-extrabold leading-none tracking-[-0.07em] text-white/15">
                {cur.year.slice(2)}
              </p>
            )}
          </div>
          {cur.photo && <figcaption className="mt-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">From today’s range · {cur.label}</figcaption>}
        </figure>
      </div>

      {/* Previous / next. */}
      <div className="mt-10 flex items-center justify-between border-t border-line pt-5">
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/20 px-5 text-sm font-semibold transition-colors hover:bg-ink hover:text-white disabled:pointer-events-none disabled:opacity-30">
          <ArrowLeft className="size-4" aria-hidden /> Earlier
        </button>
        <p aria-live="polite" className="font-display text-sm font-bold tabular-nums text-muted">
          {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </p>
        <button type="button" onClick={() => go(i + 1)} disabled={i === last} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-deep disabled:pointer-events-none disabled:opacity-30">
          Later <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
