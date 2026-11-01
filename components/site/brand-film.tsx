"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./film.css";

/**
 * The LESPARO film: plays silently on a loop, with a visible pause button. `open` adds the scroll-linked opening, used once, straight after the hero.
 * Nothing downloads until the film nears the screen; it plays while in view and pauses when scrolled away, so a page with
 * two films never streams both at once. A viewer's own pause sticks, and with reduced motion it waits for the play button.
 */
export function BrandFilm({ src, title, open = false }: { src: string; title: string; open?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = video.current;
    if (!v || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) void v.play().catch(() => {});
        else if (!entry.isIntersecting && !v.paused) v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    userPaused.current = !v.paused;
    if (v.paused) void v.play();
    else v.pause();
  };

  return (
    <section aria-label={title} className="bg-white">
      {/* Full width at a capped height: the 16:9 footage is cropped top and bottom, keeping the upper part of the frame (head and torso). */}
      <div className={`relative bg-night ${open ? "film-open" : ""}`}>
        <video
          ref={video}
          src={src}
          aria-label={title}
          muted
          loop
          playsInline
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="mx-auto block aspect-video max-h-[min(72vh,48rem)] w-full object-cover object-[50%_28%]"
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause the film" : "Play the film"}
          className="absolute bottom-4 right-4 grid size-11 place-items-center rounded-full border border-white/50 bg-indigo-deep/80 text-white backdrop-blur transition-colors hover:bg-white hover:text-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun sm:bottom-6 sm:right-6"
        >
          {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </button>
      </div>
    </section>
  );
}
