import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/primitives";
import { getCategoryTree } from "@/lib/catalogue/queries";

export const metadata: Metadata = {
  title: "Collections",
  description: "LESPARO garments for gents and kids, and unstitched fabrics: lungi, kavi, towels and kerchiefs.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const tree = await getCategoryTree();
  return (
    <Container className="py-12 lg:py-16">
      <p className="eyebrow">Collections</p>
      <h1 className="mt-3 font-display text-headline font-bold">Browse by collection</h1>
      <div className="mt-14 space-y-20">
        {tree.map((top) => (
          <section key={top.id} aria-labelledby={`c-${top.slug}`}>
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
              <h2 id={`c-${top.slug}`} className="font-display font-semibold text-title">
                {top.name}
              </h2>
              <Link href={`/collections/${top.slug}`} className="link-draw text-sm font-medium">
                View all →
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
              {top.children.map((c) => (
                <li key={c.id}>
                  <Link href={`/collections/${c.slug}`} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-plate ring-1 ring-line">
                      {c.coverUrl && <Image src={c.coverUrl} alt="" fill sizes="(min-width:768px) 22vw, 45vw" className="object-contain transition-transform duration-700 group-hover:scale-[1.04]" />}
                    </div>
                    <h3 className="mt-4 font-display font-semibold text-2xl">{c.name}</h3>
                  </Link>
                  {c.children.length > 0 && (
                    <ul className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted">
                      {c.children.map((g) => (
                        <li key={g.id}>
                          <Link href={`/collections/${g.slug}`} className="link-draw hover:text-ink">
                            {g.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Container>
  );
}
