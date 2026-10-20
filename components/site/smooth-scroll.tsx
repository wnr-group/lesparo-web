"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Weighted, eased wheel scrolling for the public site (Lenis). The page still scrolls
 * natively underneath, so scroll-driven CSS, IntersectionObserver reveals, keyboard and
 * touch scrolling all behave normally. Off for reduced motion; dialogs and anything marked
 * data-lenis-prevent keep their own scrolling.
 */
export function SmoothScroll() {
  const lenis = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const instance = new Lenis({
      autoRaf: true,
      lerp: 0.09,
      anchors: { offset: -80 },
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
      prevent: (node) => !!node.closest("dialog, [data-lenis-prevent]"),
    });
    lenis.current = instance;
    return () => {
      instance.destroy();
      lenis.current = null;
    };
  }, []);

  // Route changes land at the top immediately rather than easing from the old position.
  // Skipped on first load (keeps the browser's scroll restore) and for #hash links.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (!window.location.hash) lenis.current?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}
