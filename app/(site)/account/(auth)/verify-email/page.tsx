import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthCard } from "@/components/account/auth-card";
import { ConfirmEmailForm } from "@/components/account/auth-forms";
import { Alert } from "@/components/ui/primitives";
import { tokenIsLive } from "@/lib/services/customer-auth";

export const metadata: Metadata = { title: "Verify email", robots: { index: false, follow: false }, referrer: "no-referrer" };

async function Verify({ searchParams }: { searchParams: PageProps<"/account/verify-email">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const sane = token.length >= 20 && token.length <= 200;
  // Opening the page only checks the link; the button below is what uses it up, so mail scanners that open links cannot spend it.
  const live = sane && ((await tokenIsLive(token, "verify_email")) || (await tokenIsLive(token, "change_email")));
  return (
    <AuthCard title="Confirm your email" eyebrow="Email verification">
      {live ? (
        <div className="space-y-5">
          <p className="text-ink-soft">One last step. Confirm this email address to finish.</p>
          <ConfirmEmailForm token={token} />
        </div>
      ) : (
        <div className="space-y-4">
          <Alert tone="danger">This link is invalid, has already been used, or has expired.</Alert>
          <p className="text-sm text-ink-soft">Sign in with your email and password and we can send you a fresh verification link.</p>
          <Link href="/account/login" className="inline-block text-sm font-semibold text-indigo hover:underline">
            Go to sign in
          </Link>
        </div>
      )}
    </AuthCard>
  );
}

export default function VerifyEmailPage(props: PageProps<"/account/verify-email">) {
  return (
    <Suspense fallback={<div className="mx-auto my-20 h-96 max-w-5xl animate-pulse bg-paper" />}>
      <Verify searchParams={props.searchParams} />
    </Suspense>
  );
}
