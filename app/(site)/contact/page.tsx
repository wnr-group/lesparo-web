import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { CollectionBanner } from "@/components/site/collection-banner";
import { Magnetic } from "@/components/site/pointer-fx";
import { SplitWords } from "@/components/site/split-words";
import { ButtonLink } from "@/components/ui/button";
import { BUSINESS, formattedAddress } from "@/lib/business";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact LESPARO — Abija Exports, NMS Compound, Erode Fort, Erode 638001. Phone 094430 22044, customer care 93425 46046.",
  alternates: { canonical: "/contact" },
};

/** One way to reach us: a number, a large line of type that is the action itself, and the small print under it. */
function Row({ n, icon: Icon, label, children, action }: { n: string; icon: typeof Phone; label: string; children: React.ReactNode; action: React.ReactNode }) {
  return (
    <li data-reveal="up" className="group grid gap-4 py-8 lg:grid-cols-[6rem_1fr_auto] lg:items-center lg:gap-10 lg:py-12">
      <p className="flex items-center gap-3 font-display text-sm font-bold tabular-nums text-muted lg:block">
        {n}
        <Icon aria-hidden className="size-5 text-ink lg:mt-3" />
        <span className="sr-only">{label}</span>
      </p>
      <div>
        <h2 className="eyebrow">{label}</h2>
        <div className="mt-3">{children}</div>
      </div>
      <div className="lg:justify-self-end">{action}</div>
    </li>
  );
}

const big = "hline font-display text-[clamp(2rem,1rem+4.4vw,4.6rem)] font-extrabold leading-[1.02] tracking-tight";
const pill = "inline-flex h-12 items-center gap-2 rounded-full border border-ink/20 px-6 text-sm font-bold transition-colors group-hover:bg-ink group-hover:text-white";

export default function ContactPage() {
  const mapQuery = encodeURIComponent(`${BUSINESS.displayName}, ${formattedAddress().join(", ")}`);
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  return (
    <>
      <CollectionBanner slug="contact">
        <nav aria-label="Breadcrumb" className="text-sm text-white/60">
          Contact
        </nav>
        <h1 className="mt-4 font-display text-[clamp(2.6rem,1.4rem+5vw,6rem)] font-extrabold uppercase leading-[0.92] tracking-tight">
          <SplitWords onLoad>Talk to us.</SplitWords>
        </h1>
        <p className="mt-5 max-w-md text-white/70">
          Visit, call or write. Customer care is open {BUSINESS.customerCare.hours}; the office takes messages {BUSINESS.contactHours}.
        </p>
      </CollectionBanner>

      <section aria-label="Ways to reach LESPARO" className="mx-auto max-w-page px-4 sm:px-6 lg:px-10">
        <ul className="divide-y divide-ink/15 border-b border-ink/15">
          <Row
            n="01"
            icon={Phone}
            label="Call"
            action={
              <a href={BUSINESS.phone.href} className={pill}>
                Call the office <ArrowUpRight className="size-4" aria-hidden />
              </a>
            }
          >
            <a href={BUSINESS.phone.href} className={big}>
              {BUSINESS.phone.display}
            </a>
            <p className="mt-3 text-sm text-muted">Office</p>
            <p className="mt-5">
              <a href={BUSINESS.customerCare.href} className="hline font-display text-[clamp(1.4rem,1rem+1.6vw,2.2rem)] font-bold tracking-tight">
                {BUSINESS.customerCare.display}
              </a>
            </p>
            <p className="mt-1 text-sm text-muted">Customer care · {BUSINESS.customerCare.hours}</p>
          </Row>

          <Row
            n="02"
            icon={Mail}
            label="Write"
            action={
              <a href={`mailto:${BUSINESS.email}`} className={pill}>
                Send an email <ArrowUpRight className="size-4" aria-hidden />
              </a>
            }
          >
            <a href={`mailto:${BUSINESS.email}`} className={`${big} break-all`}>
              {BUSINESS.email}
            </a>
            <p className="mt-3 text-sm text-muted">Contact timing: {BUSINESS.contactHours}</p>
          </Row>

          <Row
            n="03"
            icon={MapPin}
            label="Visit"
            action={
              <a href={mapHref} target="_blank" rel="noopener noreferrer" className={pill}>
                Open in Google Maps <ArrowUpRight className="size-4" aria-hidden />
              </a>
            }
          >
            <address className="not-italic">
              <span className={`${big} block`}>{BUSINESS.displayName}</span>
              <span className="mt-3 block text-lg leading-relaxed text-ink-soft">
                {formattedAddress().map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </span>
            </address>
          </Row>
        </ul>

        <ul aria-label="Follow LESPARO" className="flex flex-wrap items-center gap-x-8 gap-y-3 py-8 text-sm font-semibold">
          <li className="text-muted">Follow</li>
          {BUSINESS.social.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5">
                <span className="hline">{s.label}</span>
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:rotate-45" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Bulk orders go through the wholesale form, which gives a reference number. */}
      <section aria-labelledby="bulk-heading" className="mx-auto mt-6 max-w-page px-4 pb-20 sm:px-6 lg:px-10 lg:pb-28">
        <div className="grid items-center gap-8 bg-[#f2f3f5] px-6 py-12 sm:px-12 lg:grid-cols-[1.2fr_1fr] lg:gap-14 lg:px-16 lg:py-16">
          <div>
            <h2 id="bulk-heading" className="font-display text-[clamp(1.8rem,1.1rem+3vw,3.6rem)] font-extrabold uppercase leading-[0.98] tracking-tight">
              <SplitWords>Buying in bulk? Use the wholesale form.</SplitWords>
            </h2>
          </div>
          <div>
            <p data-reveal="up" className="leading-relaxed text-ink-soft">
              For bulk orders and quotations, the wholesale enquiry form reaches our sales team directly and gives you a reference number.
            </p>
            <div className="mt-6">
              <Magnetic>
                <ButtonLink href="/wholesale#enquire" size="lg">
                  Send a wholesale enquiry <ArrowUpRight className="size-4" aria-hidden />
                </ButtonLink>
              </Magnetic>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
