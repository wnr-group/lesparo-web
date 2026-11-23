"use client";

import clsx from "clsx";
import { LayoutDashboard, LogOut, MapPin, Package, Inbox, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(site)/account/actions";

const LINKS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/enquiries", label: "Enquiries", icon: Inbox },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile & security", icon: UserRound },
];

export function PortalNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="lg:sticky lg:top-28 lg:self-start">
      <div className="hidden border-b border-line pb-5 lg:block">
        <p className="truncate font-display text-xl font-bold">{name}</p>
        <p className="truncate text-sm text-muted">{email}</p>
      </div>
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:mt-4 lg:flex-col lg:overflow-visible lg:px-0">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx("flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors lg:rounded-xs", active ? "bg-indigo text-white" : "text-ink-soft hover:bg-linen hover:text-ink")}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0 lg:mt-3 lg:border-t lg:border-line lg:pt-3">
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-linen hover:text-ink lg:rounded-xs">
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
