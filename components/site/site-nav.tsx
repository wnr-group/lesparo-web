"use client";

import clsx from "clsx";
import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CartLink } from "./cart";
import { EnquiryListLink } from "./enquiry-list";
import { MobileTabBar } from "./mobile-tab-bar";
import { MegaPanel } from "./nav/mega-panel";
import { MobileDrawer } from "./nav/mobile-drawer";
import type { NavItem } from "./nav/types";

export type { NavItem } from "./nav/types";

type Props = { items: NavItem[]; logo: ReactNode };

function isActive(pathname: string, href: string) {
  const path = href.split("?")[0];
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/");
}

const itemClass = "relative inline-flex h-full items-center px-2.5 text-[0.76rem] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:text-indigo xl:px-3.5 aria-[current=page]:text-indigo";

function SearchBar({ onClose, inline = false }: { onClose?: () => void; inline?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  // The popover and drawer search take focus when they open; the always-visible header field waits to be clicked.
  useEffect(() => {
    if (!inline) inputRef.current?.focus();
  }, [inline]);
  if (inline)
    return (
      <form
        role="search"
        action="/shop"
        onSubmit={(e) => {
          e.preventDefault();
          const q = inputRef.current?.value.trim() ?? "";
          router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
          inputRef.current?.blur();
        }}
        className="relative mr-1 hidden 2xl:block"
      >
        <label htmlFor={id} className="sr-only">
          Search products
        </label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          ref={inputRef}
          id={id}
          name="q"
          type="search"
          placeholder="Search shorts, tracks, T-shirts…"
          className="h-10 w-52 rounded-full border border-transparent bg-paper pl-10 pr-4 text-[0.85rem] transition-[width,background-color,border-color,box-shadow] duration-300 ease-[var(--ease-out-soft)] placeholder:text-muted hover:border-sand focus:w-64 focus:border-indigo focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo/15"
        />
      </form>
    );
  return (
    <form
      role="search"
      action="/shop"
      onSubmit={(e) => {
        e.preventDefault();
        const q = inputRef.current?.value.trim() ?? "";
        router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
        onClose?.();
      }}
      className="flex items-center gap-2"
    >
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <input
        ref={inputRef}
        id="site-search"
        name="q"
        type="search"
        placeholder="Search shorts, tracks, T-shirts…"
        className="field h-10 rounded-full px-4 py-0"
        onKeyDown={(e) => e.key === "Escape" && onClose?.()}
      />
      <button type="submit" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-white" aria-label="Search">
        <Search className="size-4" aria-hidden />
      </button>
    </form>
  );
}

export function SiteNav({ items, logo }: Props) {
  const pathname = usePathname();
  // Everything that opens remembers the page it was opened on, so any navigation closes it.
  const [drawerOn, setDrawerOn] = useState<string | null>(null);
  const [searchOn, setSearchOn] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ key: string; on: string } | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const drawer = drawerOn === pathname;
  const search = searchOn === pathname;
  const openKey = menu?.on === pathname ? menu.key : null;
  const setDrawer = (v: boolean) => setDrawerOn(v ? pathname : null);
  const setSearch = (v: boolean | ((s: boolean) => boolean)) => setSearchOn((typeof v === "function" ? v(search) : v) ? pathname : null);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const withPanel = items.filter((i) => i.panel);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const show = (key: string, delay = 0) => {
    clear();
    const go = () => {
      setMenu({ key, on: pathname });
      setShown(key);
    };
    if (delay) timer.current = setTimeout(go, delay);
    else go();
  };
  // A short grace period when leaving, so the pointer can cross between a trigger and its panel without it flickering shut.
  const hide = (delay = 140) => {
    clear();
    timer.current = setTimeout(() => setMenu(null), delay);
  };

  useEffect(() => {
    const d = drawerRef.current;
    if (!d) return;
    if (drawer && !d.open) d.showModal();
    if (!drawer && d.open) d.close();
  }, [drawer]);

  // The row condenses once the page is scrolled (styles key off html[data-scrolled]); an open panel closes.
  useEffect(() => {
    const root = document.documentElement;
    const onScroll = () => {
      if (window.scrollY > 24) root.setAttribute("data-scrolled", "");
      else root.removeAttribute("data-scrolled");
      setMenu(null);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      root.removeAttribute("data-scrolled");
      clear();
    };
  }, []);

  useEffect(() => {
    if (!openKey) return;
    const onDown = (e: PointerEvent) => !wrapRef.current?.contains(e.target as Node) && setMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(null);
      wrapRef.current?.querySelector<HTMLElement>(`[data-nav="${openKey}"]`)?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openKey]);

  const shownItem = withPanel.find((i) => i.key === shown);

  return (
    <>
      <div ref={wrapRef} className="relative" onMouseLeave={() => hide()} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setMenu(null)}>
        {/* One slim row: brand | destinations | tools. */}
        <div className="mx-auto grid h-16 max-w-page grid-cols-[1fr_auto] items-center gap-6 px-4 transition-[height] duration-300 ease-[var(--ease-out-soft)] sm:px-6 lg:h-[4.25rem] lg:grid-cols-[auto_1fr_auto] lg:px-10 2xl:px-14 [html[data-scrolled]_&]:lg:h-14">
          {logo}

          <nav aria-label="Main" className="hidden h-full justify-self-center lg:block">
            <ul className="flex h-full items-center">
              {items.map((item) => {
                const active = isActive(pathname, item.href) || !!item.panel?.columns.some((c) => c.links.some((l) => isActive(pathname, l.href) && l.href !== "/shop"));
                return (
                  <li key={item.key} className="flex h-full items-center" onMouseEnter={() => (item.panel ? show(item.key, openKey ? 0 : 70) : hide(0))}>
                    {item.panel ? (
                      <button
                        type="button"
                        data-nav={item.key}
                        aria-expanded={openKey === item.key}
                        aria-controls="nav-panel"
                        aria-current={active ? "page" : undefined}
                        onClick={() => (openKey === item.key ? setMenu(null) : show(item.key))}
                        className={clsx(itemClass, "nav-link")}
                      >
                        {item.label}
                      </button>
                    ) : (
                      <Link href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined} className={clsx(itemClass, "nav-link", item.key === "wholesale" && "text-indigo")}>
                        {item.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center justify-self-end gap-0.5 sm:gap-1">
            <SearchBar inline />
            <button
              type="button"
              onClick={() => setSearch((s) => !s)}
              aria-expanded={search}
              aria-controls="header-search"
              className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-linen 2xl:hidden"
              aria-label="Search products"
            >
              {search ? <X className="size-5" strokeWidth={1.6} aria-hidden /> : <Search className="size-5" strokeWidth={1.6} aria-hidden />}
            </button>
            <CartLink className="flex h-10 items-center gap-1.5 rounded-full px-2.5 transition-colors hover:bg-linen" />
            <EnquiryListLink className="ml-1 hidden h-9 items-center gap-2 bg-ink px-4 text-[0.78rem] font-semibold text-white transition-colors hover:bg-indigo sm:inline-flex" />
            <button type="button" onClick={() => setDrawer(true)} className="flex size-10 items-center justify-center rounded-full hover:bg-linen lg:hidden" aria-label="Open menu" aria-haspopup="dialog">
              <Menu className="size-5" strokeWidth={1.6} aria-hidden />
            </button>
          </div>
        </div>

        {/* The shared panel and a light scrim behind it; hovering or clicking the scrim closes the menu. */}
        <div aria-hidden onMouseEnter={() => hide(0)} onClick={() => setMenu(null)} className={clsx("absolute inset-x-0 top-full z-30 hidden h-screen bg-ink/15 transition-opacity duration-300 lg:block", openKey ? "opacity-100" : "pointer-events-none opacity-0")} />
        <div
          id="nav-panel"
          role="region"
          aria-label={shownItem ? `${shownItem.label} menu` : "Menu"}
          onMouseEnter={clear}
          className={clsx(
            "absolute inset-x-0 top-full z-40 hidden border-t border-ink/10 bg-[#faf8f4] transition-[opacity,transform] duration-300 ease-[var(--ease-out-soft)] lg:block",
            openKey ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
          )}
        >
          {withPanel.map((item) => (
            <div key={item.key} hidden={shown !== item.key} className={shown === item.key ? "animate-[rise_0.35s_var(--ease-out-soft)]" : undefined}>
              <MegaPanel panel={item.panel!} active={openKey === item.key} pathname={pathname} onNavigate={() => setMenu(null)} />
            </div>
          ))}
        </div>
      </div>

      {search && (
        <div id="header-search" className="absolute inset-x-0 top-full border-b border-line bg-[#faf8f4] py-5">
          <div className="mx-auto max-w-2xl px-4">
            <SearchBar onClose={() => setSearch(false)} />
          </div>
        </div>
      )}

      <MobileTabBar onSearch={() => setSearch(true)} onMenu={() => setDrawer(true)} />
      <MobileDrawer items={items} dialogRef={drawerRef} onClose={() => setDrawer(false)} logo={logo} search={<SearchBar onClose={() => setDrawer(false)} />} />
    </>
  );
}
