"use client";

import clsx from "clsx";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CartLink } from "./cart";
import { EnquiryListLink } from "./enquiry-list";

export type NavGroup = { label: string; href: string; columns: { label: string; href: string; links: { label: string; href: string }[] }[] };

type Props = { groups: NavGroup[] };

const STATIC_LINKS = [
  { label: "About", href: "/about" },
  { label: "Wholesale", href: "/wholesale" },
  { label: "Contact", href: "/contact" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function DesktopMenu({ group, pathname }: { group: NavGroup; pathname: string }) {
  // Open state is tied to the page it was opened on, so navigating closes the menu.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (next: boolean | ((o: boolean) => boolean)) => setOpenOn((typeof next === "function" ? next(open) : next) ? pathname : null);
  const id = useId();
  const ref = useRef<HTMLLIElement>(null);
  const active = isActive(pathname, group.href) || group.columns.some((c) => c.links.some((l) => isActive(pathname, l.href)) || isActive(pathname, c.href));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpenOn(null);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <li
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          ref.current?.querySelector("button")?.focus();
        }
      }}
      onBlur={(e) => !ref.current?.contains(e.relatedTarget as Node) && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={clsx("nav-link flex items-center gap-1 rounded-full px-3.5 py-2 text-[0.82rem] font-bold uppercase tracking-[0.06em] transition-colors hover:text-indigo", (active || open) && "text-indigo")}
        aria-current={active ? "page" : undefined}
      >
        {group.label}
        <ChevronDown className={clsx("size-3.5 transition-transform duration-300", open && "rotate-180")} aria-hidden />
      </button>
      <div
        id={id}
        className={clsx(
          "absolute left-1/2 top-full z-40 -translate-x-1/2 pt-3 transition-[opacity,transform] duration-300 ease-[var(--ease-atelier)]",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <div className="flex gap-10 rounded-3xl border border-line bg-white px-8 py-7 shadow-[0_30px_60px_-24px_rgb(18_22_76/0.3)]">
          {group.columns.map((col) => (
            <div key={col.href} className="min-w-40">
              <Link href={col.href} className="link-draw font-display font-semibold text-xl">
                {col.label}
              </Link>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="link-draw text-sm text-ink-soft hover:text-ink" aria-current={isActive(pathname, l.href) ? "page" : undefined}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex min-w-36 flex-col justify-end border-l border-line pl-8">
            <Link href={group.href} className="link-draw text-sm font-medium">
              View all {group.label.toLowerCase()} →
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

function SearchBar({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
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
        placeholder="Search shorts, lungi, towel…"
        className="field h-10 rounded-full px-4 py-0"
        onKeyDown={(e) => e.key === "Escape" && onClose?.()}
      />
      <button type="submit" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-white" aria-label="Search">
        <Search className="size-4" aria-hidden />
      </button>
    </form>
  );
}

export function SiteNav({ groups }: Props) {
  const pathname = usePathname();
  // Both panels remember the page they were opened on, so any navigation closes them.
  const [drawerOn, setDrawerOn] = useState<string | null>(null);
  const [searchOn, setSearchOn] = useState<string | null>(null);
  const drawer = drawerOn === pathname;
  const search = searchOn === pathname;
  const setDrawer = (v: boolean) => setDrawerOn(v ? pathname : null);
  const setSearch = (v: boolean | ((s: boolean) => boolean)) => setSearchOn((typeof v === "function" ? v(search) : v) ? pathname : null);
  const drawerRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = drawerRef.current;
    if (!d) return;
    if (drawer && !d.open) d.showModal();
    if (!drawer && d.open) d.close();
  }, [drawer]);

  return (
    <>
      <nav aria-label="Main" className="hidden lg:block">
        <ul className="flex items-center gap-1">
          <li>
            <Link
              href="/shop"
              className="nav-link rounded-full px-3.5 py-2 text-[0.82rem] font-bold uppercase tracking-[0.06em] transition-colors hover:text-indigo aria-[current=page]:text-indigo"
              aria-current={isActive(pathname, "/shop") ? "page" : undefined}
            >
              Shop
            </Link>
          </li>
          {groups.map((g) => (
            <DesktopMenu key={g.href} group={g} pathname={pathname} />
          ))}
          {STATIC_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="nav-link rounded-full px-3.5 py-2 text-[0.82rem] font-bold uppercase tracking-[0.06em] transition-colors hover:text-indigo aria-[current=page]:text-indigo"
                aria-current={isActive(pathname, l.href) ? "page" : undefined}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-1 sm:gap-3">
        <button
          type="button"
          onClick={() => setSearch((s) => !s)}
          aria-expanded={search}
          aria-controls="header-search"
          className="flex size-10 items-center justify-center rounded-full hover:bg-linen"
          aria-label="Search products"
        >
          {search ? <X className="size-[18px]" aria-hidden /> : <Search className="size-[18px]" aria-hidden />}
        </button>
        <CartLink className="flex h-10 items-center gap-1.5 rounded-full px-3 hover:bg-linen" />
        <EnquiryListLink className="hidden h-10 items-center gap-2 rounded-full bg-indigo px-4 text-[0.85rem] font-semibold text-white transition-colors hover:bg-indigo-deep sm:inline-flex" />
        <button type="button" onClick={() => setDrawer(true)} className="flex size-10 items-center justify-center rounded-full hover:bg-linen lg:hidden" aria-label="Open menu" aria-haspopup="dialog">
          <Menu className="size-5" aria-hidden />
        </button>
      </div>

      {search && (
        <div id="header-search" className="absolute inset-x-0 top-full border-b border-line bg-paper py-4 shadow-sm">
          <div className="mx-auto max-w-2xl px-4">
            <SearchBar onClose={() => setSearch(false)} />
          </div>
        </div>
      )}

      <dialog
        ref={drawerRef}
        onClose={() => setDrawer(false)}
        onClick={(e) => e.target === drawerRef.current && setDrawer(false)}
        aria-label="Menu"
        className="m-0 ml-auto h-dvh max-h-none w-[min(26rem,100%)] max-w-none rounded-l-3xl bg-white p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-sm open:animate-[rise_0.4s_var(--ease-out-soft)]"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <span className="eyebrow">Menu</span>
            <button type="button" onClick={() => setDrawer(false)} className="flex size-10 items-center justify-center rounded-full hover:bg-linen" aria-label="Close menu">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <SearchBar onClose={() => setDrawer(false)} />
            <ul className="mt-8 space-y-1 font-display font-semibold text-[1.7rem] leading-tight">
              <li>
                <Link href="/shop" className="block py-1.5">
                  Shop all
                </Link>
              </li>
              {groups.map((g) => (
                <li key={g.href}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between py-1.5">
                      {g.label}
                      <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="space-y-4 pb-4 pl-1 pt-2 font-sans text-base">
                      {g.columns.map((c) => (
                        <div key={c.href}>
                          <Link href={c.href} className="font-medium">
                            {c.label}
                          </Link>
                          <ul className="mt-1.5 space-y-1.5 border-l border-line pl-3 text-ink-soft">
                            {c.links.map((l) => (
                              <li key={l.href}>
                                <Link href={l.href}>{l.label}</Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                </li>
              ))}
              {STATIC_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block py-1.5">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-line px-5 py-5">
            <EnquiryListLink className="flex h-12 items-center justify-center gap-2 rounded-full bg-indigo text-[0.9rem] font-semibold text-white" />
          </div>
        </div>
      </dialog>
    </>
  );
}
