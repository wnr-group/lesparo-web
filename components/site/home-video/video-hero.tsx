"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};
/** Film only where it is worth the bytes: motion allowed, a real screen, no data-saver, not a 2G link. */
function canPlay() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return (
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    window.matchMedia("(min-width: 768px)").matches &&
    !conn?.saveData &&
    !/(^|-)2g$/.test(conn?.effectiveType ?? "")
  );
}

/**
 * Plays the hero film when it is worth playing, and otherwise leaves the poster (the woven-textile
 * fallback beneath it) on screen. The film is skipped for reduced motion, data-saver mode, narrow
 * screens and slow connections, so phones never download it; on a desktop it starts only once the
 * first frame is ready, fading in over the poster so there is no flash.
 */
export function HeroVideo({ src, webm }: { src: string; webm?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const allowed = useSyncExternalStore(subscribe, canPlay, () => false);
  const [ready, setReady] = useState(false);

  // Pause when the hero scrolls out of view so it never decodes off-screen.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.1 });
    io.observe(v);
    return () => io.disconnect();
  }, [allowed]);

  if (!allowed) return null;
  return (
    <video
      ref={ref}
      aria-hidden
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      onCanPlay={() => setReady(true)}
      className={`absolute inset-0 size-full object-cover transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
    >
      {webm && <source src={webm} type="video/webm" />}
      <source src={src} type="video/mp4" />
    </video>
  );
}
