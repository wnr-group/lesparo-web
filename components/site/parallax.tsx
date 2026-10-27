"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Moves its child against the scroll so it sits at a different depth from the content around it. `shift` is how far
 * (as a fraction of the viewport height) it travels across the whole pass through the screen; negative values drift
 * the other way. Only runs while on screen, writes straight to the DOM, and stays still for reduced motion.
 */
export function Parallax({ shift = 0.08, className, children }: { shift?: number; className?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let visible = false;
    const run = () => {
      raf = 0;
      const r = el.parentElement?.getBoundingClientRect();
      if (!r) return;
      // -1 as the box enters at the bottom of the screen, 1 as it leaves at the top.
      const p = Math.max(-1, Math.min(1, ((r.top + r.height / 2) / window.innerHeight - 0.5) * 2));
      el.style.transform = `translate3d(0, ${(p * shift * window.innerHeight).toFixed(1)}px, 0)`;
    };
    const queue = () => {
      if (visible && !raf) raf = requestAnimationFrame(run);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      queue();
    });
    if (el.parentElement) io.observe(el.parentElement);
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      cancelAnimationFrame(raf);
    };
  }, [shift]);

  return (
    <div ref={box} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}
