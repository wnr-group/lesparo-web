import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { NotificationBell } from "@/components/admin/notifications";
import { requireStaffPage } from "@/lib/auth/staff";
import { getAdminNotifications } from "@/lib/services/admin-notifications";
import { signOut } from "../login/actions";

/** Every admin page renders inside this gate: the staff check runs on the server per request. */
async function StaffGate({ children }: { children: React.ReactNode }) {
  const session = await requireStaffPage();
  const notifications = await getAdminNotifications();
  return (
    <>
      <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-line bg-ivory/85 px-4 py-2.5 text-sm backdrop-blur lg:px-8">
        <span className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-indigo text-xs font-semibold uppercase text-paper">
            {(session.email ?? "?").charAt(0)}
          </span>
          <span className="min-w-0 truncate text-ink">{session.email}</span>
          <span className="hidden rounded-full border border-line bg-plate px-2 py-0.5 text-xs text-muted sm:inline">{session.isAdmin ? "Administrator" : "Sales"}</span>
        </span>
        <div className="flex items-center gap-3">
        <NotificationBell initial={notifications} />
        <form action={signOut}>
          <button type="submit" className="rounded-full border border-line bg-plate px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink">
            Sign out
          </button>
        </form>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-10">{children}</div>
    </>
  );
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="border-b border-line bg-ivory px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-7">
        <div className="mb-4 flex items-center justify-between lg:mb-8 lg:block">
          <Link href="/admin" className="flex items-center gap-3">
            <Image src="/lesparo-logo-v3.png" alt="LESPARO" width={875} height={460} className="h-10 w-auto" />
            <span className="rounded-full bg-indigo/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-indigo">Admin</span>
          </Link>
          <Link href="/" className="text-xs text-muted transition-colors hover:text-indigo lg:mt-4 lg:inline-block">
            View site ↗
          </Link>
        </div>
        {/* usePathname() is request data: keep it behind a boundary so the shell stays static. */}
        <Suspense fallback={<div className="h-10 lg:h-48" />}>
          <AdminNav />
        </Suspense>
      </aside>
      <div className="min-w-0 flex-1">
        <Suspense fallback={<div className="p-8 text-sm text-muted">Loading…</div>}>
          <StaffGate>{children}</StaffGate>
        </Suspense>
      </div>
    </div>
  );
}
