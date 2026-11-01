"use client";

import clsx from "clsx";
import { Home, LayoutGrid, Menu, Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useCart } from "./cart";

const noop = () => () => {};

/**
 * Thumb-reach navigation for phones and tablets: Home, Shop, Search, Cart and Menu along the bottom edge.
 * It slides away while the page scrolls down (more room to browse) and returns on any upward scroll or near the top.
 * Search and Menu reuse the header's search panel and drawer (passed in by SiteNav). Hidden from lg up.
 */
export function MobileTabBar({ onSearch, onMenu }: { onSearch: () => void; onMenu: () => void }) {
  const pathname = usePathname();
  const { count } = useCart();
  const [hidden, setHidden] = useState(false);
  // Rendered into <body> through a portal: the header's backdrop-filter would otherwise pin "fixed" to the header box.
  // (false while server rendering, true once on the client, without a setState in an effect).
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        // A small dead zone, so tiny finger jitters don't flicker the bar.
        if (Math.abs(y - last) < 8) return;
        setHidden(y > last && y > 160);
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const item = "relative flex flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[0.66rem] font-semibold transition-colors";

  if (!mounted) return null;
  return createPortal(
    <nav aria-label="Quick links" data-hidden={hidden} className="tab-bar fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 lg:hidden">
      <ul className="mx-auto flex max-w-lg">
        <li className="flex flex-1">
          <Tab href="/" label="Home" active={active("/")} className={item}>
            <Home className="size-5" aria-hidden />
          </Tab>
        </li>
        <li className="flex flex-1">
          <Tab href="/shop" label="Shop" active={active("/shop") || active("/collections") || active("/products")} className={item}>
            <LayoutGrid className="size-5" aria-hidden />
          </Tab>
        </li>
        <li className="flex flex-1">
          <button type="button" onClick={onSearch} className={clsx(item, "text-ink-soft")}>
            <Search className="size-5" aria-hidden />
            Search
          </button>
        </li>
        <li className="flex flex-1">
          <Tab href="/cart" label="Cart" active={active("/cart") || active("/checkout")} className={item} aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
            <span className="relative">
              <ShoppingBag className="size-5" aria-hidden />
              {count > 0 && (
                <span aria-hidden className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sun px-1 font-sport text-[0.6rem] font-extrabold italic tabular-nums text-ink">
                  {count}
                </span>
              )}
            </span>
          </Tab>
        </li>
        <li className="flex flex-1">
          <button type="button" onClick={onMenu} aria-haspopup="dialog" className={clsx(item, "text-ink-soft")}>
            <Menu className="size-5" aria-hidden />
            Menu
          </button>
        </li>
      </ul>
    </nav>,
    document.body,
  );
}

function Tab({ href, label, active, className, children, ...rest }: { href: string; label: string; active: boolean; className: string; children: ReactNode; "aria-label"?: string }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={clsx(className, active ? "text-indigo" : "text-ink-soft")} {...rest}>
      {/* Active marker: a short sun bar along the top edge. */}
      <span aria-hidden className={clsx("absolute inset-x-1/3 top-0 h-0.5 rounded-full bg-sun transition-transform duration-300", active ? "scale-x-100" : "scale-x-0")} />
      {children}
      {label}
    </Link>
  );
}
