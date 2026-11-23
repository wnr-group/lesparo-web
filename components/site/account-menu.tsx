import { ClipboardList, LogOut, MapPin, PackageCheck, UserCog, UserRound } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/(site)/account/actions";
import { getCustomer } from "@/lib/auth/customer";

const LINKS = [
  { href: "/account/orders", label: "Your orders", icon: PackageCheck },
  { href: "/account/addresses", label: "Saved addresses", icon: MapPin },
  { href: "/account/enquiries", label: "Your enquiries", icon: ClipboardList },
];

/** The icon on its own, shown while the session is being read. */
export function AccountIcon() {
  return (
    <Link href="/account" aria-label="My account" className="flex size-10 items-center justify-center rounded-full bg-indigo text-white shadow-[0_6px_16px_-6px_rgb(38_46_134/0.7)] ring-2 ring-indigo/20">
      <UserRound className="size-5" strokeWidth={1.6} aria-hidden />
    </Link>
  );
}

/**
 * Header account control. On wide screens it opens a flyout on hover or keyboard focus (pure CSS, so it works without JavaScript):
 * signed out it offers Sign in and Create account, signed in it lists the account pages and Sign out. On small screens it is a plain link.
 */
export async function AccountMenu() {
  const me = await getCustomer();
  return (
    <div className="group relative">
      <Link href="/account" aria-label={me ? `My account, ${me.name}` : "Sign in or create an account"} aria-haspopup="menu" className="flex size-10 items-center justify-center rounded-full bg-indigo text-white shadow-[0_6px_16px_-6px_rgb(38_46_134/0.7)] ring-2 ring-indigo/20 transition-all hover:bg-indigo-deep hover:ring-4 group-focus-within:bg-indigo-deep group-focus-within:ring-4">
        <UserRound className="size-5" strokeWidth={1.8} aria-hidden />
      </Link>

      <div className="invisible absolute right-0 top-full z-50 hidden w-[19rem] translate-y-1 pt-3 opacity-0 transition-[opacity,transform,visibility] duration-200 ease-[var(--ease-out-soft)] group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 lg:block">
        <div className="relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-5 shadow-[0_30px_60px_-24px_rgb(18_22_76/0.4)]">
          <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-sun" />
          {me ? (
            <>
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo font-display text-lg font-bold text-white">
                  {me.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{me.name}</p>
                  <p className="truncate text-xs text-muted">{me.email}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-0.5 border-t border-line pt-3">
                <MenuLink href="/account" icon={UserRound} label="My account" />
                {LINKS.map((l) => (
                  <MenuLink key={l.href} {...l} />
                ))}
                <MenuLink href="/account/profile" icon={UserCog} label="Profile and password" />
              </ul>
              <form action={logoutAction} className="mt-3 border-t border-line pt-3">
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 py-2.5 text-sm font-semibold transition-colors hover:bg-ink hover:text-white">
                  <LogOut className="size-4" aria-hidden /> Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="font-display text-lg font-bold">Welcome to LESPARO</p>
              <p className="mt-1 text-sm text-ink-soft">Sign in to see your orders and saved addresses.</p>
              <Link href="/account/login" className="mt-4 flex h-11 items-center justify-center rounded-full bg-indigo text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgb(38_46_134/0.7)] transition-colors hover:bg-indigo-deep">
                Sign in
              </Link>
              <p className="mt-3 text-center text-sm text-ink-soft">
                New customer?{" "}
                <Link href="/account/register" className="font-semibold text-indigo hover:underline">
                  Start here
                </Link>
              </p>
              <ul className="mt-4 space-y-0.5 border-t border-line pt-3">
                {LINKS.map((l) => (
                  <MenuLink key={l.href} {...l} />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof UserRound }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-ink transition-colors hover:bg-linen hover:text-indigo">
        <Icon className="size-4 text-muted" aria-hidden /> {label}
      </Link>
    </li>
  );
}
