import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getCategoryTree } from "@/lib/catalogue/queries";
import { SiteNav, type NavGroup } from "./site-nav";

async function navGroups(): Promise<NavGroup[]> {
  const tree = await getCategoryTree();
  return tree.map((top) => ({
    label: top.name,
    href: `/collections/${top.slug}`,
    columns: top.children.map((c) => ({
      label: c.name,
      href: `/collections/${c.slug}`,
      links: c.children.map((l) => ({ label: l.name, href: `/collections/${l.slug}` })),
    })),
  }));
}

export async function Header() {
  const groups = await navGroups();
  return (
    <header style={{ viewTransitionName: "site-header" }} className="sticky top-0 z-30 border-b border-line/70 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-paper focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="relative mx-auto flex h-16 max-w-page items-center justify-between gap-6 px-4 sm:px-6 lg:h-[4.5rem] lg:px-10">
        <Link href="/" className="shrink-0" aria-label="LESPARO home">
          {/* Registered LESPARO mark, unaltered. */}
          <Image src="/lesparo-logo.png" alt="LESPARO" width={678} height={446} priority className="h-11 w-auto lg:h-12" />
        </Link>
        {/* usePathname() is request data: a boundary lets pages re-render after admin edits. */}
        <Suspense>
          <SiteNav groups={groups} />
        </Suspense>
      </div>
    </header>
  );
}
