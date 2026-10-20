import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddToEnquiryButton } from "@/components/site/enquiry-list";
import { ProductCard } from "@/components/site/product-card";
import { ProductGallery } from "@/components/site/product-gallery";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { BUSINESS } from "@/lib/business";
import { getAllPublishedSlugs, getProductBySlug, getRelatedProducts } from "@/lib/catalogue/queries";

export async function generateStaticParams() {
  return (await getAllPublishedSlugs()).products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  const description =
    p.seoDescription ?? [p.name, p.fabric, p.sizes.length ? `sizes ${p.sizes.join(", ")}` : null, p.packing].filter(Boolean).join(" · ") + ". Wholesale enquiries welcome.";
  return {
    title: p.seoTitle ?? p.name,
    description,
    alternates: { canonical: `/products/${slug}` },
    openGraph: { title: p.name, description, images: p.images[0] ? [{ url: p.images[0].url, width: 513, height: 655 }] : [] },
  };
}

async function ProductView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const related = await getRelatedProducts(p.categoryId, p.id);

  const features = p.specs.filter((s) => s.label === "Feature");
  const specs = [
    p.fabric && { label: "Fabric", value: p.fabric },
    ...p.specs.filter((s) => s.label !== "Feature"),
    p.packing && { label: "Packing", value: p.packing },
    p.sku && { label: "Reference", value: p.sku },
  ].filter(Boolean) as { label: string; value: string }[];

  // Structured data limited to verified facts: no price, availability or ratings.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images.map((i) => i.url),
    brand: { "@type": "Brand", name: "LESPARO" },
    ...(p.category && { category: p.category.name }),
    ...(p.sku && { sku: p.sku }),
    ...(p.fabric && { material: p.fabric }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/shop" className="link-draw">
              Shop
            </Link>
          </li>
          {p.category && (
            <li className="flex items-center gap-2">
              <span aria-hidden>/</span>
              <Link href={`/collections/${p.category.slug}`} className="link-draw">
                {p.category.name}
              </Link>
            </li>
          )}
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <ProductGallery images={p.images} name={p.name} productId={p.id} />

        <div className="lg:sticky lg:top-28 lg:self-start">
          {p.category && <p className="eyebrow">{p.category.name}</p>}
          <h1 className="mt-3 font-display text-headline font-bold">{p.name}</h1>
          {p.description && <p className="mt-5 leading-relaxed text-ink-soft">{p.description}</p>}

          {p.sizes.length > 0 && (
            <div className="mt-8">
              <p className="eyebrow !text-[0.65rem]">Available sizes</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.sizes.map((s) => (
                  <li key={s} className="flex h-10 min-w-12 items-center justify-center border border-sand bg-paper px-3 text-sm">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.retailEnabled && p.price !== null && (
            <p className="mt-8 text-2xl">{new Intl.NumberFormat("en-IN", { style: "currency", currency: p.currency }).format(p.price)}</p>
          )}

          {p.quoteEnabled && (
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <AddToEnquiryButton product={{ id: p.id, slug: p.slug, name: p.name }} />
              <ButtonLink href={`/wholesale?product=${p.slug}#enquire`} size="lg" className="h-12">
                Request a quote
              </ButtonLink>
            </div>
          )}
          <p className="mt-4 text-sm text-muted">
            Prefer to talk? Call{" "}
            <a href={BUSINESS.phone.href} className="underline">
              {BUSINESS.phone.display}
            </a>{" "}
            or customer care{" "}
            <a href={BUSINESS.customerCare.href} className="underline">
              {BUSINESS.customerCare.display}
            </a>
            .
          </p>

          {specs.length > 0 && (
            <dl className="mt-10 divide-y divide-line border-y border-line text-sm">
              {specs.map((s) => (
                <div key={s.label + s.value} className="grid grid-cols-[9rem_1fr] gap-4 py-3">
                  <dt className="text-muted">{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {features.length > 0 && (
            <ul className="mt-6 space-y-2 text-sm text-ink-soft">
              {features.map((f) => (
                <li key={f.value} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-brass" />
                  {f.value}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24 border-t border-line pt-14" aria-labelledby="related">
          <h2 id="related" className="font-display font-semibold text-title">
            More from {p.category?.name}
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {related.map((r) => (
              <li key={r.id}>
                <ProductCard product={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <Container className="py-10 lg:py-14">
      <Suspense fallback={<div className="aspect-[513/655] max-w-xl animate-pulse bg-linen" />}>
        <ProductView params={props.params} />
      </Suspense>
    </Container>
  );
}
