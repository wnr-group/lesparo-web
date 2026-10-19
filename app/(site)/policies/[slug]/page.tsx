import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Alert, Container } from "@/components/ui/primitives";
import { POLICIES } from "@/lib/policies";

export function generateStaticParams() {
  return POLICIES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const policy = POLICIES.find((p) => p.slug === slug);
  return { title: policy?.title ?? "Policy", alternates: { canonical: `/policies/${slug}` } };
}

async function PolicyBody({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = POLICIES.find((p) => p.slug === slug);
  if (!policy) notFound();
  return (
    <article className="max-w-prose">
      <p className="eyebrow">Policies</p>
      <h1 className="mt-4 font-display text-headline font-bold">{policy.title}</h1>
      {policy.status === "pending" && (
        <div className="mt-8">
          <Alert tone="info" title="This page is being finalised">
            The full policy is awaiting approval. For anything not covered here, please{" "}
            <Link href="/contact" className="underline">
              contact us
            </Link>
            .
          </Alert>
        </div>
      )}
      {policy.status === "verified" && <p className="mt-4 text-sm text-muted">From the existing LESPARO website, lightly copy-edited for grammar.</p>}
      <div className="mt-10 space-y-8">
        {policy.sections.map((s, i) => (
          <section key={i}>
            {s.heading && <h2 className="font-display font-semibold text-2xl">{s.heading}</h2>}
            {s.body.map((p) => (
              <p key={p} className="mt-3 leading-relaxed text-ink-soft">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}

export default function PolicyPage(props: PageProps<"/policies/[slug]">) {
  return (
    <Container className="py-16 lg:py-24">
      <Suspense fallback={<div className="h-64" />}>
        <PolicyBody params={props.params} />
      </Suspense>
    </Container>
  );
}
