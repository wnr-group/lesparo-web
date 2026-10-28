"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { easeOut, range, useReducedMotion, usePinProgress } from "./use-pin-progress";

const WIDE = "(min-width: 1024px)";
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

const ORIGIN = { x: 560, y: 330 };
const LEGS = [
  { state: "Karnataka", to: { x: 250, y: 120 }, d: "M560 330 C 480 250, 380 190, 250 120", note: "Supplied to showrooms across Karnataka." },
  { state: "Kerala", to: { x: 230, y: 500 }, d: "M560 330 C 470 420, 360 470, 230 500", note: "Supplied to showrooms across Kerala." },
  { state: "Tamil Nadu", to: { x: 990, y: 380 }, d: "M560 330 C 680 300, 840 330, 990 380", note: "Supplied to showrooms across Tamil Nadu, from our home town." },
];

/**
 * Erode out to the three states LESPARO supplies. The section pins and each route inks itself in turn as you scroll,
 * with a marker riding the one being drawn. It is a schematic, not a map, and says so.
 */
export function ErodeRoute() {
  // The pinned, scroll-drawn version needs room: phones and tablets get the finished map, as with reduced motion.
  const noMotion = useReducedMotion();
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);
  const reduced = noMotion || !wide;
  const root = useRef<HTMLElement>(null);
  const paths = useRef<SVGPathElement[]>([]);
  const marker = useRef<SVGGElement>(null);
  const nodes = useRef<SVGGElement[]>([]);
  const [leg, setLeg] = useState(reduced ? LEGS.length - 1 : 0);
  const current = useRef(0);

  const onProgress = useCallback((p: number) => {
    const u = range(p, 0.08, 0.92) * LEGS.length;
    const s = Math.min(LEGS.length - 1, Math.floor(u));
    if (s !== current.current) {
      current.current = s;
      setLeg(s);
    }
    paths.current.forEach((path, i) => {
      const k = easeOut(Math.min(1, Math.max(0, u - i)));
      path.style.strokeDashoffset = String(1 - k);
      if (nodes.current[i]) nodes.current[i].style.opacity = String(range(k, 0.85, 1));
      if (i === s && marker.current) {
        const pt = path.getPointAtLength(path.getTotalLength() * k);
        marker.current.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
      }
    });
  }, []);
  usePinProgress(root, onProgress, !reduced);

  const art = (
    <svg viewBox="140 60 920 500" className="h-auto max-h-full w-full" role="img" aria-label="A schematic of routes from Erode to Karnataka, Kerala and Tamil Nadu.">
      <defs>
        <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {LEGS.map((l) => (
        <path key={`g-${l.state}`} d={l.d} fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" />
      ))}
      {LEGS.map((l, i) => (
        <g key={l.state}>
          <path
            d={l.d}
            ref={(el) => {
              if (el) paths.current[i] = el;
            }}
            pathLength={1}
            fill="none"
            stroke="#fff"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="1 1"
            strokeDashoffset={reduced ? 0 : 1}
          />
        </g>
      ))}
      {LEGS.map((l, i) => (
        <g
          key={`n-${l.state}`}
          ref={(el) => {
            if (el) nodes.current[i] = el;
          }}
          style={{ opacity: reduced ? 1 : 0 }}
        >
          <circle cx={l.to.x} cy={l.to.y} r="26" fill="#fff" opacity="0.12" />
          <circle cx={l.to.x} cy={l.to.y} r="12" fill="#efe8da" />
          <circle cx={l.to.x} cy={l.to.y} r="4.5" fill="#22231f" />
          <text x={l.to.x} y={l.to.y + 50} textAnchor="middle" fontSize="24" fontWeight="700" fill="#fff">
            {l.state}
          </text>
        </g>
      ))}
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r="40" fill="#fff" opacity="0.1" />
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r="20" fill="#fff" />
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r="7" fill="#22231f" />
      <text x={ORIGIN.x} y={ORIGIN.y - 44} textAnchor="middle" fontSize="28" fontWeight="800" fill="#fff" letterSpacing="2">
        ERODE
      </text>
      {!reduced && (
        <g ref={marker} transform={`translate(${ORIGIN.x} ${ORIGIN.y})`}>
          <circle r="16" fill="#fff" opacity="0.5" filter="url(#route-glow)" />
          <circle r="6.5" fill="#fff" stroke="#22231f" strokeWidth="2" />
        </g>
      )}
    </svg>
  );

  return (
    <section ref={reduced ? undefined : root} aria-labelledby="route-title" className="relative bg-[#efe8da]" style={reduced ? undefined : { height: "240svh" }}>
      <div className={`flex flex-col justify-center gap-8 px-4 py-16 sm:px-6 lg:grid lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14 lg:px-10 ${reduced ? "" : "sticky top-[var(--hdr)] h-[calc(100svh-var(--hdr))] overflow-clip lg:py-0"} mx-auto max-w-page`}>
        <div>
          <p className="eyebrow mb-4">Where we supply</p>
          <h2 id="route-title" className="font-display text-[clamp(2rem,1.2rem+3.2vw,4rem)] font-extrabold uppercase leading-[0.98] tracking-tight">
            From Erode to showrooms across three states
          </h2>
          <ol className="mt-8 divide-y divide-ink/15 border-y border-ink/15">
            {LEGS.map((l, i) => {
              const on = reduced || i === leg;
              return (
                <li key={l.state} className={`flex items-baseline gap-4 py-3.5 transition-opacity duration-500 ${on ? "opacity-100" : "opacity-35"}`}>
                  <span className="w-7 font-display text-sm font-bold tabular-nums text-ink/60">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="block font-display text-xl font-extrabold uppercase tracking-tight sm:text-2xl">{l.state}</span>
                    <span className={`block overflow-hidden text-sm text-ink-soft transition-[max-height,opacity] duration-500 ${on ? "max-h-12 opacity-100" : "max-h-0 opacity-0"}`}>{l.note}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link href="/wholesale#enquire" className="group/btn inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-indigo-deep">
              Wholesale enquiry <ArrowRight className="size-4 transition-transform duration-300 group-hover/btn:translate-x-1" aria-hidden />
            </Link>
            <span className="text-xs text-muted">Schematic, not to scale.</span>
          </div>
        </div>
        <div className="relative isolate flex min-h-0 items-center justify-center overflow-clip rounded-[1.6rem] bg-[#22231f] p-4 sm:p-8 lg:h-[min(36rem,100%)]" style={{ backgroundImage: "radial-gradient(rgb(255 255 255 / 0.09) 1px, transparent 1.5px)", backgroundSize: "26px 26px" }}>
          {art}
        </div>
      </div>
    </section>
  );
}
