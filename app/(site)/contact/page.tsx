import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { CollectionBanner } from "@/components/site/collection-banner";
import { SplitWords } from "@/components/site/split-words";
import { ButtonLink } from "@/components/ui/button";
import { BUSINESS, formattedAddress } from "@/lib/business";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact LESPARO — Abija Exports, NMS Compound, Erode Fort, Erode 638001. Phone 094430 22044, customer care 93425 46046.",
  alternates: { canonical: "/contact" },
};

const link = "hline font-semibold";

export default function ContactPage() {
  const mapQuery = encodeURIComponent(`${BUSINESS.displayName}, ${formattedAddress().join(", ")}`);
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  return (
    <>
      <CollectionBanner slug="contact">
        <p className="text-sm text-white/60">Contact</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,1.2rem+2.6vw,3.4rem)] font-extrabold uppercase leading-[0.98] tracking-tight">
          <SplitWords onLoad>Talk to us</SplitWords>
        </h1>
        <p className="mt-4 max-w-sm text-white/70">Visit, call or write. We’re happy to help.</p>
      </CollectionBanner>

      <section aria-label="Ways to reach LESPARO" className="mx-auto max-w-page px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          <div data-reveal="up" className="border-t-2 border-ink pt-5">
            <Phone aria-hidden className="size-5" />
            <h2 className="mt-3 font-display text-lg font-bold uppercase tracking-tight">Call</h2>
            <dl className="mt-3 space-y-4 text-[0.95rem]">
              <div>
                <dt className="text-muted">Office</dt>
                <dd>
                  <a href={BUSINESS.phone.href} className={`${link} text-xl`}>
                    {BUSINESS.phone.display}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-muted">Customer care · {BUSINESS.customerCare.hours}</dt>
                <dd>
                  <a href={BUSINESS.customerCare.href} className={`${link} text-xl`}>
                    {BUSINESS.customerCare.display}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <div data-reveal="up" style={{ ["--delay" as string]: "80ms" }} className="border-t-2 border-ink pt-5">
            <Mail aria-hidden className="size-5" />
            <h2 className="mt-3 font-display text-lg font-bold uppercase tracking-tight">Write</h2>
            <p className="mt-3">
              <a href={`mailto:${BUSINESS.email}`} className={`${link} break-all text-lg`}>
                {BUSINESS.email}
              </a>
            </p>
            <p className="mt-1 text-[0.95rem] text-muted">Contact timing: {BUSINESS.contactHours}</p>
            <ul className="mt-5 flex gap-5 text-sm font-semibold">
              {BUSINESS.social.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1">
                    <span className="hline">{s.label}</span>
                    <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:rotate-45" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div data-reveal="up" style={{ ["--delay" as string]: "160ms" }} className="border-t-2 border-ink pt-5">
            <MapPin aria-hidden className="size-5" />
            <h2 className="mt-3 font-display text-lg font-bold uppercase tracking-tight">Visit</h2>
            <address className="mt-3 text-[0.95rem] not-italic leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">{BUSINESS.displayName}</span>
              {formattedAddress().map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </address>
            <a href={mapHref} target="_blank" rel="noopener noreferrer" className="group mt-4 inline-flex items-center gap-1 text-sm font-semibold">
              <span className="hline">Open in Google Maps</span>
              <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:rotate-45" aria-hidden />
            </a>
          </div>
        </div>

        <div data-reveal="up" className="mt-14 flex flex-col items-start justify-between gap-5 bg-[#f2f3f5] p-6 sm:flex-row sm:items-center sm:p-8">
          <p className="max-w-xl text-ink-soft">For bulk orders and quotations, the wholesale enquiry form reaches our sales team directly and gives you a reference number.</p>
          <ButtonLink href="/wholesale#enquire">Send a wholesale enquiry</ButtonLink>
        </div>
      </section>
    </>
  );
}
