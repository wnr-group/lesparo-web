import { ArrowRight, Check, ChevronRight, Plus, RotateCcw, ShieldCheck, Truck, Store } from "lucide-react";
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
import { deptClass } from "@/lib/departments";
import { DELIVERY_POINTS, PLACEHOLDER_CARE, PLACEHOLDER_FEATURES, PLACEHOLDER_SIZE_NOTE, placeholderDescription } from "@/lib/catalogue/placeholder-content";
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

  // Real content wins; where a product has none yet, neutral placeholders keep the page complete (see lib/catalogue/placeholder-content.ts).
  const realFeatures = p.specs.filter((s) => s.label === "Feature");
  const features = realFeatures.length ? realFeatures.map((f) => f.value) : PLACEHOLDER_FEATURES;
  const description = p.description || placeholderDescription(p);
  const specs = [
    p.fabric && { label: "Fabric", value: p.fabric },
    ...p.specs.filter((s) => s.label !== "Feature"),
    p.packing && { label: "Packing", value: p.packing },
    p.sku && { label: "Reference", value: p.sku },
  ].filter(Boolean) as { label: string; value: string }[];

  // Key highlights: only facts we hold, plus placeholders for what the catalogue does not record yet.
  const highlights = [
    { label: "Product type", value: p.category?.name ?? "Garment" },
    { label: "Country of origin", value: "India" },
    { label: "Fabric", value: p.fabric ?? "To be updated" },
    { label: "Sizes", value: p.sizes.length ? p.sizes.join(", ") : "To be updated" },
    { label: "Packing", value: p.packing ?? "To be updated" },
    { label: "Reference", value: p.sku ?? "To be updated" },
  ];

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
            <Link href={`/collections/${p.category.slug}`} className={`${deptClass(p.category.slug) ?? ""} inline-flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--dept,var(--color-muted))] transition-opacity hover:opacity-75`}>
              {p.category.name}
            </Link>
          )}
          <h1 className="mt-2.5 text-[clamp(1.5rem,1.2rem+1.1vw,2.1rem)] font-semibold leading-[1.15] tracking-tight text-indigo-deep">{p.name}</h1>
          {retail && (
            <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
              <span className="font-sport text-[1.9rem] font-extrabold tabular-nums tracking-tight text-indigo-deep">{formatPrice(p.price!, p.currency)}</span>
              <span className="text-[0.82rem] font-semibold text-offer">Inclusive of taxes</span>
              <span className="text-xs text-muted">per piece</span>
            </p>
          )}
          <p className="mt-5 max-w-prose leading-relaxed text-ink-soft">{description}</p>

          {p.quoteEnabled && (
            <a href="#wholesale-heading" className="mt-5 flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-100 to-indigo-50 px-4 py-3 text-sm text-indigo-deep ring-1 ring-indigo-100 transition-colors hover:from-indigo-200">
              <Store className="size-5 shrink-0 text-indigo" aria-hidden />
              <span>
                Buying for a shop? <strong className="font-semibold">Get bulk and wholesale rates</strong> on this style.
              </span>
              <ArrowRight className="ml-auto size-4 shrink-0" aria-hidden />
            </a>
          )}

          {p.sizes.length > 0 && !retail && (
            <div className="mt-6">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-muted">Available sizes</p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {p.sizes.map((z) => (
                  <li key={z} className="grid h-10 min-w-12 place-items-center rounded-md px-3 text-sm font-semibold text-ink ring-1 ring-line">
                    {z}
                  </li>
                ))}
              </ul>
            </div>
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

          <section aria-labelledby="highlights" className="mt-9">
            <h2 id="highlights" className="text-[1.05rem] font-semibold text-indigo-deep">
              Key highlights
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-8">
              {highlights.map((h) => (
                <div key={h.label} className="border-b border-line py-3">
                  <dt className="text-[0.8rem] text-muted">{h.label}</dt>
                  <dd className="mt-0.5 text-[0.92rem] font-semibold text-indigo-deep">{h.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <ul className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[
              { icon: ShieldCheck, label: "Quality checked" },
              { icon: Truck, label: "Ships across India" },
              { icon: RotateCcw, label: "Easy support" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-1.5 rounded-xl bg-indigo-50 px-2 py-4 ring-1 ring-indigo-100">
                <Icon className="size-5 text-indigo" aria-hidden />
                <span className="text-[0.68rem] font-semibold uppercase leading-tight tracking-[0.08em] text-ink-soft">{label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 overflow-hidden rounded-2xl bg-white ring-1 ring-line [&>details]:px-5 [&>details:last-child]:border-b-0">
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
            <Disclosure title="Features" open={specs.length === 0}>
              <ul className="space-y-2.5 text-sm text-ink-soft">
                {features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-indigo" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </Disclosure>
            <Disclosure title="Fabric & care">
              {p.fabric && <p className="mb-3 text-sm font-medium text-ink">{p.fabric}</p>}
              <ul className="space-y-2 text-sm text-ink-soft">
                {PLACEHOLDER_CARE.map((c) => (
                  <li key={c} className="flex gap-3">
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-sun-500" />
                    {c}
                  </li>
                ))}
              </ul>
            </Disclosure>
            <Disclosure title="Size guide">
              <p className="text-sm leading-relaxed text-ink-soft">{p.sizes.length ? `Sizes: ${p.sizes.join(", ")}. ` : ""}{PLACEHOLDER_SIZE_NOTE}</p>
            </Disclosure>
            <Disclosure title="Delivery, returns & wholesale">
              <dl className="space-y-3 text-sm">
                {DELIVERY_POINTS.map((d) => (
                  <div key={d.title}>
                    <dt className="flex items-center gap-2 font-semibold text-ink">
                      {d.title === "Wholesale" && <Store className="size-4 text-indigo" aria-hidden />}
                      {d.title}
                    </dt>
                    <dd className="mt-0.5 text-ink-soft">{d.body}</dd>
                  </div>
                ))}
              </dl>
            </Disclosure>
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
