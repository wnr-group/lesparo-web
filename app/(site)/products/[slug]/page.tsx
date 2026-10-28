import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RetailPurchase } from "@/components/site/cart";
import { AddToEnquiryButton } from "@/components/site/enquiry-list";
import { ProductCard } from "@/components/site/product-card";
import { ProductGallery } from "@/components/site/product-gallery";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { BUSINESS } from "@/lib/business";
import { formatPrice } from "@/lib/format";
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

  // Structured data: verified facts, plus the retail price only when the admin has switched retail on.
  const retail = p.retailEnabled && p.price !== null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images.map((i) => i.url),
    brand: { "@type": "Brand", name: "LESPARO" },
    ...(p.category && { category: p.category.name }),
    ...(p.sku && { sku: p.sku }),
    ...(p.fabric && { material: p.fabric }),
    ...(retail && { offers: { "@type": "Offer", price: p.price, priceCurrency: p.currency, url: `/products/${p.slug}` } }),
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
          <h1 className="mt-3 font-display text-[clamp(1.9rem,1.2rem+2.4vw,3.2rem)] font-extrabold uppercase leading-[1.02] tracking-tight">{p.name}</h1>
          {p.description && <p className="mt-5 leading-relaxed text-ink-soft">{p.description}</p>}

          {p.sizes.length > 0 && !retail && (
            <div className="mt-8">
              <p className="eyebrow !text-[0.65rem]">Available sizes</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.sizes.map((s) => (
                  <li key={s} className="flex h-10 min-w-12 items-center justify-center rounded-full border border-sand bg-[#efe8da] px-4 text-sm font-semibold">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {retail && (
            <section aria-labelledby="retail-heading" className="mt-8 rounded-[1.4rem] border-2 border-ink bg-white p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="retail-heading" className="eyebrow">
                  Buy online · Retail
                </h2>
                <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight">{formatPrice(p.price!, p.currency)}</p>
              </div>
              <p className="mt-1 text-xs text-muted">Retail price per piece, inclusive of listed taxes where applicable.</p>
              <div className="mt-5">
                <RetailPurchase product={{ id: p.id, slug: p.slug, name: p.name, image: p.images[0]?.url ?? null, price: p.price!, currency: p.currency, sizes: p.sizes }} />
              </div>
            </section>
          )}

          {p.quoteEnabled && (
            <section aria-labelledby="wholesale-heading" className="mt-4 rounded-[1.4rem] bg-[#efe8da] p-5 sm:p-6">
              <h2 id="wholesale-heading" className="eyebrow">
                Buying in bulk · Wholesale
              </h2>
              <p className="mt-2 text-sm text-ink-soft">Shops, showrooms and resellers: ask for bulk pricing, pack sizes and supply details. Wholesale rates are quoted, not listed.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ButtonLink href={`/wholesale?product=${p.slug}#enquire`} size="lg" className="h-12">
                  Enquire now
                </ButtonLink>
                <AddToEnquiryButton product={{ id: p.id, slug: p.slug, name: p.name }} />
              </div>
            </section>
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
        <section className="mt-24 rounded-[1.6rem] bg-[#efe8da] px-5 py-12 sm:px-8 lg:px-10" aria-labelledby="related">
          <h2 id="related" className="font-display text-[clamp(1.6rem,1.1rem+2vw,2.6rem)] font-extrabold uppercase tracking-tight">
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
