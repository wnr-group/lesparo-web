import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoopVideo } from "@/components/site/loop-video";
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
    <article>
      <p className="eyebrow">Policies</p>
      <h1 className="mt-4 max-w-3xl font-display text-headline font-bold">{policy.title}</h1>
      {policy.status === "pending" && (
        <div className="mt-8 max-w-prose">
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
      {slug === "quality" && (
        <div className="mt-10">
          {/* Cotton, the loom, a waistband, folded garments, a boy at play, and the line "Crafted in Erode. Made for You." */}
          <LoopVideo src="/videos/making-of.mp4" label="How LESPARO is made: crafted in Erode" className="aspect-[16/9] lg:aspect-[21/9]" />
        </div>
      )}
      <div className="mt-12 border-t border-line">
        {policy.sections.map((s, i) => (
          <section key={i} className="grid gap-4 border-b border-line py-8 lg:grid-cols-12 lg:gap-10 lg:py-10">
            {s.heading ? <h2 className="font-display text-2xl font-semibold lg:col-span-4">{s.heading}</h2> : <span className="hidden lg:col-span-4 lg:block" />}
            <div className="max-w-prose lg:col-span-8">
              {s.body.map((p, j) => (
                <p key={p} className={`leading-relaxed text-ink-soft ${j ? "mt-3" : ""}`}>
                  {p}
                </p>
              ))}
            </div>
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
