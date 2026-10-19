"use client";

import { useEffect } from "react";
import { BUSINESS } from "@/lib/business";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-4 font-display text-headline font-bold">We couldn’t load this page.</h1>
      <p className="mt-4 text-ink-soft">
        Please try again. If it keeps happening, call us on{" "}
        <a href={BUSINESS.phone.href} className="underline">
          {BUSINESS.phone.display}
        </a>
        .
      </p>
      {error.digest && <p className="mt-2 text-xs text-muted">Reference: {error.digest}</p>}
      <button type="button" onClick={reset} className="mt-8 h-11 bg-indigo px-6 text-sm text-paper hover:bg-indigo-deep">
        Try again
      </button>
    </div>
  );
}
