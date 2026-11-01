"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState, ViewTransition } from "react";
import type { ProductImage } from "@/lib/catalogue/queries";

/** Warm studio neutral. The catalogue photos are shot on white, so `cutout` (multiply) drops the white and the garment sits on this. */
const STAGE = "bg-[#f4f1ec]";

export function ProductGallery({ images, name, productId }: { images: ProductImage[]; name: string; productId: string }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const viewer = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const count = images.length;

  if (!count) {
    return <div className={clsx("flex aspect-[4/5] items-center justify-center font-display text-xl font-semibold text-muted", STAGE)}>Image coming soon</div>;
  }

  const go = (d: number) => {
    setActive((a) => (a + d + count) % count);
    setZoomed(false);
  };
  const current = images[Math.min(active, count - 1)];
  const onKeys = (e: React.KeyboardEvent) => {
    if (count < 2) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      go(1);
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(-1);
    }
  };
  const swipe = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="flex min-w-0 flex-col-reverse gap-3 lg:flex-row lg:gap-4">
      {count > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:max-h-[calc(100dvh-9rem)] lg:w-[4.5rem] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0" aria-label={`${name} images`}>
          {images.map((img, i) => (
            <li key={img.url} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActive(i);
                  setZoomed(false);
                }}
                onKeyDown={onKeys}
                aria-label={`Show image ${i + 1} of ${count}`}
                aria-current={i === active}
                className={clsx("group/t relative block aspect-[4/5] w-14 overflow-hidden transition-opacity duration-300 lg:w-full", STAGE, i === active ? "opacity-100" : "opacity-55 hover:opacity-100")}
              >
                <Image src={img.url} alt="" fill sizes="72px" className="cutout object-contain p-1" />
                <span aria-hidden className={clsx("absolute inset-x-0 bottom-0 h-0.5 bg-ink transition-transform duration-300 origin-left", i === active ? "scale-x-100" : "scale-x-0 group-hover/t:scale-x-50")} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ViewTransition name={`product-${productId}`} share="morph" default="none">
        <div
          className={clsx("group/stage relative aspect-[4/5] min-w-0 flex-1 overflow-hidden lg:aspect-auto lg:h-[calc(100dvh-9rem)] lg:min-h-[30rem]", STAGE)}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={swipe}
          onKeyDown={onKeys}
        >
          {/* Every photo stays mounted and only the active one is visible, so switching is a clean crossfade with no reload flash. */}
          {images.map((img, i) => (
            <Image
              key={img.url}
              src={img.url}
              alt={i === active ? img.alt : ""}
              aria-hidden={i !== active}
              fill
              priority={i === 0}
              sizes="(min-width: 1024px) 45vw, 100vw"
              className={clsx("cutout object-contain p-[5%] transition-opacity duration-500 ease-[var(--ease-atelier)]", i === active ? "opacity-100" : "opacity-0")}
            />
          ))}
          <button type="button" onClick={() => viewer.current?.showModal()} aria-label="View full screen and zoom" className="absolute inset-0 cursor-zoom-in focus-visible:outline-offset-[-4px]" />
          <span aria-hidden className="pointer-events-none absolute right-3 top-3 grid size-9 place-items-center bg-white/85 text-ink opacity-0 backdrop-blur transition-opacity duration-300 group-hover/stage:opacity-100">
            <Maximize2 className="size-4" />
          </span>
          {count > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Previous image" className="absolute left-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center bg-white/85 opacity-0 backdrop-blur transition-opacity duration-300 hover:bg-white group-hover/stage:opacity-100 focus-visible:opacity-100 lg:grid">
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next image" className="absolute right-3 top-1/2 hidden size-10 -translate-y-1/2 place-items-center bg-white/85 opacity-0 backdrop-blur transition-opacity duration-300 hover:bg-white group-hover/stage:opacity-100 focus-visible:opacity-100 lg:grid">
                <ChevronRight className="size-5" aria-hidden />
              </button>
              <span className="pointer-events-none absolute bottom-3 left-3 text-xs font-medium tabular-nums text-ink/70">
                {String(active + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
              </span>
            </>
          )}
        </div>
      </ViewTransition>

      <dialog
        ref={viewer}
        onClose={() => setZoomed(false)}
        onKeyDown={onKeys}
        aria-label={`${name}, full screen`}
        className={clsx("m-0 h-dvh max-h-none w-dvw max-w-none p-0 text-ink backdrop:bg-black/60", STAGE)}
      >
        <div
          className={clsx("relative h-full w-full overflow-hidden", zoomed ? "cursor-zoom-out" : "cursor-zoom-in")}
          onClick={() => setZoomed((z) => !z)}
          onMouseMove={(e) => {
            if (!zoomed) return;
            const r = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--zx", `${((e.clientX - r.left) / r.width) * 100}%`);
            e.currentTarget.style.setProperty("--zy", `${((e.clientY - r.top) / r.height) * 100}%`);
          }}
        >
          <Image
            key={current.url}
            src={current.url}
            alt={current.alt}
            fill
            sizes="100vw"
           
            className={clsx("cutout object-contain p-6 transition-transform duration-500 ease-[var(--ease-out-soft)] sm:p-10", zoomed ? "scale-[2.2]" : "scale-100")}
            style={{ transformOrigin: "var(--zx, 50%) var(--zy, 50%)" }}
          />
        </div>
        <button type="button" onClick={() => viewer.current?.close()} aria-label="Close" className="absolute right-4 top-4 grid size-11 place-items-center bg-white/90 hover:bg-white">
          <X className="size-5" aria-hidden />
        </button>
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous image" className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-white/90 hover:bg-white">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next image" className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-white/90 hover:bg-white">
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        )}
        <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-ink/60">Click to zoom · {active + 1} / {count}</p>
      </dialog>
    </div>
  );
}
