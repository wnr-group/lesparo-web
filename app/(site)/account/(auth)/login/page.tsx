import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/account/auth-card";
import { LoginForm } from "@/components/account/auth-forms";
import { Alert } from "@/components/ui/primitives";
import { getCustomer, safeNext } from "@/lib/auth/customer";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

async function Login({ searchParams }: { searchParams: PageProps<"/account/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  if (await getCustomer()) redirect(next);
  const notice = sp.verified ? "Your email is verified. You can sign in now." : sp.reset ? "Your password was updated. Sign in with the new one." : sp.emailchanged ? "Your email address was updated. Sign in with it." : null;
  return (
    <AuthCard
      title="Sign in"
      intro="Welcome back. Sign in to see your orders and saved addresses."
      footer={
        <>
          New here?{" "}
          <Link href="/account/register" className="font-semibold text-indigo hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {notice && (
        <div className="mb-5">
          <Alert tone="success">{notice}</Alert>
        </div>
      )}
      <LoginForm next={typeof sp.next === "string" ? next : undefined} />
    </AuthCard>
  );
}

export default function LoginPage(props: PageProps<"/account/login">) {
  return (
    <Suspense fallback={<div className="mx-auto my-20 h-96 max-w-5xl animate-pulse bg-paper" />}>
      <Login searchParams={props.searchParams} />
    </Suspense>
  );
}
