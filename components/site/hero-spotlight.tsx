"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Spot = { slug: string; name: string };

/**
 * Walks a spotlight along the hero line-up, one product at a time, and names it in a "Now showing" chip
 * (Dribbble's credit pill) that links to the product. The focus itself is plain CSS: this sets data-spot
 * on the line-up and globals.css keeps that figure sharp while the rest soften (Scrolltide's focus
 * reveal). It starts once the entrance has played, pauses while the pointer or keyboard is on the
 * line-up or the chip, skips hidden tabs, and does nothing for reduced motion, so every figure stays
 * sharp. Renders only the chip.
 */
export function HeroSpotlight({ models }: { models: Spot[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (models.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = window.setTimeout(() => setOn(true), 3200);
    return () => window.clearTimeout(start);
  }, [models.length]);

  useEffect(() => {
    const lineup = document.querySelector<HTMLElement>("[data-hero-apple] .hero-lineup");
    if (!lineup) return;
    if (!on) {
      lineup.removeAttribute("data-spot");
      return;
    }
    lineup.dataset.spot = String(i);
    const hold = () => setPaused(true);
    const release = () => setPaused(false);
    lineup.addEventListener("pointerenter", hold);
    lineup.addEventListener("pointerleave", release);
    lineup.addEventListener("focusin", hold);
    lineup.addEventListener("focusout", release);
    return () => {
      lineup.removeEventListener("pointerenter", hold);
      lineup.removeEventListener("pointerleave", release);
      lineup.removeEventListener("focusin", hold);
      lineup.removeEventListener("focusout", release);
    };
  }, [on, i]);

  useEffect(() => {
    if (!on || paused) return;
    const t = window.setInterval(() => !document.hidden && setI((n) => (n + 1) % models.length), 2800);
    return () => window.clearInterval(t);
  }, [on, paused, models.length]);

  const m = models[i];
  if (!m || !on) return <div className="mt-5 h-11" aria-hidden />;
  return (
    <Link
      key={m.slug}
      href={`/products/${m.slug}`}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className="hero-chip mt-5 inline-flex h-11 items-center gap-3 rounded-full bg-white py-1 pl-4 pr-2 text-sm shadow-[0_6px_24px_-8px_rgb(18_22_76/0.28)] ring-1 ring-black/5"
    >
      <span className="text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[#6e6e73]">Now showing</span>
      <span className="font-semibold text-[#1d1d1f]">{m.name}</span>
      <span className="grid size-8 place-items-center rounded-full bg-indigo text-white">
        <ArrowUpRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}
