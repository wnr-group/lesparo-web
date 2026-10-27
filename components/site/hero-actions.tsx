"use client";

import { ArrowRight, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/button";

type Cta = { label: string; href: string };

/**
 * The hero's actions, after Dribbble's tab pill: one switch, Buy online or Wholesale, that swaps the line
 * of copy and the main button, so a shopper and a showroom buyer each see their own route and the other is
 * one tap away. Retail uses the admin's primary action; wholesale goes straight to the enquiry form.
 */
export function HeroActions({ primary, secondary }: { primary: Cta; secondary: Cta }) {
  const [mode, setMode] = useState<"retail" | "wholesale">("retail");
  const retail = mode === "retail";
  const cta = retail ? primary : { label: "Enquire now", href: "/wholesale#enquire" };
  const tabs = [
    ["retail", "Buy online", ShoppingBag],
    ["wholesale", "Wholesale", Store],
  ] as const;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 animate-rise [animation-delay:0.7s]">
      <div role="group" aria-label="How do you want to buy?" className="inline-flex rounded-full bg-[#f5f5f7] p-1 ring-1 ring-black/5">
        {tabs.map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            aria-pressed={mode === k}
            onClick={() => setMode(k)}
            className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all duration-300 ${mode === k ? "bg-white text-indigo shadow-[0_1px_6px_rgb(0_0_0/0.12)]" : "text-[#6e6e73] hover:text-[#1d1d1f]"}`}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>
      <ButtonLink key={mode} href={cta.href} size="lg" className="hero-pop">
          {cta.label}
        </ButtonLink>
      <Link href={secondary.href} className="group inline-flex items-center gap-1.5 text-[1.05rem] font-medium text-indigo hover:underline">
        {secondary.label}
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
      </Link>
      <p aria-live="polite" className="sr-only">
        {retail ? "See the price, choose your size, then Add to cart or Buy now." : "Showrooms and wholesalers: tell us what you need and we will send a quotation."}
      </p>
    </div>
  );
}
