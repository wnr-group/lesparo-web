"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";
import "./film.css";

/** The LESPARO film: plays silently on a loop, with a visible pause button. `open` adds the scroll-linked opening, used once, straight after the hero. */
export function BrandFilm({ src, title, open = false }: { src: string; title: string; open?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  return (
    <section aria-label={title} className="bg-white">
      {/* The footage is 16:9 and the whole person has to stay in frame, so a short section is letterboxed (never cropped): on wide screens the dark side bars frame it like a cinema screen. */}
      <div className={`relative bg-[#22231f] ${open ? "film-open" : ""}`}>
        <video
          ref={video}
          src={src}
          aria-label={title}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="mx-auto block aspect-video max-h-[min(60vh,42rem)] w-full object-contain"
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause the film" : "Play the film"}
          className="absolute bottom-4 right-4 grid size-11 place-items-center border border-white/50 bg-[#0e1b4f]/80 text-white backdrop-blur transition-colors hover:bg-white hover:text-[#0e1b4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc82c] sm:bottom-6 sm:right-6"
        >
          {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </button>
      </div>
    </section>
  );
}
