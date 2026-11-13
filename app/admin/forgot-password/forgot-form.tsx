"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ForgotState } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {} as ForgotState);
  if (state.sent) {
    return (
      <div className="mt-8 space-y-4 border border-line bg-paper p-6 text-sm">
        <p>If that email belongs to a staff account, a reset link is on its way. It works once and expires soon.</p>
        <Link href="/admin/login" className="text-indigo underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="mt-8 space-y-4 border border-line bg-paper p-6">
      {state.error && (
        <p role="alert" className="border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email ?? ""} className="field" />
      </div>
      <button type="submit" disabled={pending} className="h-11 w-full bg-indigo text-sm font-medium text-paper hover:bg-indigo-deep disabled:opacity-60">
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-sm">
        <Link href="/admin/login" className="text-muted underline-offset-2 hover:text-indigo hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
