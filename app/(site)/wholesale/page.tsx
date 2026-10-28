import { Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CollectionBanner } from "@/components/site/collection-banner";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { SplitWords } from "@/components/site/split-words";
import { BUSINESS } from "@/lib/business";
import { getCategoryTree, getQuotableProducts } from "@/lib/catalogue/queries";
import { submitEnquiryAction } from "./actions";

export const metadata: Metadata = {
  title: "Wholesale enquiries",
  description: "Request a quotation from LESPARO — Abija Exports, Erode. Gents and kids garments, lungis, kavi dhothies, towels and kerchiefs for retailers and wholesalers.",
  alternates: { canonical: "/wholesale" },
};

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, products] = await Promise.all([searchParams, getQuotableProducts()]);
  const preselect = typeof sp.product === "string" ? sp.product : undefined;
  return <EnquiryForm action={submitEnquiryAction} products={products} preselectSlug={preselect} />;
}

const STEPS = [
  ["You receive a reference number as soon as you send.", "Reference"],
  ["Our sales team reviews your requirement.", "Review"],
  ["We contact you with a quotation or any questions.", "Quotation"],
];

export default async function WholesalePage(props: PageProps<"/wholesale">) {
  const tree = await getCategoryTree();
  return (
    <>
      <CollectionBanner slug="wholesale">
        <p className="text-sm text-white/60">Wholesale &amp; bulk supply</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,1.2rem+2.6vw,3.4rem)] font-extrabold uppercase leading-[0.98] tracking-tight">
          <SplitWords onLoad>Request a quotation</SplitWords>
        </h1>
        <p className="mt-4 max-w-md text-white/70">LESPARO supplies textile showrooms, retailers and wholesalers. Tell us what you need and our sales team will respond with pricing and supply details.</p>
      </CollectionBanner>

      {/* How it works, and what we supply. */}
      <section aria-label="How a wholesale enquiry works" className="mx-auto max-w-page px-4 pt-14 sm:px-6 lg:px-10 lg:pt-20">
        <ol className="grid gap-8 md:grid-cols-3 md:gap-8">
          {STEPS.map(([text, label], i) => (
            <li key={label} data-reveal="up" style={{ ["--delay" as string]: `${i * 80}ms` }} className="border-t-2 border-ink pt-4">
              <p className="font-display text-sm font-bold tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="mt-1 font-display text-lg font-bold uppercase tracking-tight">{label}</h2>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>

        <div data-reveal="up" className="mt-12 grid gap-6 bg-[#f2f3f5] p-6 sm:p-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
          <div>
            <h2 className="font-display text-lg font-bold uppercase tracking-tight">What we supply</h2>
            <ul className="mt-3 space-y-1.5 text-[0.95rem]">
              {tree.map((t) => (
                <li key={t.id}>
                  <Link href={`/collections/${t.slug}`} className="hline font-semibold">
                    {t.name}
                  </Link>
                  <span className="text-muted"> — {t.children.map((c) => c.name).join(" · ")}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-tight">
              <Phone className="size-4" aria-hidden /> Prefer to call?
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
              Office{" "}
              <a href={BUSINESS.phone.href} className="hline font-semibold text-ink">
                {BUSINESS.phone.display}
              </a>
              <br />
              Customer care{" "}
              <a href={BUSINESS.customerCare.href} className="hline font-semibold text-ink">
                {BUSINESS.customerCare.display}
              </a>{" "}
              ({BUSINESS.customerCare.hours})
              <br />
              <a href={`mailto:${BUSINESS.email}`} className="hline font-semibold text-ink">
                {BUSINESS.email}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* The form. */}
      <section id="enquire" aria-labelledby="enquire-heading" className="mx-auto max-w-page scroll-mt-24 px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 id="enquire-heading" className="font-display text-[clamp(1.5rem,1.1rem+1.2vw,2.2rem)] font-extrabold uppercase leading-tight tracking-tight">
              Your enquiry
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">Products you added to your enquiry list are already filled in. Add quantities, sizes and colours, or describe a custom requirement.</p>
          </div>
          <Suspense fallback={<div className="h-[40rem] animate-pulse bg-linen/60" />}>
            <Form searchParams={props.searchParams} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
