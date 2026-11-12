import Image from "next/image";
import { ForgotForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Image src="/lesparo-logo-v3.png" alt="LESPARO" width={875} height={460} className="mx-auto h-16 w-auto" priority />
        <h1 className="mt-8 text-center font-display font-semibold text-3xl">Reset your password</h1>
        <p className="mt-3 text-center text-sm text-muted">Enter your staff email and we will send you a reset link.</p>
        <ForgotForm />
      </div>
    </main>
  );
}
