import { ClipboardList, MapPin, PackageCheck, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const PERKS = [
  { icon: PackageCheck, text: "Follow every order from payment to delivery" },
  { icon: MapPin, text: "Save delivery addresses for faster checkout" },
  { icon: ClipboardList, text: "Track the status of your wholesale enquiries" },
];

/** The shared frame for the signed-out account pages: a photographic brand panel beside a clean form card. */
export function AuthCard({ eyebrow = "Your account", title, intro, children, footer }: { eyebrow?: string; title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-[radial-gradient(1200px_500px_at_50%_-10%,#e8ebfb,transparent),linear-gradient(#f7f7fb,#ffffff)] px-4 py-10 sm:px-6 lg:py-16">
      <div aria-hidden className="absolute -left-24 top-1/3 -z-10 size-72 rounded-full bg-indigo/10 blur-3xl" />
      <div aria-hidden className="absolute -right-24 bottom-0 -z-10 size-80 rounded-full bg-indigo/10 blur-3xl" />

      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[1.75rem] bg-white shadow-[0_40px_90px_-40px_rgb(18_22_76/0.45)] ring-1 ring-ink/5 lg:min-h-[640px] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative isolate hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
          <Image src="/collections/gents.jpg" alt="" fill priority sizes="(min-width:1024px) 480px, 0px" className="-z-20 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b0f3d]/55 via-[#0b0f3d]/10 to-[#0b0f3d]/90" />

          <Link href="/" className="w-fit" aria-label="LESPARO home">
            <p className="font-display text-3xl font-bold tracking-[0.18em]">LESPARO</p>
            <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-sun">by Abija Exports</p>
          </Link>

          <div>
            <p className="font-display text-[1.85rem] font-semibold leading-[1.2]">Your orders, addresses and wholesale enquiries in one place.</p>
            <ul className="mt-8 space-y-4">
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3.5 text-[0.92rem] text-white/85">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur">
                    <Icon className="size-[18px] text-sun" aria-hidden />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <Link href="/" className="mb-6 w-fit font-display text-xl font-bold tracking-[0.18em] text-indigo-deep lg:hidden" aria-label="LESPARO home">
            LESPARO
          </Link>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-[2.25rem]">{title}</h1>
          {intro && <p className="mt-3 text-ink-soft">{intro}</p>}
          <div className="relative mt-8">{children}</div>
          {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-ink-soft">{footer}</div>}
          <p className="mt-6 flex items-center gap-2 text-xs text-muted">
            <ShieldCheck className="size-4 text-success" aria-hidden /> Your details are encrypted and never shared.
          </p>
        </div>
      </div>
    </section>
  );
}
