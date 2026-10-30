import { ArrowRight, Check, ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RetailPurchase } from "@/components/site/cart";
import { AddToEnquiryButton } from "@/components/site/enquiry-list";
import { ProductGallery } from "@/components/site/product-gallery";
import { RelatedProduct } from "@/components/site/product-related";
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

function Disclosure({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="acc group border-b border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[0.8rem] font-semibold uppercase tracking-[0.14em] [&::-webkit-details-marker]:hidden">
        {title}
        <Plus className="size-4 text-muted transition-transform duration-300 group-open:rotate-45" aria-hidden />
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  );
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
      <nav aria-label="Breadcrumb" className="text-[0.8rem] text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/shop" className="link-draw">
              Shop
            </Link>
          </li>
          {p.category && (
            <li className="flex items-center gap-1.5">
              <ChevronRight className="size-3.5" aria-hidden />
              <Link href={`/collections/${p.category.slug}`} className="link-draw">
                {p.category.name}
              </Link>
            </li>
          )}
          <li className="flex min-w-0 items-center gap-1.5">
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
            <span aria-current="page" className="truncate text-ink">
              {p.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start motion-safe:animate-[rise_0.8s_var(--ease-out-soft)_both]">
          <ProductGallery images={p.images} name={p.name} productId={p.id} />
        </div>

        <div className="min-w-0 motion-safe:animate-[rise_0.8s_var(--ease-out-soft)_0.12s_both]">
          {p.category && (
            <Link href={`/collections/${p.category.slug}`} className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted transition-colors hover:text-indigo">
              {p.category.name}
            </Link>
          )}
          <h1 className="mt-3 font-display text-[clamp(1.9rem,1.3rem+2vw,2.9rem)] font-bold leading-[1.05] tracking-tight">{p.name}</h1>
          {retail && (
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
              <span className="font-display text-[1.7rem] font-semibold tabular-nums tracking-tight">{formatPrice(p.price!, p.currency)}</span>
              <span className="text-xs text-muted">per piece · inclusive of listed taxes where applicable</span>
            </p>
          )}
          {p.description && <p className="mt-5 max-w-prose leading-relaxed text-ink-soft">{p.description}</p>}

          {p.sizes.length > 0 && !retail && (
            <p className="mt-6 text-sm">
              <span className="text-muted">Available sizes</span>
              <span className="ml-3 font-medium">{p.sizes.join(" · ")}</span>
            </p>
          )}

          {retail && (
            <div className="mt-8 border-t border-line pt-7">
              <RetailPurchase product={{ id: p.id, slug: p.slug, name: p.name, image: p.images[0]?.url ?? null, price: p.price!, currency: p.currency, sizes: p.sizes }} />
            </div>
          )}

          {p.quoteEnabled && (
            <section aria-labelledby="wholesale-heading" className={retail ? "mt-8 border-t border-line pt-7" : "mt-8"} id={retail ? undefined : "buy"}>
              <h2 id="wholesale-heading" className="text-[0.8rem] font-semibold uppercase tracking-[0.14em]">
                Wholesale &amp; bulk
              </h2>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">Shops, showrooms and resellers: ask for bulk pricing, pack sizes and supply details. Wholesale rates are quoted, not listed.</p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <Link
                  href={`/wholesale?product=${p.slug}#enquire`}
                  className="group/e inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink px-5 text-[0.88rem] font-semibold text-white transition-colors duration-300 hover:bg-indigo"
                >
                  Enquire now <ArrowRight className="size-4 transition-transform duration-300 group-hover/e:translate-x-1" aria-hidden />
                </Link>
                <AddToEnquiryButton variant="flat" product={{ id: p.id, slug: p.slug, name: p.name }} />
              </div>
            </section>
          )}

          <div className="mt-9 border-t border-line">
            {specs.length > 0 && (
              <Disclosure title="Product details" open>
                <dl className="text-sm">
                  {specs.map((s) => (
                    <div key={s.label + s.value} className="grid grid-cols-[7.5rem_1fr] gap-4 py-2">
                      <dt className="text-muted">{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </Disclosure>
            )}
            {features.length > 0 && (
              <Disclosure title="Features">
                <ul className="space-y-2.5 text-sm text-ink-soft">
                  {features.map((f) => (
                    <li key={f.value} className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-indigo" aria-hidden />
                      {f.value}
                    </li>
                  ))}
                </ul>
              </Disclosure>
            )}
            <Disclosure title="Questions?">
              <p className="text-sm leading-relaxed text-ink-soft">
                Call{" "}
                <a href={BUSINESS.phone.href} className="font-medium text-ink underline underline-offset-4">
                  {BUSINESS.phone.display}
                </a>{" "}
                or customer care{" "}
                <a href={BUSINESS.customerCare.href} className="font-medium text-ink underline underline-offset-4">
                  {BUSINESS.customerCare.display}
                </a>
                .
              </p>
            </Disclosure>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24 border-t border-line pt-14" aria-labelledby="related">
          <div className="flex items-end justify-between gap-6">
            <h2 id="related" className="font-display text-[clamp(1.5rem,1.1rem+1.5vw,2.3rem)] font-bold tracking-tight">
              More from {p.category?.name}
            </h2>
            {p.category && (
              <Link href={`/collections/${p.category.slug}`} className="link-draw hidden text-sm font-medium sm:inline">
                View all
              </Link>
            )}
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {related.map((r, i) => (
              <li key={r.id} data-reveal="up" style={{ ["--delay" as string]: `${(i % 4) * 90}ms` }}>
                <RelatedProduct product={r} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Phones: the buy panel sits below the gallery, so keep the call to action in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <span className="min-w-0 truncate text-sm font-semibold">{retail ? formatPrice(p.price!, p.currency) : p.name}</span>
        <a href="#buy" className="inline-flex h-11 shrink-0 items-center rounded-md bg-ink px-6 text-sm font-semibold text-white">
          {retail ? "Buy now" : "Enquire"}
        </a>
      </div>
    </>
  );
}

export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <Container className="py-8 pb-24 lg:py-12 lg:pb-14">
      <Suspense fallback={<div className="aspect-[4/5] max-w-xl animate-pulse bg-linen" />}>
        <ProductView params={props.params} />
      </Suspense>
    </Container>
  );
}
