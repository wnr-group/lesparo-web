"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {} as LoginState);
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
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      <button type="submit" disabled={pending} className="h-11 w-full bg-indigo text-sm font-medium text-paper hover:bg-indigo-deep disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm">
        <Link href="/admin/forgot-password" className="text-muted underline-offset-2 hover:text-indigo hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
