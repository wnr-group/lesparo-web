"use client";

import { useSyncExternalStore } from "react";
import { ClipVideo } from "./clip-video";

const subscribe = () => () => {};
const allowed = () => {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const slow = !!conn?.saveData || /^(slow-2g|2g|3g)$/.test(conn?.effectiveType ?? "");
  const wide = window.matchMedia("(min-width: 640px)").matches;
  const calm = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return wide && calm && !slow;
};

/**
 * The promo film behind a collection banner. The banner already shows its photograph underneath, so the film is a
 * bonus that is only fetched where it is worth the bytes: on wide screens, with motion allowed, and not on a slow or
 * data-saving connection. Phones keep the photograph and skip a multi-megabyte download.
 */
export function BannerVideo({ src, clip, className }: { src: string; clip?: [number, number]; className?: string }) {
  const ok = useSyncExternalStore(subscribe, allowed, () => false);
  if (!ok) return null;
  return clip ? <ClipVideo src={src} start={clip[0]} end={clip[1]} className={className} /> : <video src={src} autoPlay muted loop playsInline preload="metadata" aria-hidden className={className} />;
}
