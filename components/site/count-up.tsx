"use client";

import { useEffect, useRef } from "react";

/**
 * Renders the final number (server HTML, screen readers and reduced motion all get it as is),
 * then counts up from `from` the first time it scrolls into view. Uses tabular figures so the
 * width never changes while counting.
 */
export function CountUp({ value, from = 0, duration = 1400, className }: { value: number; from?: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          el.textContent = String(Math.round(from + (value - from) * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        el.textContent = String(from);
        frame = requestAnimationFrame(tick);
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = String(value);
    };
  }, [value, from, duration]);

  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <span ref={ref} aria-hidden className="tabular-nums">
        {value}
      </span>
    </span>
  );
}
