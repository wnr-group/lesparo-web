import type { Metadata } from "next";
import { Suspense } from "react";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { WholesaleContact, WholesaleLanding } from "@/components/site/wholesale-landing";
import { getQuotableProducts } from "@/lib/catalogue/queries";
import { submitEnquiryAction } from "./actions";

export const metadata: Metadata = {
  title: "B2B sales: wholesale enquiries",
  description: "Request the LESPARO (Abija Exports, Erode) B2B price list. Garments, lungis, kavi dhothies, towels and kerchiefs for retailers, showrooms and wholesalers, from Erode since 1979.",
  alternates: { canonical: "/wholesale" },
};

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, products] = await Promise.all([searchParams, getQuotableProducts()]);
  const preselect = typeof sp.product === "string" ? sp.product : undefined;
  return <EnquiryForm action={submitEnquiryAction} products={products} preselectSlug={preselect} />;
}

export default function WholesalePage(props: PageProps<"/wholesale">) {
  return (
    <>
      <WholesaleLanding />

      {/* The form. */}
      <section id="enquire" aria-labelledby="enquire-heading" className="mx-auto max-w-page scroll-mt-24 px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 max-w-xl">
            <p className="eyebrow">Your details</p>
            <h2 id="enquire-heading" className="mt-3 font-display text-[clamp(1.8rem,1.2rem+2.2vw,3rem)] font-extrabold leading-tight tracking-tight">
              Request the B2B price list.
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">Start with your shop name and GST number. Products you added to your enquiry list are already filled in below.</p>
          </div>
          <Suspense fallback={<div className="h-[40rem] animate-pulse rounded-[1.4rem] bg-linen/60" />}>
            <Form searchParams={props.searchParams} />
          </Suspense>
        </div>
      </section>

      <WholesaleContact />
    </>
  );
}
