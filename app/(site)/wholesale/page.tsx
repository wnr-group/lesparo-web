import type { Metadata } from "next";
import { Suspense } from "react";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { Container } from "@/components/ui/primitives";
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

export default async function WholesalePage(props: PageProps<"/wholesale">) {
  const tree = await getCategoryTree();
  return (
    <>
      <section className="border-b border-line">
        <Container className="grid gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="eyebrow">Wholesale & bulk supply</p>
            <h1 className="mt-4 font-display text-display font-bold">Request a quotation</h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
              LESPARO supplies textile showrooms, retailers and wholesalers. Tell us the products, quantities and specifications you need and our sales team will respond with pricing and supply details.
            </p>
          </div>
          <dl className="grid content-end gap-px self-end bg-line sm:grid-cols-2">
            {tree.map((t) => (
              <div key={t.id} className="bg-ivory p-5">
                <dt className="font-display font-semibold text-xl">{t.name}</dt>
                <dd className="mt-1 text-sm text-muted">{t.children.map((c) => c.name).join(" · ")}</dd>
              </div>
            ))}
            <div className="bg-ivory p-5 sm:col-span-2">
              <dt className="eyebrow !text-[0.65rem]">Prefer to call?</dt>
              <dd className="mt-2 text-sm">
                Office{" "}
                <a href={BUSINESS.phone.href} className="underline">
                  {BUSINESS.phone.display}
                </a>{" "}
                · Customer care{" "}
                <a href={BUSINESS.customerCare.href} className="underline">
                  {BUSINESS.customerCare.display}
                </a>{" "}
                ({BUSINESS.customerCare.hours}) ·{" "}
                <a href={`mailto:${BUSINESS.email}`} className="underline">
                  {BUSINESS.email}
                </a>
              </dd>
            </div>
          </dl>
        </Container>
      </section>

      <section id="enquire" className="scroll-mt-24 py-16 lg:py-24">
        <Container className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="font-display font-semibold text-title">Your enquiry</h2>
            <p className="mt-4 text-ink-soft">Products you added to your enquiry list are already filled in. Add quantities, sizes and colours, or describe a custom requirement.</p>
            <ol className="mt-8 space-y-4 border-l border-sand pl-5 text-sm text-ink-soft">
              <li>You receive a reference number as soon as you send.</li>
              <li>Our sales team reviews your requirement.</li>
              <li>We contact you with a quotation or any questions.</li>
            </ol>
          </div>
          <Suspense fallback={<div className="h-[40rem] animate-pulse bg-linen/60" />}>
            <Form searchParams={props.searchParams} />
          </Suspense>
        </Container>
      </section>
    </>
  );
}
