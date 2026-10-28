import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogueBrowser, CatalogueSkeleton } from "@/components/site/catalogue-browser";
import { BrandFilm } from "@/components/site/brand-film";
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
      <section className="mx-auto max-w-page px-4 pt-6 sm:px-6 lg:px-10 lg:pt-8">
        <div className="relative isolate overflow-hidden rounded-[1.8rem] bg-gradient-to-r from-[#e9e8fb] via-[#fbeef2] to-[#ffeccd] px-6 py-10 sm:px-12 lg:px-16 lg:py-14">
          <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
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
          <h1 className="mt-4 max-w-[70%] font-display text-[clamp(2.2rem,1.2rem+4vw,4.8rem)] font-extrabold uppercase leading-[0.95] tracking-tight text-indigo-deep">
            {category.name}
            {trail.length > 2 && <span className="text-indigo/50"> · {trail[trail.length - 2].name}</span>}
          </h1>
          {category.description && <p className="mt-4 max-w-prose text-ink-soft">{category.description}</p>}
          {children.length > 0 && (
            <ul className="mt-7 flex flex-wrap gap-2">
              {children.map((c) => (
                <li key={c.id}>
                  <Link href={`/collections/${c.slug}`} className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-semibold shadow-sm transition-colors hover:bg-indigo hover:text-white">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {category.coverUrl && <Image src={category.coverUrl} alt="" width={400} height={500} aria-hidden className="cutout pointer-events-none absolute bottom-0 right-4 -z-10 h-[88%] w-auto object-contain opacity-90 sm:right-12 lg:right-20" />}
        </div>
      </section>
      <div className="mt-6">
        <BrandFilm compact src={category.displayOrder % 2 ? "/lesparo_video.mp4" : "/lesparo-video-1.mp4"} title={`The ${category.name} film`} />
      </div>
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
