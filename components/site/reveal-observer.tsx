"use client";

import { useEffect } from "react";

const PENDING = "[data-reveal]:not([data-revealed])";

/**
 * Drives the [data-reveal] scroll reveals in globals.css. Mounted once in the site layout:
 * marks each element revealed the first time it enters the viewport (never replays), and
 * picks up elements added later by client navigation. Until this runs nothing is hidden,
 * so content stays visible without JavaScript; elements already on screen at start-up are
 * shown immediately instead of blinking out and back in.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const reveal = (el: Element) => ((el as HTMLElement).dataset.revealed = "");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          reveal(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    const track = (el: Element, initial: boolean) => {
      if (initial) {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) return reveal(el);
      }
      io.observe(el);
    };

    document.querySelectorAll(PENDING).forEach((el) => track(el, true));
    root.dataset.revealOn = "";

    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        rec.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches(PENDING)) track(n, false);
          n.querySelectorAll(PENDING).forEach((el) => track(el, false));
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      delete root.dataset.revealOn;
    };
  }, []);

  return null;
}
