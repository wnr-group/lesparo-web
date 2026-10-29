"use client";

import { useEffect, useRef } from "react";

/**
 * A silent, looping video that plays only one stretch of the file: from `start` to `end` seconds, then back to `start`.
 * The loop point is checked every frame while playing, so it cuts cleanly rather than overshooting by a fraction of a second.
 */
export function ClipVideo({ src, poster, start, end, className }: { src: string; poster?: string; start: number; end: number; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let raf = 0;
    const stop = () => (end && Number.isFinite(v.duration) ? Math.min(end, v.duration) : end);
    const seekToStart = () => {
      if (v.currentTime < start || v.currentTime >= stop()) v.currentTime = start;
    };
    const tick = () => {
      if (v.currentTime >= stop()) v.currentTime = start;
      raf = requestAnimationFrame(tick);
    };
    // A backstop for when animation frames are throttled (a background tab): timeupdate still fires, a few times a second.
    const onTime = () => {
      if (v.currentTime >= stop()) v.currentTime = start;
    };
    const onPlay = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    const onPause = () => cancelAnimationFrame(raf);
    v.addEventListener("loadedmetadata", seekToStart);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    if (v.readyState >= 1) seekToStart();
    if (!v.paused) onPlay();
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("loadedmetadata", seekToStart);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [start, end]);

  return <video ref={ref} src={src} poster={poster} autoPlay muted loop playsInline preload="metadata" aria-hidden className={className} />;
}
