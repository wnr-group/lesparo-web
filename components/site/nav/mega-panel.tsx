import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { NavPanel } from "./types";

/** A different soft background fills in behind each category link on hover. Full class names so Tailwind keeps them. */
const LINK_TINTS = ["hover:bg-sun-200", "hover:bg-indigo-200", "hover:bg-[#cdeadb]", "hover:bg-[#ffd8c7]", "hover:bg-[#cfe6f6]", "hover:bg-[#e6d5f4]"];

const COLS = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" } as const;

/**
 * The panel under the header row: warm off-white, flush with the header (not a floating card). Heading and blurb on the left,
 * link columns in the middle, photographs on the right. Every panel is the same fixed height, so switching between Shop, Men,
 * Women, Kids and Collections never makes the menu jump; the photographs fill whatever height is left and are cropped by their `shape`.
 */
export function MegaPanel({ panel, active, pathname, onNavigate }: { panel: NavPanel; active: boolean; pathname: string; onNavigate: () => void }) {
  const tabIndex = active ? 0 : -1;
  // One portrait photograph is cut to a portrait shape (not stretched wide), so the garment is never cropped at the head.
  const single = panel.shape === "portrait" && panel.tiles.length === 1;
  const cols = COLS[Math.min(panel.columns.length, 3) as 1 | 2 | 3];
  return (
    <div className="mx-auto grid h-[22.5rem] max-w-page grid-cols-12 gap-x-10 px-14 py-10 2xl:px-20">
      <div className="col-span-3">
        <p className="font-display text-[2.2rem] font-bold uppercase leading-none tracking-tight text-ink">{panel.heading}</p>
        <p className="mt-4 max-w-[16rem] text-[0.92rem] leading-relaxed text-ink-soft">{panel.blurb}</p>
        <Link href={panel.cta.href} onClick={onNavigate} tabIndex={tabIndex} className="group/cta mt-7 inline-flex items-center gap-2 border-b border-ink pb-1 text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink">
          {panel.cta.label}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden />
        </Link>
      </div>

      <div className={clsx("grid content-start gap-x-8", panel.tiles.length ? "col-span-5" : "col-span-9", cols)}>
        {panel.columns.map((col) => (
          <div key={col.title}>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted">{col.title}</p>
            <ul className="mt-4">
              {col.links.map((l, i) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    onClick={onNavigate}
                    tabIndex={tabIndex}
                    aria-current={pathname === l.href.split("?")[0] ? "page" : undefined}
                    className={clsx("-mx-3 block rounded-lg px-3 py-2 text-[1rem] text-ink transition-[color,background-color] duration-300 hover:text-indigo focus-visible:bg-linen aria-[current=page]:font-semibold", LINK_TINTS[i % LINK_TINTS.length])}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {panel.tiles.length > 0 && (
        <div className={clsx("col-span-4 grid h-full min-h-0 grid-rows-[minmax(0,1fr)] gap-4", panel.tiles.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {panel.tiles.map((t) => (
            <Link key={t.href + t.label} href={t.href} onClick={onNavigate} tabIndex={tabIndex} className={clsx("group/tile flex h-full min-h-0 flex-col", single && "w-[46%] justify-self-end")}>
              <span className="relative block min-h-0 flex-1 overflow-hidden bg-[#ece8df]">
                {active && <Image src={t.image} alt="" fill sizes="(min-width:1024px) 16vw, 40vw" className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-soft)] group-hover/tile:scale-[1.04]" style={{ objectPosition: t.pos ?? "50% 25%" }} />}
              </span>
              <span className="mt-2.5 flex shrink-0 items-center justify-between text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-ink">
                {t.label}
                <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-[opacity,transform] duration-300 group-hover/tile:translate-x-0 group-hover/tile:opacity-100" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
