"use client";

import { useEffect } from "react";

/**
 * Gives the homepage hero's line-up some depth: on devices with a mouse, the figures drift sideways a
 * few pixels against the pointer, the outer ones further than the middle ones (each figure carries its
 * own --k). The drift is eased with a spring-like lerp and stops itself once it has settled. Skipped on
 * touch screens and for reduced motion; the handler is removed on unmount. Renders nothing.
 */
export function HeroPointer() {
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const hero = document.querySelector<HTMLElement>("[data-hero-apple]");
    const lineup = hero?.querySelector<HTMLElement>(".hero-lineup");
    if (!hero || !lineup) return;

    let target = 0;
    let current = 0;
    let frame = 0;
    const step = () => {
      current += (target - current) * 0.08;
      if (Math.abs(target - current) < 0.001) current = target;
      lineup.style.setProperty("--px", current.toFixed(4));
      frame = current === target ? 0 : requestAnimationFrame(step);
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };
    const onMove = (e: PointerEvent) => {
      target = (e.clientX / window.innerWidth) * 2 - 1;
      kick();
    };
    const onLeave = () => {
      target = 0;
      kick();
    };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return null;
}
