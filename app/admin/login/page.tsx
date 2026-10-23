"use client";

import Image from "next/image";
import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, {} as LoginState);
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Image src="/lesparo-logo.png" alt="LESPARO" width={678} height={446} className="mx-auto h-16 w-auto" priority />
        <h1 className="mt-8 text-center font-display font-semibold text-3xl">Staff sign in</h1>
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
            <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email ?? "admin@lesparo.com"} className="field" />
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
        </form>
        <p className="mt-4 text-center text-xs text-muted">Accounts are created by an administrator.</p>
      </div>
    </main>
  );
}
