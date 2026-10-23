import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogueBrowser, CatalogueSkeleton } from "@/components/site/catalogue-browser";
import { Container } from "@/components/ui/primitives";
import { getCategories, getCategoryBySlug } from "@/lib/catalogue/queries";

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const found = await getCategoryBySlug(slug);
  if (!found) return { title: "Collection not found" };
  const path = found.trail.map((c) => c.name).join(" / ");
  return {
    title: found.trail.length > 1 ? `${found.category.name} – ${found.trail[found.trail.length - 2].name}` : found.category.name,
    description: found.category.description ?? `LESPARO ${path}: browse the range and send a wholesale enquiry.`,
    alternates: { canonical: `/collections/${slug}` },
  };
}

async function CollectionHeader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getCategoryBySlug(slug);
  if (!found) notFound();
  const { category, trail, children } = found;
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/collections" className="link-draw">
              Collections
            </Link>
          </li>
          {trail.slice(0, -1).map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <span aria-hidden>/</span>
              <Link href={`/collections/${c.slug}`} className="link-draw">
                {c.name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <h1 className="mt-4 font-display text-headline font-bold">
        {category.name}
        {trail.length > 2 && <span className="text-muted"> · {trail[trail.length - 2].name}</span>}
      </h1>
      {category.description && <p className="mt-4 max-w-prose text-ink-soft">{category.description}</p>}
      {children.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-2">
          {children.map((c) => (
            <li key={c.id}>
              <Link href={`/collections/${c.slug}`} className="inline-flex h-9 items-center border border-sand px-4 text-sm transition-colors hover:border-ink hover:bg-ink hover:text-paper">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function CollectionProducts({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const found = await getCategoryBySlug(slug);
  if (!found) return null;
  return <CatalogueBrowser searchParams={searchParams} basePath={`/collections/${slug}`} categoryIds={found.subtreeIds} showSearch={false} />;
}

export default function CollectionPage(props: PageProps<"/collections/[slug]">) {
  return (
    <Container className="py-12 lg:py-16">
      <Suspense fallback={<div className="h-28" />}>
        <CollectionHeader params={props.params} />
      </Suspense>
      <div className="mt-10">
        <Suspense fallback={<CatalogueSkeleton />}>
          <CollectionProducts params={props.params} searchParams={props.searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}
