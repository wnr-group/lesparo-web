"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * A silent looping film inside a frame (give it an aspect ratio through `className`). It only loads and plays while it is near
 * the screen, pauses when it leaves, has a visible Pause button, and shows a still dark frame for visitors who asked for
 * reduced motion. The film file never autoplays off-screen, so several can sit on one page without all downloading at once.
 */
export function LoopVideo({ src, label, className = "" }: { src: string; label: string; className?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false); // chosen by the visitor
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const el = frame.current;
    const v = video.current;
    if (!el || !v || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!v.src) v.src = src;
          if (!pausedRef.current) void v.play().catch(() => {});
        } else v.pause();
      },
      { rootMargin: "200px 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      setPaused(false);
      void v.play();
    } else {
      setPaused(true);
      v.pause();
    }
  };

  return (
    <div ref={frame} className={`relative overflow-clip bg-[#1c1d1a] ${className}`}>
      <video ref={video} muted loop playsInline preload="none" aria-label={label} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} className="absolute inset-0 size-full object-cover motion-reduce:hidden" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause the film: ${label}` : `Play the film: ${label}`}
        className="absolute bottom-3 right-3 z-10 grid size-10 place-items-center border border-white/40 bg-black/35 text-white backdrop-blur transition-colors hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:hidden"
      >
        {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
