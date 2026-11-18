import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { PortalNav } from "@/components/account/portal-nav";
import { Container } from "@/components/ui/primitives";
import { requireCustomerPage } from "@/lib/auth/customer";

/** The account area depends on the signed-in customer, so it cannot be prerendered. Pages below show loading.tsx while they read the session. */
export const instant = false;

export const metadata: Metadata = { title: { default: "My account", template: "%s | My account" }, robots: { index: false, follow: false } };

/** Signed-in area. Pages and actions inside re-check the session themselves; this shell is the first gate, not the only one. */
async function Shell({ children }: { children: ReactNode }) {
  const me = await requireCustomerPage();
  return (
    <Container className="py-10 lg:py-14">
      <div className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-14">
        <PortalNav name={me.name} email={me.email} />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Container className="py-14"><div className="h-96 animate-pulse bg-paper" /></Container>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
