import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { BUSINESS, formattedAddress } from "@/lib/business";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact LESPARO — Abija Exports, NMS Compound, Erode Fort, Erode 638001. Phone 094430 22044, customer care 93425 46046.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const mapQuery = encodeURIComponent(`${BUSINESS.displayName}, ${formattedAddress().join(", ")}`);
  return (
    <Container className="py-16 lg:py-24">
      <p className="eyebrow">Contact</p>
      <h1 className="mt-4 font-display text-display font-bold">Talk to us</h1>
      <div className="mt-14 grid gap-px bg-line md:grid-cols-3">
        <section className="bg-ivory p-8">
          <h2 className="eyebrow">Visit</h2>
          <address className="mt-4 text-lg not-italic leading-relaxed">
            {BUSINESS.displayName}
            {formattedAddress().map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </address>
          <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener noreferrer" className="link-draw mt-4 inline-block text-sm font-medium">
            Open in Google Maps ↗
          </a>
        </section>
        <section className="bg-ivory p-8">
          <h2 className="eyebrow">Call</h2>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-sm text-muted">Office</dt>
              <dd>
                <a href={BUSINESS.phone.href} className="font-display font-semibold text-3xl">
                  {BUSINESS.phone.display}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Customer care · {BUSINESS.customerCare.hours}</dt>
              <dd>
                <a href={BUSINESS.customerCare.href} className="font-display font-semibold text-3xl">
                  {BUSINESS.customerCare.display}
                </a>
              </dd>
            </div>
          </dl>
        </section>
        <section className="bg-ivory p-8">
          <h2 className="eyebrow">Write</h2>
          <a href={`mailto:${BUSINESS.email}`} className="mt-4 block break-all font-display font-semibold text-2xl">
            {BUSINESS.email}
          </a>
          <p className="mt-2 text-sm text-muted">Contact timing: {BUSINESS.contactHours}</p>
          <ul className="mt-6 flex gap-5 text-sm">
            {BUSINESS.social.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="link-draw">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="mt-14 flex flex-col items-start gap-4 border border-line bg-paper p-8 md:flex-row md:items-center md:justify-between">
        <p className="max-w-xl text-ink-soft">For bulk orders and quotations, the wholesale enquiry form reaches our sales team directly and gives you a reference number.</p>
        <ButtonLink href="/wholesale#enquire">Send a wholesale enquiry</ButtonLink>
      </div>
    </Container>
  );
}
