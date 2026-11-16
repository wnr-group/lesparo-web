import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/account/auth-card";
import { RegisterForm } from "@/components/account/auth-forms";
import { getCustomer } from "@/lib/auth/customer";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

async function Register() {
  if (await getCustomer()) redirect("/account");
  return (
    <AuthCard
      title="Create your account"
      intro="It takes a minute. We will email a link to confirm your address."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/account/login" className="font-semibold text-indigo hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="mx-auto my-20 h-96 max-w-5xl animate-pulse bg-paper" />}>
      <Register />
    </Suspense>
  );
}
