"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Horizontal storytelling strip. On large screens (motion allowed) the section pins below the
 * header and vertical scrolling moves the strip sideways, with a progress bar; the page scroll
 * itself is never captured, the section is simply taller. While pinned, the panel nearest the
 * middle is in focus and the others dim back (a film-reel focus). Everywhere else it is a native
 * swipeable row with scroll snapping, so every panel stays reachable by touch and keyboard.
 */
export function PinnedTrack({ children, label }: { children: ReactNode; label: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const o = outer.current;
    const v = viewport.current;
    const t = track.current;
    const b = bar.current;
    if (!o || !v || !t || !b) return;
    const mq = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    let distance = 0;
    let frame = 0;

    const update = () => {
      if (!o.hasAttribute("data-pinned")) return;
      const pinTop = parseFloat(getComputedStyle(v).top) || 0;
      const progress = distance ? Math.min(1, Math.max(0, (pinTop - o.getBoundingClientRect().top) / distance)) : 0;
      t.style.transform = `translate3d(${(-progress * distance).toFixed(1)}px,0,0)`;
      b.style.transform = `scaleX(${progress.toFixed(4)})`;
      // Reel focus: the panel nearest the focus line (a little right of centre) is sharp; the
      // rest dim and ease back by their distance from it.
      const vw = v.clientWidth;
      for (const panel of panels()) {
        const r = panel.getBoundingClientRect();
        const off = Math.min(1, (Math.abs(r.left + r.width / 2 - vw * 0.58) / vw) * 1.5);
        panel.style.opacity = String(1 - off * 0.6);
        panel.style.scale = String(1 - off * 0.06);
      }
    };
    const panels = () => Array.from(t.children).filter((c): c is HTMLElement => c instanceof HTMLElement && !c.hasAttribute("aria-hidden"));
    const measure = () => {
      if (!mq.matches) {
        o.removeAttribute("data-pinned");
        o.style.height = "";
        t.style.transform = "";
        for (const panel of panels()) {
          panel.style.opacity = "";
          panel.style.scale = "";
        }
        return;
      }
      o.setAttribute("data-pinned", "");
      distance = Math.max(0, t.scrollWidth - v.clientWidth);
      o.style.height = `${v.offsetHeight + distance}px`;
      update();
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(t);
    ro.observe(v);
    mq.addEventListener("change", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      mq.removeEventListener("change", measure);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={outer} className="group/pin relative">
      <div
        ref={viewport}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="flex snap-x snap-mandatory flex-col overflow-x-auto [scrollbar-width:none] group-data-[pinned]/pin:sticky group-data-[pinned]/pin:top-[4.5rem] group-data-[pinned]/pin:h-[calc(100svh-4.5rem)] group-data-[pinned]/pin:snap-none group-data-[pinned]/pin:overflow-hidden"
      >
        <div aria-hidden className="mx-auto hidden w-full max-w-page px-10 pt-10 group-data-[pinned]/pin:block">
          <div className="h-0.5 overflow-hidden rounded-full bg-line">
            <span ref={bar} className="block h-full origin-left scale-x-0 bg-indigo" />
          </div>
        </div>
        <div ref={track} className="flex w-max flex-1 items-center will-change-transform">
          {children}
        </div>
      </div>
    </div>
  );
}
