"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef } from "react";
import type { DeckItem } from "./card-deck";
import { clamp01, range, useReducedMotion, usePinProgress } from "./use-pin-progress";

/**
 * Featured products as a reel. The section pins and the reel slides sideways with the scroll; the card nearest the
 * focus line is in full colour and the rest dim back. For reduced motion it is a plain scrolling row instead.
 */
export function ProductReel({ items }: { items: DeckItem[] }) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);
  const cards = useRef<HTMLLIElement[]>([]);
  const bar = useRef<HTMLSpanElement>(null);
  const count = useRef<HTMLSpanElement>(null);

  const onProgress = useCallback((p: number) => {
    const t = track.current;
    const v = view.current;
    if (!t || !v) return;
    const vw = v.clientWidth;
    const left = v.getBoundingClientRect().left;
    const k = range(p, 0.04, 0.96);
    const travel = Math.max(0, t.scrollWidth - vw);
    t.style.transform = `translate3d(${-k * travel}px, 0, 0)`;
    let nearest = 0;
    let best = Infinity;
    cards.current.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const off = (r.left + r.width / 2 - (left + vw * 0.4)) / vw;
      const a = clamp01(Math.abs(off) * 1.6);
      card.style.opacity = String(1 - a * 0.55);
      card.style.transform = `scale(${1 - a * 0.06})`;
      if (Math.abs(off) < best) {
        best = Math.abs(off);
        nearest = i;
      }
    });
    if (bar.current) bar.current.style.transform = `scaleX(${k})`;
    if (count.current) count.current.textContent = String(nearest + 1).padStart(2, "0");
  }, []);
  usePinProgress(root, onProgress, !reduced);

  const heading = (
    <div className="relative z-10 shrink-0 px-5 sm:px-8 md:w-[32vw] md:pl-[max(2rem,6vw)] md:pr-10">
      <p className="eyebrow mb-4">From the catalogue</p>
      <h2 className="font-display text-headline font-bold">Everyday wear, made to supply</h2>
      <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed text-ink-soft max-md:hidden">
        Shorts, tracks and 3/4ths in hosiery and jersey knits, packed in sets for retailers — alongside our lungis, kavi dhothies, towels and kerchiefs.
      </p>
      <div className="mt-6 flex items-center gap-5 max-md:hidden">
        <Link href="/shop" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-indigo">
          Shop all products <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        {!reduced && (
          <span aria-hidden className="flex items-center gap-3 text-xs font-semibold tabular-nums text-muted">
            <span>
              <span ref={count} className="text-ink">
                01
              </span>{" "}
              / {String(items.length).padStart(2, "0")}
            </span>
            <span className="relative h-px w-24 bg-line">
              <span ref={bar} className="absolute inset-0 origin-left bg-indigo" style={{ transform: "scaleX(0)" }} />
            </span>
          </span>
        )}
      </div>
    </div>
  );

  const list = (
    <ol
      ref={track}
      className={reduced ? "mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:px-8" : "mt-8 flex w-max gap-5 pl-5 pr-5 will-change-transform sm:pl-8 md:mt-0 md:gap-7 md:pl-2 md:pr-10"}
    >
      {items.map((item, i) => (
        <li
          key={item.id}
          ref={(el) => {
            if (el) cards.current[i] = el;
          }}
          className="w-[68vw] shrink-0 origin-bottom snap-start sm:w-[42vw] md:w-[clamp(16rem,24vw,22rem)]"
        >
          <Link href={`/products/${item.slug}`} className="group block">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-mist">
              <Image src={item.image} alt={item.name} fill sizes="(min-width: 768px) 24vw, 68vw" className="cutout object-contain p-[7%] transition-transform duration-700 group-hover:scale-[1.05]" />
            </div>
            <div className="mt-4 flex gap-4">
              <span className="font-display text-sm font-bold text-indigo">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-bold leading-tight tracking-tight">{item.name}</span>
                {item.category && <span className="mt-0.5 block text-sm text-muted">{item.category}</span>}
                {item.detail && <span className="mt-1 block text-sm leading-relaxed text-ink-soft">{item.detail}</span>}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );

  if (reduced) {
    return (
      <section aria-label="Featured products" className="py-20">
        {heading}
        {list}
      </section>
    );
  }

  return (
    <section ref={root} aria-label="Featured products" className="relative" style={{ height: `${Math.max(240, items.length * 60 + 80)}svh` }}>
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden pt-16 md:flex-row md:items-center md:justify-start md:pt-0">
        {heading}
        <div ref={view} className="min-w-0 md:flex-1 md:overflow-hidden">
          {list}
        </div>
      </div>
    </section>
  );
}
