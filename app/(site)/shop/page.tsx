import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CatalogueBrowser, CatalogueSkeleton } from "@/components/site/catalogue-browser";
import { SplitWords } from "@/components/site/split-words";
import { CollectionBanner } from "@/components/site/collection-banner";

export const metadata: Metadata = {
  title: "Shop all products",
  description: "Browse the full LESPARO catalogue: gents and kids shorts, tracks and 3/4ths, lungis, kavi dhothies, towels and kerchiefs.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage(props: PageProps<"/shop">) {
  return (
    <>
      <CollectionBanner>
        <p className="eyebrow !text-white/60">Catalogue</p>
        <h1 className="mt-3 font-display text-[clamp(2.4rem,1.4rem+4vw,5rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
          <SplitWords onLoad>All</SplitWords> <SplitWords onLoad className="text-white/55">products</SplitWords>
        </h1>
        <p className="mt-5 max-w-md text-white/70">The full LESPARO range. Filter by fabric or size, or send us a wholesale enquiry for bulk pricing.</p>
        <div className="mt-8">
          <Link href="/wholesale#enquire" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5">
            Wholesale enquiry <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </CollectionBanner>
      <div className="mx-auto mt-10 max-w-page px-4 pb-16 sm:px-6 lg:px-10 lg:pb-20">
        <Suspense fallback={<CatalogueSkeleton />}>
          <CatalogueBrowser searchParams={props.searchParams} basePath="/shop" />
        </Suspense>
      </div>
    </>
  );
}
