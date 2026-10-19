import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "About LESPARO",
  description: "From R. Yuvaraj in 1979 to Abija Exports and LESPARO in 2017: four decades of textiles from Erode, Tamil Nadu.",
  alternates: { canonical: "/about" },
};

// Source: lesparo.com Company History and Trademark pages (crawled 2026-10-19).
const HISTORY = [
  {
    year: "1979",
    title: "R. Yuvaraj, Erode",
    body: "Mr. Yuvaraj founded R. Yuvaraj in Erode, Tamil Nadu, known for lungis, dhoties and mull cloth supplied to Kerala.",
  },
  {
    year: "1999",
    title: "The next generation",
    body: "His son, Y. Sathish, joined the business after completing a degree in business administration and led its growth and expansion.",
  },
  {
    year: "2001",
    title: "Y. Sathish & Co.",
    body: "Y. Sathish started Y. Sathish & Co. with churidar materials, Kerala special dhoties and Kerala sarees, serving showrooms, chain stores and wholesalers in Kerala and Tamil Nadu.",
  },
  {
    year: "2017",
    title: "Abija Exports and LESPARO",
    body: "Following his own market survey, he launched Abija Exports — the unit behind the LESPARO brand — making knitted and woven unisex and kids’ casual wear: shorts, 3/4th pants and track suits for leisure, sports and ethnic wear.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-line">
        <Container className="py-16 lg:py-24">
          <p className="eyebrow">About LESPARO</p>
          <h1 className="mt-4 max-w-4xl font-display text-display font-bold">Forty years of textiles from Erode.</h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-soft">
            Built on four decades of hands-on textile experience, LESPARO today supplies textile showrooms across Tamil Nadu, Kerala and Karnataka, with the aim of taking the brand across India.
          </p>
          <blockquote className="mt-12 max-w-2xl border-l-2 border-brass pl-6 font-display font-semibold text-title text-indigo">
            “Customer goodwill and quality assurance are the backbone of this company.”
          </blockquote>
        </Container>
      </section>

      <section className="py-16 lg:py-24">
        <Container>
          <h2 className="sr-only">Company history</h2>
          <ol className="grid gap-px bg-line md:grid-cols-2">
            {HISTORY.map((h) => (
              <li key={h.year} data-reveal="up" className="bg-ivory p-8 lg:p-12">
                <p className="font-display text-6xl font-semibold text-indigo lg:text-7xl">{h.year}</p>
                <h3 className="mt-6 font-display font-semibold text-2xl">{h.title}</h3>
                <p className="mt-3 max-w-prose leading-relaxed text-ink-soft">{h.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section id="trademark" className="scroll-mt-24 border-t border-line bg-paper py-16">
        <Container className="grid gap-8 md:grid-cols-[1fr_2fr]">
          <h2 className="font-display font-semibold text-title">Trademark</h2>
          <div className="text-ink-soft">
            <p>
              LESPARO is a device trademark filed on 26 August 2017 through the Chennai IP office, registered to Y. Sathish, trading as Abija Exports.
            </p>
            <dl className="mt-6 grid grid-cols-[10rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted">Application ID</dt>
              <dd>3620885</dd>
              <dt className="text-muted">Class</dt>
              <dd>25 (clothing)</dd>
              <dt className="text-muted">Status (as listed)</dt>
              <dd>Accepted &amp; advertised</dd>
            </dl>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <p className="font-display font-semibold text-title">Sourcing for your store?</p>
          <ButtonLink href="/wholesale" size="lg">
            Wholesale enquiries
          </ButtonLink>
        </Container>
      </section>
    </>
  );
}
