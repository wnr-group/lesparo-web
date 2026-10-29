"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Only a mouse-like pointer that can hover, and only when motion is welcome, gets the pointer effects below. */
const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches;

/**
 * A product plate that tilts a few degrees toward the pointer, with a soft light that follows it. It listens on the
 * whole card (the nearest ancestor marked .group), because a card's full-size link sits above the plate and would
 * otherwise swallow the pointer. Written straight to the element each frame, no React state; cleared on leave.
 */
export function Tilt({ children, className = "", max = 5 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.closest<HTMLElement>(".group") ?? el?.parentElement;
    if (!el || !host) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !finePointer()) return;
      const r = el.getBoundingClientRect();
      const x = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
      const y = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`;
        el.style.setProperty("--lx", `${((x + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty("--ly", `${((y + 0.5) * 100).toFixed(1)}%`);
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      el.style.transform = "";
    };
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
    };
  }, [max]);

  return (
    <div ref={ref} className={`tilt-plate ${className}`}>
      {children}
    </div>
  );
}

/** A wrapper whose contents lean a few pixels toward the pointer while it is near, then spring back. */
export function Magnetic({ children, className = "", pull = 0.28 }: { children: ReactNode; className?: string; pull?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const move = (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || !finePointer()) return;
    const r = el.getBoundingClientRect();
    el.style.translate = `${((e.clientX - (r.left + r.width / 2)) * pull).toFixed(1)}px ${((e.clientY - (r.top + r.height / 2)) * pull).toFixed(1)}px`;
  };
  const leave = () => {
    if (ref.current) ref.current.style.translate = "";
  };
  return (
    <span ref={ref} onPointerMove={move} onPointerLeave={leave} className={`magnetic inline-flex ${className}`}>
      {children}
    </span>
  );
}

/** Writes the pointer's position (-1 to 1) onto the nearest <section> as --px / --py, for layered depth in CSS. Renders nothing. */
export function PointerDepth() {
  const mark = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const section = mark.current?.closest("section");
    if (!section || !finePointer()) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = section.getBoundingClientRect();
        section.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        section.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
    };
    section.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      section.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  return <span ref={mark} hidden />;
}
