import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { RevealObserver } from "@/components/site/reveal-observer";
import { SmoothScroll } from "@/components/site/smooth-scroll";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <RevealObserver />
      <SmoothScroll />
    </>
  );
}
