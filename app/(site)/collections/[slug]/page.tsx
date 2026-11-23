import type { Metadata } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogueBrowser, CatalogueSkeleton } from "@/components/site/catalogue-browser";
import { SplitWords } from "@/components/site/split-words";
import { CollectionBanner, hasPhoto } from "@/components/site/collection-banner";
import { getCategories, getCategoryBySlug, listProducts } from "@/lib/catalogue/queries";

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

/** The stretch of the film that plays: 0:00 to 0:06:12 (6 seconds and 12 frames at the file's 24 fps, which is 6.5 s), then it loops. */
const GENTS_CLIP: [number, number] = [0, 6 + 12 / 24];

/** A promo film for a collection, if public/videos/<slug>_video.mp4 exists (gents_video.mp4 for Gents). */
function filmFor(slug: string) {
  const name = `${slug}_video.mp4`;
  return existsSync(join(process.cwd(), "public", "videos", name)) ? `/videos/${name}` : undefined;
}

async function CollectionHeader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getCategoryBySlug(slug);
  if (!found) notFound();
  const { category, trail, children } = found;
  // Collections without a shoot photograph show their own products instead.
  const { products: own } = hasPhoto(slug) ? { products: [] } : await listProducts({ categoryIds: found.subtreeIds, pageSize: 3 });
  const bannerProducts = own.filter((p) => p.images[0]).map((p) => ({ src: p.images[0].url, alt: p.name }));
  return (
    <CollectionBanner slug={slug} products={bannerProducts} video={filmFor(slug)} clip={filmFor(slug) ? GENTS_CLIP : undefined}>
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
  return <CatalogueBrowser searchParams={searchParams} basePath={`/collections/${slug}`} categoryIds={found.subtreeIds} categoryOptions={found.children.map((c) => ({ slug: c.slug, name: c.name, depth: 0 }))} />;
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
