"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

export type DeckItem = { id: string; slug: string; name: string; category: string | null; detail: string; image: string };

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

// Card frames cycle through the brand colours; the number sits in the frame below the photo.
const FRAMES = ["bg-sun text-ink", "bg-indigo text-white", "bg-ink text-sun"];

/**
 * Fanned deck of featured products. Next tosses the front card aside and it slides to the back;
 * previous brings the back card forward. Auto-advances (paused on hover/focus and for reduced
 * motion); details for the front card sit alongside with a link to the product.
 */
export function CardDeck({ items, interval = 5000 }: { items: DeckItem[]; interval?: number }) {
  const [cur, setCur] = useState(0);
  const [toss, setToss] = useState<{ index: number; flip: boolean } | null>(null);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const len = items.length;
  const canToss = len >= 4 && !reduced;

  const next = () => {
    if (canToss) setToss((t) => ({ index: cur, flip: !t?.flip }));
    setCur((c) => (c + 1) % len);
  };
  const prev = () => {
    setToss(null);
    setCur((c) => (c - 1 + len) % len);
  };

  useEffect(() => {
    if (len < 2 || paused || reduced) return;
    const id = window.setTimeout(() => {
      if (canToss) setToss((t) => ({ index: cur, flip: !t?.flip }));
      setCur((c) => (c + 1) % len);
    }, interval);
    return () => window.clearTimeout(id);
  }, [cur, len, paused, reduced, canToss, interval]);

  // The toss animation fills forwards; clear it once played so the card can come round to the front again.
  useEffect(() => {
    if (!toss) return;
    const id = window.setTimeout(() => setToss(null), 900);
    return () => window.clearTimeout(id);
  }, [toss]);

  if (!len) return null;
  const active = items[cur];

  return (
    <div
      className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20"
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setPaused(false)}
    >
      {/* isolate: the cards' z-indexes order them within the deck only, never above the sticky header. */}
      <div className="relative isolate mx-auto aspect-[4/5] w-[min(78vw,26rem)]">
        {items.map((item, n) => {
          const k = Math.min((n - cur + len) % len, 3);
          return (
            <Link
              key={item.id}
              href={`/products/${item.slug}`}
              tabIndex={k === 0 ? 0 : -1}
              aria-hidden={k !== 0}
              data-k={k}
              data-toss={toss?.index === n ? (toss.flip ? "a" : "b") : undefined}
              className={`deck-card absolute inset-0 flex flex-col rounded-[1.75rem] p-3 shadow-[0_30px_60px_-30px_rgb(18_22_76/0.55)] ${FRAMES[n % FRAMES.length]}`}
            >
              <div className="relative flex-1 overflow-hidden rounded-[1.25rem] bg-white">
                <Image src={item.image} alt={item.name} fill sizes="(min-width: 1024px) 26rem, 78vw" className="cutout object-contain p-[6%]" />
              </div>
              <p className="px-3 pb-1 pt-2 font-display text-[clamp(3.5rem,2.5rem+3vw,5.5rem)] font-bold leading-none tracking-[-0.06em]">
                {String(n + 1).padStart(2, "0")}
              </p>
            </Link>
          );
        })}
      </div>

      <div>
        <div key={cur} aria-live={paused || reduced ? "polite" : "off"} className="motion-safe:animate-[rise_0.6s_var(--ease-out-soft)_both]">
          <p className="flex items-baseline gap-4">
            <span className="font-display text-5xl font-bold tracking-[-0.05em] text-ink sm:text-6xl">{String(cur + 1).padStart(2, "0")}</span>
            {active.category && <span className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-indigo">{active.category}</span>}
          </p>
          <h3 className="mt-4 font-display text-[clamp(1.9rem,1.4rem+1.8vw,3rem)] font-bold leading-[1.02] tracking-[-0.035em] text-indigo">{active.name}</h3>
          {active.detail && <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">{active.detail}</p>}
          <Link href={`/products/${active.slug}`} className="link-draw mt-6 inline-flex items-center gap-2 font-semibold text-ink">
            View product <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-10 flex items-center gap-4">
          <button
            type="button"
            onClick={prev}
            className="flex size-12 items-center justify-center rounded-full bg-indigo text-white transition-[background-color,transform] hover:bg-indigo-deep active:scale-95"
            aria-label="Previous product"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={next}
            className="flex size-12 items-center justify-center rounded-full bg-indigo text-white transition-[background-color,transform] hover:bg-indigo-deep active:scale-95"
            aria-label="Next product"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <span className="ml-2 font-display text-sm font-semibold tabular-nums text-muted">
            <span className="text-ink">{String(cur + 1).padStart(2, "0")}</span> / {String(len).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}
