import { BadgePercent, Building2, CheckCircle2, FileText, Headset, Mail, Phone, ShieldCheck, Truck } from "lucide-react";
import { LoopVideo } from "@/components/site/loop-video";
import { ButtonLink } from "@/components/ui/button";
import { BUSINESS } from "@/lib/business";

const BENEFITS = [
  { icon: BadgePercent, title: "Wholesale prices", text: "Request our B2B price list for retailers, showrooms and wholesalers." },
  { icon: FileText, title: "Quotations for your quantities", text: "Tell us what you need and receive a written quotation from our sales team." },
  { icon: Truck, title: "Direct from the maker", text: "Garments, lungis, kavi dhothies, towels and kerchiefs made in Erode." },
  { icon: Headset, title: "A team you can call", text: "Reach our sales team by phone or email and speak to people who know the range." },
  { icon: ShieldCheck, title: "Quality you can rely on", text: "Quality and replacement policies backed by Abija Exports." },
  { icon: Building2, title: "Supplying since 1979", text: "Showrooms across Tamil Nadu, Kerala and Karnataka buy from us." },
];

const STEPS = [
  ["Tell us about your shop", "Enter your shop name and GST number to begin."],
  ["Add your requirement", "Contact details, the products you stock and rough quantities."],
  ["Request the B2B price list", "Send the form. You get a reference number straight away."],
  ["We get back to you", "Our sales team sends the price list and a quotation if you asked for one."],
];

/** The promotional top of /wholesale: hero (with the textile journey film), why buy from us, and how the request works. The form follows on the page. */
export function WholesaleLanding() {
  return (
    <>
      {/* Hero: the textile journey film as the background, copy on top. */}
      <section className="relative isolate overflow-hidden bg-indigo-deep text-white">
        {/* The film covers the whole hero. It plays only while on screen and has its own pause button. */}
        <div className="absolute inset-0">
          <LoopVideo src="/videos/textile-journey.mp4" label="LESPARO's textile journey: Erode, since 1979" className="size-full" />
        </div>
        {/* Keeps the text readable over any frame: strong on the left and on small screens, lighter on the right. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-deep/95 via-indigo-deep/75 to-indigo-deep/35 max-lg:from-indigo-deep/90 max-lg:to-indigo-deep/70" />
        <div className="pointer-events-none relative mx-auto flex min-h-[34rem] max-w-page items-center px-4 py-16 sm:px-6 lg:min-h-[40rem] lg:px-10 lg:py-24">
          <div className="pointer-events-auto max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-sun ring-1 ring-white/20">
              <Building2 className="size-3.5" aria-hidden /> B2B sales
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.1rem,1.4rem+3vw,3.6rem)] font-extrabold leading-[1.04] tracking-tight">
              Wholesale for <span className="text-sun">retailers and showrooms.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">
              Abija Exports has supplied showrooms, retailers and wholesalers across South India from Erode since 1979. Send your shop details and we will share our B2B price list.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="#enquire" variant="accent" size="lg">
                <FileText className="size-4" aria-hidden /> Request B2B Price List
              </ButtonLink>
              <a href={BUSINESS.phone.href} className="inline-flex h-13 items-center gap-2 rounded-full border border-white/40 px-7 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                <Phone className="size-4" aria-hidden /> {BUSINESS.phone.display}
              </a>
            </div>
            <p className="mt-4 text-sm text-white/60">Keep your GST number handy. Shopping as a customer is not affected.</p>
            <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/85">
              {["Since 1979, Erode", "Quality and replacement policy", "Direct from the maker"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-sun" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* Why buy from us */}
      <section aria-labelledby="b2b-benefits" className="mx-auto max-w-page px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">Why buy from us</p>
          <h2 id="b2b-benefits" className="mt-3 font-display text-[clamp(1.8rem,1.2rem+2.2vw,3rem)] font-extrabold leading-tight tracking-tight">
            What you get as a business buyer.
          </h2>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} data-reveal="up" style={{ ["--delay" as string]: `${i * 60}ms` }} className="rounded-2xl border border-line bg-plate p-6 transition-shadow hover:shadow-[0_20px_40px_-24px_rgb(18_22_76/0.35)]">
              <span className="grid size-12 place-items-center rounded-2xl bg-indigo-soft">
                <Icon className="size-5 text-indigo" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-xl font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section aria-labelledby="b2b-steps" className="bg-mist">
        <div className="mx-auto max-w-page px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 id="b2b-steps" className="mt-3 font-display text-[clamp(1.8rem,1.2rem+2.2vw,3rem)] font-extrabold leading-tight tracking-tight">
              Four steps to your price list.
            </h2>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, text], i) => (
              <li key={title} data-reveal="up" style={{ ["--delay" as string]: `${i * 80}ms` }} className="relative rounded-2xl bg-white p-6 shadow-sm">
                <span className="grid size-10 place-items-center rounded-full bg-indigo font-display text-lg font-bold text-white">{i + 1}</span>
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}

/** Closing panel after the form: talk to the sales team. */
export function WholesaleContact() {
  return (
    <section aria-labelledby="b2b-cta" className="mx-auto max-w-page px-4 pb-16 sm:px-6 lg:px-10 lg:pb-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-indigo-deep px-6 py-12 text-white sm:px-12 lg:px-16 lg:py-16">
        <div aria-hidden className="absolute -bottom-24 -left-16 size-80 rounded-full bg-sun/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <h2 id="b2b-cta" className="font-display text-[clamp(1.8rem,1.2rem+2.2vw,3rem)] font-extrabold leading-tight tracking-tight">
              Prefer to talk it through?
            </h2>
            <p className="mt-4 max-w-xl text-white/75">Call or email our sales team. We can walk you through the range, minimum quantities and delivery.</p>
          </div>
          <div className="space-y-3 rounded-2xl bg-white/10 p-6 text-sm ring-1 ring-white/15">
            <p className="font-display text-lg font-bold">Talk to our sales team</p>
            <a href={BUSINESS.phone.href} className="flex items-center gap-3 text-white/85 hover:text-white">
              <Phone className="size-4 text-sun" aria-hidden /> {BUSINESS.phone.display}
            </a>
            <a href={BUSINESS.customerCare.href} className="flex items-center gap-3 text-white/85 hover:text-white">
              <Headset className="size-4 text-sun" aria-hidden /> {BUSINESS.customerCare.display} ({BUSINESS.customerCare.hours})
            </a>
            <a href={`mailto:${BUSINESS.email}`} className="flex items-center gap-3 text-white/85 hover:text-white">
              <Mail className="size-4 text-sun" aria-hidden /> {BUSINESS.email}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
