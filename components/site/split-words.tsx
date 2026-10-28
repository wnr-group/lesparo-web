import { Fragment } from "react";

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
        <Fragment key={i}>
          <span aria-hidden className="sw-mask">
            <span className="sw-word" style={{ ["--i" as string]: i } as React.CSSProperties}>
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </Tag>
  );
}
