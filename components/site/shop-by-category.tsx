"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type CategoryItem = { name: string; href: string; src: string | null };
export type CategoryTab = { key: string; label: string; href: string; items: CategoryItem[] };

/** "Shop by category": a tab per audience, and under it a grid of every category with its product photo and name. */
export function ShopByCategory({ tabs }: { tabs: CategoryTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!tab) return null;
  return (
    <section aria-labelledby="shop-by-category" className="py-14 lg:py-20">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <h2 id="shop-by-category" className="text-center font-sport text-[clamp(1.8rem,1.2rem+2.2vw,3rem)] font-extrabold uppercase italic leading-none tracking-tight text-ink">
          Shop by category
        </h2>

        <div role="tablist" aria-label="Audience" className="mt-8 flex flex-wrap justify-center gap-2.5 sm:gap-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              id={`cat-tab-${t.key}`}
              aria-selected={t.key === tab.key}
              aria-controls="cat-panel"
              onClick={() => setActive(t.key)}
              className={clsx(
                "min-w-24 rounded-full border-2 px-5 py-2 text-sm font-semibold transition-colors sm:min-w-36 sm:px-8 sm:py-3 sm:text-base",
                t.key === tab.key ? "border-ink bg-ink text-white" : "border-ink/70 bg-white text-ink hover:bg-linen",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <ul id="cat-panel" role="tabpanel" aria-labelledby={`cat-tab-${tab.key}`} className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-5">
          {tab.items.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="group flex flex-col items-center text-center">
                <span className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-mist">
                  {c.src ? (
                    <Image src={c.src} alt="" fill sizes="(min-width:1024px) 14vw, (min-width:640px) 30vw, 46vw" className="object-contain p-3 transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-105" />
                  ) : (
                    <span aria-hidden className="absolute inset-0 flex items-center justify-center font-sport text-4xl font-extrabold italic text-ink/15">{c.name.slice(0, 1)}</span>
                  )}
                </span>
                <span className="mt-3 text-base font-medium text-ink transition-colors group-hover:text-indigo sm:text-lg">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Link href={tab.href} className="inline-flex rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo">
            View all {tab.label.toLowerCase()}
          </Link>
        </div>
      </div>
    </section>
  );
}
