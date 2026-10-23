"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

export type RingItem = { id: string; href: string; name: string; label: string | null; image: string };

/**
 * 3D product ring: cards stand on a cylinder that turns slowly and can be dragged (with
 * momentum). Cards facing the viewer are bright; those turning away fade into depth. A drag never
 * triggers the card link; a plain click does. Animation pauses off screen and in background tabs;
 * reduced motion keeps the ring still but draggable. `frontOnly` fades the far half out
 * completely and shows only the facing card's caption (a cleaner ring on busy backgrounds).
 */
export function ProductRing({ items, frontOnly = false }: { items: RingItem[]; frontOnly?: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const count = items.length;
  const step = 360 / Math.max(count, 1);

  useEffect(() => {
    const st = stage.current;
    const rg = ring.current;
    if (!st || !rg || !count) return;
    const cards = Array.from(rg.children) as HTMLElement[];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let angle = 0;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let moved = 0;
    let tilt = 0;
    let tiltTarget = 0;
    let radius = 0;
    let frame = 0;
    let visible = true;

    const measure = () => {
      const w = cards[0]?.offsetWidth ?? 240;
      radius = Math.round((w / 2 / Math.tan(Math.PI / count)) * 1.12);
      rg.style.setProperty("--ring-r", `${radius}px`);
    };

    const render = () => {
      rg.style.transform = `translateZ(${-radius}px) rotateX(${(-10 + tilt).toFixed(2)}deg) rotateY(${angle.toFixed(2)}deg)`;
      cards.forEach((card, i) => {
        const rel = ((((i * step + angle) % 360) + 540) % 360) - 180; // -180..180, 0 = facing the viewer
        const facing = Math.cos((rel * Math.PI) / 180); // 1 front, -1 back
        card.style.opacity = String(frontOnly ? Math.min(1, Math.max(0, (facing - 0.1) / 0.5)) : 0.25 + 0.75 * Math.max(0, facing) ** 1.5);
        // Front-only rings also keep just the facing card's caption, so one product name reads at a time.
        if (frontOnly) (card.lastElementChild as HTMLElement).style.opacity = String(Math.min(1, Math.max(0, (facing - 0.88) / 0.1)));
        card.style.filter = `brightness(${(0.75 + 0.25 * Math.max(0, facing)).toFixed(3)})`;
        card.style.zIndex = String(Math.round(facing * 100) + 100);
      });
    };

    const tick = () => {
      if (!dragging) {
        velocity *= 0.95;
        angle += velocity + (reduced ? 0 : -0.12);
      }
      tilt += (tiltTarget - tilt) * 0.06;
      render();
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      moved = 0;
      velocity = 0;
      st.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const r = st.getBoundingClientRect();
      if (e.pointerType === "mouse" && !reduced) tiltTarget = ((e.clientY - r.top) / r.height - 0.5) * -8;
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      angle += dx * 0.3;
      velocity = dx * 0.3;
      if (reduced) render();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (st.hasPointerCapture(e.pointerId)) st.releasePointerCapture(e.pointerId);
    };
    const onLeave = () => (tiltTarget = 0);
    // A drag must not open the card under the pointer.
    const onClick = (e: MouseEvent) => {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    measure();
    render();
    const ro = new ResizeObserver(() => {
      measure();
      render();
    });
    ro.observe(st);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    io.observe(st);
    document.addEventListener("visibilitychange", start);
    st.addEventListener("pointerdown", onDown);
    st.addEventListener("pointermove", onMove);
    st.addEventListener("pointerup", onUp);
    st.addEventListener("pointercancel", onUp);
    st.addEventListener("pointerleave", onLeave);
    st.addEventListener("click", onClick, true);
    start();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", start);
      st.removeEventListener("pointerdown", onDown);
      st.removeEventListener("pointermove", onMove);
      st.removeEventListener("pointerup", onUp);
      st.removeEventListener("pointercancel", onUp);
      st.removeEventListener("pointerleave", onLeave);
      st.removeEventListener("click", onClick, true);
    };
  }, [count, step, frontOnly]);

  if (!count) return null;
  return (
    <div ref={stage} className="relative mx-auto h-[25rem] w-full cursor-grab overflow-hidden touch-pan-y select-none [--card-w:5.75rem] [perspective:1400px] active:cursor-grabbing sm:h-[32rem] sm:[--card-w:7rem] lg:h-[36rem] lg:[--card-w:8.25rem]" aria-label="Featured products, drag to turn" role="region">
      {/* Soft floor shadow under the ring. */}
      <div aria-hidden className="absolute bottom-[2%] left-1/2 h-10 w-[min(70%,46rem)] -translate-x-1/2 rounded-[50%] bg-indigo/25 blur-2xl" />
      <div ref={ring} className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]">
        {items.map((p, i) => (
          <Link
            key={p.id}
            href={p.href}
            draggable={false}
            className="absolute -ml-[var(--card-w)] -mt-[calc(var(--card-w)*1.3)] flex w-[calc(var(--card-w)*2)] flex-col rounded-[1.4rem] bg-white p-2.5 shadow-[0_30px_60px_-30px_rgb(18_22_76/0.55)] ring-1 ring-black/5"
            style={{ transform: `rotateY(${i * step}deg) translateZ(var(--ring-r, 26rem))` }}
          >
            <span className="relative block aspect-[4/5] overflow-hidden rounded-[1rem] bg-mist">
              <Image src={p.image} alt={p.name} fill sizes="16rem" draggable={false} className="cutout object-contain p-[6%]" />
            </span>
            <span className="truncate px-1.5 pb-1 pt-2.5 text-left">
              {p.label && <span className="block text-[0.62rem] font-bold uppercase tracking-[0.14em] text-indigo">{p.label}</span>}
              <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
