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
      <RevealObserver />
      {/* Reads usePathname(): keep it behind a boundary so pages can be re-rendered. */}
      <Suspense>
        <SmoothScroll />
      </Suspense>
    </>
  );
}
