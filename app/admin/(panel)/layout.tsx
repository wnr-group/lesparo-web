import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireStaffPage } from "@/lib/auth/staff";
import { signOut } from "../login/actions";

/** Every admin page renders inside this gate: the staff check runs on the server per request. */
async function StaffGate({ children }: { children: React.ReactNode }) {
  const session = await requireStaffPage();
  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-line bg-ivory px-4 py-3 text-sm lg:px-8">
        <span className="text-muted">
          Signed in as <span className="text-ink">{session.email}</span> · {session.isAdmin ? "Administrator" : "Sales"}
        </span>
        <form action={signOut}>
          <button type="submit" className="link-draw text-ink-soft hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
      <div className="px-4 py-8 lg:px-8">{children}</div>
    </>
  );
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="border-b border-line bg-ivory px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <div className="mb-4 flex items-center justify-between lg:mb-8 lg:block">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/lesparo-logo-v2.png" alt="LESPARO" width={900} height={484} className="h-9 w-auto" />
            <span className="eyebrow !text-[0.6rem]">Admin</span>
          </Link>
          <Link href="/" className="text-xs text-muted hover:text-ink lg:mt-3 lg:inline-block">
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
