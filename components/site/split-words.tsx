import type { ReactNode } from "react";

/**
 * Splits a heading into words that rise one after another from behind a mask once it scrolls into view
 * (the globals.css `data-reveal="words"` rules; the observer in reveal-observer.tsx flips it). Text stays as one
 * readable heading for assistive tech: the spans are presentational and the full text is the accessible label.
 */
export function SplitWords({ children, className = "", as: Tag = "span", onLoad = false }: { children: string; className?: string; as?: "span" | "h1" | "h2"; onLoad?: boolean }) {
  const words = children.split(" ").filter(Boolean);
  return (
    <Tag {...(onLoad ? { "data-onload": "" } : { "data-reveal": "words" })} aria-label={children} className={className}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="sw-mask">
          <span className="sw-word" style={{ ["--i" as string]: i } as React.CSSProperties}>
            {w}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}

/** Large solid words that slide sideways as the page scrolls; adjacent rows travel in opposite directions. */
export function ScrollMarquee({ rows }: { rows: string[] }): ReactNode {
  return (
    <section aria-hidden className="overflow-clip py-6 lg:py-10">
      {rows.map((text, i) => (
        <p key={text} className={`marquee-row ${i % 2 ? "marquee-rev" : ""} whitespace-nowrap font-display text-[clamp(3.5rem,2rem+9vw,10rem)] font-extrabold uppercase leading-[0.95] tracking-tight ${i % 2 ? "text-[#d9d2c1]" : "text-ink"}`}>
          {text}
        </p>
      ))}
    </section>
  );
}
