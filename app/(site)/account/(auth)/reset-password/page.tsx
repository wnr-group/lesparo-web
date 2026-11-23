import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthCard } from "@/components/account/auth-card";
import { ResetPasswordForm } from "@/components/account/auth-forms";
import { Alert } from "@/components/ui/primitives";
import { tokenIsLive } from "@/lib/services/customer-auth";

// The URL carries a one-time token: keep it out of search results and Referer headers.
export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false }, referrer: "no-referrer" };

async function Reset({ searchParams }: { searchParams: PageProps<"/account/reset-password">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const live = token.length >= 20 && token.length <= 200 && (await tokenIsLive(token, "reset_password"));
  return (
    <AuthCard
      title="Choose a new password"
      footer={
        <Link href="/account/login" className="font-semibold text-indigo hover:underline">
          Back to sign in
        </Link>
      }
    >
      {live ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4">
          <Alert tone="danger">This reset link is invalid or has expired.</Alert>
          <Link href="/account/forgot-password" className="inline-block text-sm font-semibold text-indigo hover:underline">
            Request a new link
          </Link>
        </div>
      )}
    </AuthCard>
  );
}

export default function ResetPasswordPage(props: PageProps<"/account/reset-password">) {
  return (
    <Suspense fallback={<div className="mx-auto my-20 h-96 max-w-5xl animate-pulse bg-paper" />}>
      <Reset searchParams={props.searchParams} />
    </Suspense>
  );
}
