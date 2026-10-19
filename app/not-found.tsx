import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 font-display text-headline font-bold">This page has moved or no longer exists.</h1>
      <p className="mt-4 max-w-md text-ink-soft">Our catalogue has a new home. Try the collections, or search for what you need.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/shop">Browse all products</ButtonLink>
        <ButtonLink href="/collections" variant="secondary">
          Collections
        </ButtonLink>
      </div>
      <Link href="/" className="link-draw mt-8 text-sm text-muted">
        Back to home
      </Link>
    </main>
  );
}
