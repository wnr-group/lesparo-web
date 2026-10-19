import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogueBrowser, CatalogueSkeleton } from "@/components/site/catalogue-browser";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Shop all products",
  description: "Browse the full LESPARO catalogue: gents and kids shorts, tracks and 3/4ths, lungis, kavi dhothies, towels and kerchiefs.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage(props: PageProps<"/shop">) {
  return (
    <Container className="py-12 lg:py-16">
      <p className="eyebrow">Catalogue</p>
      <h1 className="mt-3 font-display text-headline font-bold">All products</h1>
      <div className="mt-10">
        <Suspense fallback={<CatalogueSkeleton />}>
          <CatalogueBrowser searchParams={props.searchParams} basePath="/shop" />
        </Suspense>
      </div>
    </Container>
  );
}
