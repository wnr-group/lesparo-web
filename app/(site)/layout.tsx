import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { RevealObserver } from "@/components/site/reveal-observer";
import { SmoothScroll } from "@/components/site/smooth-scroll";
import { Suspense } from "react";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      {/* Room under the footer for the mobile tab bar (components/site/mobile-tab-bar.tsx), in the footer's colour. */}
      <div aria-hidden className="h-[calc(3.75rem+env(safe-area-inset-bottom))] bg-indigo-deep lg:hidden" />
      <RevealObserver />
      {/* Reads usePathname(): keep it behind a boundary so pages can be re-rendered. */}
      <Suspense>
        <SmoothScroll />
      </Suspense>
    </>
  );
}
