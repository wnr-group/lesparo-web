import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogueBrowser, CatalogueSkeleton } from "@/components/site/catalogue-browser";
import { SplitWords } from "@/components/site/split-words";
import { CollectionBanner } from "@/components/site/collection-banner";
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
    <CollectionBanner slug={slug}>
      <nav aria-label="Breadcrumb" className="text-sm text-white/60">
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
      <h1 className="mt-4 font-display text-[clamp(2.4rem,1.4rem+4vw,5rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
        <SplitWords onLoad>{category.name}</SplitWords>
        {trail.length > 2 && <span className="text-white/55"> · {trail[trail.length - 2].name}</span>}
      </h1>
      {category.description && <p className="mt-4 max-w-prose text-white/70">{category.description}</p>}
      {children.length > 0 && (
        <ul className="mt-7 flex flex-wrap gap-2">
          {children.map((c) => (
            <li key={c.id}>
              <Link href={`/collections/${c.slug}`} className="inline-flex h-10 items-center rounded-full border border-white/35 px-5 text-sm font-semibold transition-colors hover:border-white hover:bg-white hover:text-ink">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CollectionBanner>
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
    <>
      <Suspense fallback={<div className="h-64" />}>
        <CollectionHeader params={props.params} />
      </Suspense>
      <div className="mx-auto mt-10 max-w-page px-4 pb-16 sm:px-6 lg:px-10 lg:pb-20">
        <Suspense fallback={<CatalogueSkeleton />}>
          <CollectionProducts params={props.params} searchParams={props.searchParams} />
        </Suspense>
      </div>
    </>
  );
}
