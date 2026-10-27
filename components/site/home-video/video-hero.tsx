"use client";

import { useEffect, useRef } from "react";

/**
 * The hero film. The <video> is in the server-rendered HTML with preload="auto", so the browser starts
 * fetching it as soon as the page arrives rather than after hydration. Afterwards this only applies the
 * viewer's preferences: reduced motion and data-saver stop it, and it pauses while scrolled out of view so
 * it never decodes off-screen.
 */
export function HeroVideo({ src, webm }: { src: string; webm?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || conn?.saveData) {
      v.pause();
      return;
    }
    // A touch slower reads as more cinematic and softens the cuts in the clip.
    v.playbackRate = 0.85;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.1 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      aria-hidden
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      // The clip has a pale panel with garbled lettering on its left edge in the factory shot, so the film is
      // enlarged toward the right and that strip falls outside the frame.
      className="absolute inset-0 size-full origin-right scale-[1.42] object-cover"
    >
      {webm && <source src={webm} type="video/webm" />}
      <source src={src} type="video/mp4" />
    </video>
  );
}
