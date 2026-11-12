import Image from "next/image";
import { Suspense } from "react";
import { requireStaffPage } from "@/lib/auth/staff";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/staff-core";
import { ResetForm } from "./reset-form";

/** Needs the short session created by the reset link (proxy.ts also requires a session for this path). */
async function Gate() {
  await requireStaffPage();
  return <ResetForm minLength={MIN_PASSWORD_LENGTH} />;
}

export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Image src="/lesparo-logo-v3.png" alt="LESPARO" width={875} height={460} className="mx-auto h-16 w-auto" priority />
        <h1 className="mt-8 text-center font-display font-semibold text-3xl">Choose a new password</h1>
        <Suspense fallback={<div className="mt-8 h-72 border border-line bg-paper" />}>
          <Gate />
        </Suspense>
      </div>
    </main>
  );
}
