"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { easeOut, range, useReducedMotion, usePinProgress } from "./use-pin-progress";

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
  const reduced = useReducedMotion();
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

  const active = LEGS[leg];

  const art = (
    <svg viewBox="140 60 920 500" className="h-auto max-h-full w-full" role="img" aria-label="A schematic of routes from Erode to Karnataka, Kerala and Tamil Nadu.">
      {LEGS.map((l) => (
        <path key={`g-${l.state}`} d={l.d} fill="none" stroke="#262e86" strokeOpacity="0.14" strokeWidth="2" strokeDasharray="3 8" />
      ))}
      {LEGS.map((l, i) => (
        <path
          key={l.state}
          ref={(el) => {
            if (el) paths.current[i] = el;
          }}
          d={l.d}
          pathLength={1}
          fill="none"
          stroke="#262e86"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="1 1"
          strokeDashoffset={reduced ? 0 : 1}
        />
      ))}
      {LEGS.map((l, i) => (
        <g
          key={`n-${l.state}`}
          ref={(el) => {
            if (el) nodes.current[i] = el;
          }}
          style={{ opacity: reduced ? 1 : 0 }}
        >
          <circle cx={l.to.x} cy={l.to.y} r="16" fill="#ffc82c" />
          <circle cx={l.to.x} cy={l.to.y} r="6" fill="#0c0f2e" />
          <text x={l.to.x} y={l.to.y + 48} textAnchor="middle" fontSize="24" fontWeight="700" fill="#0c0f2e">
            {l.state}
          </text>
        </g>
      ))}
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r="22" fill="#262e86" />
      <circle cx={ORIGIN.x} cy={ORIGIN.y} r="8" fill="#ffc82c" />
      <text x={ORIGIN.x} y={ORIGIN.y - 38} textAnchor="middle" fontSize="26" fontWeight="800" fill="#0c0f2e">
        Erode
      </text>
      {!reduced && (
        <g ref={marker} transform={`translate(${ORIGIN.x} ${ORIGIN.y})`}>
          <circle r="14" fill="#ffc82c" opacity="0.35" />
          <circle r="6" fill="#ffc82c" stroke="#0c0f2e" strokeWidth="2" />
        </g>
      )}
    </svg>
  );

  const copy = (
    <div className="grid gap-4 border-t border-line pt-5 md:grid-cols-[1fr_auto] md:items-end md:gap-10">
      <div>
        <p className="eyebrow">{reduced ? "Where we supply" : `Route ${leg + 1} of ${LEGS.length}`}</p>
        <div key={leg} className="mt-2" aria-live="polite">
          <h3 className="font-display text-2xl font-bold tracking-tight">{reduced ? "Tamil Nadu, Kerala and Karnataka" : active.state}</h3>
          <p className="mt-1 max-w-xl text-ink-soft">{reduced ? "Gents and kids casual wear, lungis, kavi dhothies, towels and kerchiefs, supplied to showrooms in all three states." : active.note}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/wholesale#enquire" className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-indigo">
          Wholesale enquiry <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <span className="text-xs text-muted">Schematic, not to scale.</span>
      </div>
    </div>
  );

  const head = (
    <div>
      <p className="eyebrow mb-3">Where we supply</p>
      <h2 className="max-w-[22ch] font-display text-headline font-bold">From Erode to showrooms across three states</h2>
    </div>
  );

  if (reduced) {
    return (
      <section aria-labelledby="route-title" className="bg-paper px-5 py-20 sm:px-8 lg:px-[max(2rem,6vw)] lg:py-28">
        <div id="route-title">{head}</div>
        <div className="mt-10">{art}</div>
        <div className="mt-6">{copy}</div>
      </section>
    );
  }

  return (
    <section ref={root} aria-label="Where we supply" className="relative bg-paper" style={{ height: "320svh" }}>
      <div className="sticky top-0 flex h-svh flex-col overflow-hidden px-5 pt-24 pb-8 sm:px-8 lg:px-[max(2rem,6vw)]">
        {head}
        <div className="relative flex min-h-0 flex-1 items-center">{art}</div>
        {copy}
      </div>
    </section>
  );
}
