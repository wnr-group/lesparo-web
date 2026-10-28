"use client";

import clsx from "clsx";
import Image from "next/image";
import { useState, ViewTransition } from "react";
import type { ProductImage } from "@/lib/catalogue/queries";

export function ProductGallery({ images, name, productId }: { images: ProductImage[]; name: string; productId: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return <div className="flex aspect-[513/655] items-center justify-center rounded-[1.6rem] bg-plate font-display font-semibold text-xl text-muted ring-1 ring-line">Image coming soon</div>;
  }
  const current = images[Math.min(active, images.length - 1)];
  return (
    <div className="flex min-w-0 flex-col-reverse gap-4 md:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto pb-1 md:w-20 md:flex-col md:overflow-visible" aria-label={`${name} images`}>
          {images.map((img, i) => (
            <li key={img.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowRight") setActive((a) => (a + 1) % images.length);
                  if (e.key === "ArrowUp" || e.key === "ArrowLeft") setActive((a) => (a - 1 + images.length) % images.length);
                }}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === active}
                className={clsx(
                  "relative block aspect-[513/655] w-16 overflow-hidden rounded-xl bg-[#f1efe9] ring-1 transition md:w-20",
                  i === active ? "ring-2 ring-ink" : "ring-line opacity-70 hover:opacity-100",
                )}
              >
                <Image src={img.url} alt="" fill sizes="80px" className="object-contain cutout" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ViewTransition name={`product-${productId}`} share="morph" default="none">
        <div className="relative aspect-[513/655] flex-1 overflow-hidden rounded-[1.6rem] bg-[#f1efe9]">
          <Image
            key={current.url}
            src={current.url}
            alt={current.alt}
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-contain cutout motion-safe:animate-[rise_0.5s_var(--ease-out-soft)]"
          />
        </div>
      </ViewTransition>
    </div>
  );
}
