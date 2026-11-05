"use client";

import clsx from "clsx";
import { ArrowRight, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode, type RefObject } from "react";
import { EnquiryListLink } from "../enquiry-list";
import type { NavItem } from "./types";

/**
 * Full-height mobile navigation. Sections with a menu (Shop, Men, Women, Kids, Collections) expand in place, one at a time,
 * with the same links as the desktop mega menu; the rest are plain links. No desktop panel is squeezed into the screen.
 */
export function MobileDrawer({ items, dialogRef, onClose, logo, search }: { items: NavItem[]; dialogRef: RefObject<HTMLDialogElement | null>; onClose: () => void; logo: ReactNode; search: ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  const withMenu = items.filter((i) => i.panel);
  const plain = items.filter((i) => !i.panel);
  return (
    <dialog ref={dialogRef} onClose={onClose} aria-label="Menu" className="m-0 h-dvh max-h-none w-full max-w-none bg-[#faf8f4] p-0 text-ink backdrop:bg-ink/40 open:animate-[rise_0.35s_var(--ease-out-soft)]">
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          {logo}
          <button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-full hover:bg-linen" aria-label="Close menu">
            <X className="size-5" strokeWidth={1.6} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-5">
          {search}
          <ul className="mt-6 border-t border-ink/15">
            {withMenu.map((item) => {
              const expanded = open === item.key;
              const id = `m-${item.key}`;
              return (
                <li key={item.key} className="border-b border-ink/15">
                  <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setOpen(expanded ? null : item.key)} className="flex w-full items-center justify-between py-4 text-left font-display text-[1.6rem] font-bold uppercase tracking-tight">
                    {item.label}
                    <ChevronDown className={clsx("size-5 transition-transform duration-300", expanded && "rotate-180")} aria-hidden />
                  </button>
                  {/* Grid-rows trick: animates to the content's own height. */}
                  <div id={id} className={clsx("grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out-soft)]", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")} inert={!expanded || undefined}>
                    <div className="overflow-hidden">
                      <div className="space-y-6 pb-6">
                        {item.panel!.columns.map((col) => (
                          <div key={col.title}>
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted">{col.title}</p>
                            <ul className="mt-2">
                              {col.links.map((l) => (
                                <li key={l.href + l.label}>
                                  <Link href={l.href} onClick={onClose} className="block py-2.5 text-[1.05rem]">
                                    {l.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        <Link href={item.panel!.cta.href} onClick={onClose} className="inline-flex items-center gap-2 border-b border-ink pb-1 text-[0.78rem] font-semibold uppercase tracking-[0.1em]">
                          {item.panel!.cta.label} <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
            {plain.map((item) => (
              <li key={item.key} className="border-b border-ink/15">
                <Link href={item.href} onClick={onClose} className={clsx("flex items-center justify-between py-4 font-display text-[1.6rem] font-bold uppercase tracking-tight", item.key === "wholesale" && "text-indigo")}>
                  {item.label}
                  <ArrowRight className="size-5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 border-t border-line bg-white px-4 py-4">
          <EnquiryListLink className="flex h-12 items-center justify-center gap-2 bg-ink text-[0.88rem] font-semibold text-white" />
        </div>
      </div>
    </dialog>
  );
}
