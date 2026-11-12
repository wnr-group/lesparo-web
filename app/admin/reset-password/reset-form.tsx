"use client";

import { useActionState } from "react";
import { resetPassword, type ResetState } from "./actions";

export function ResetForm({ minLength }: { minLength: number }) {
  const [state, action, pending] = useActionState(resetPassword, {} as ResetState);
  return (
    <form action={action} className="mt-8 space-y-4 border border-line bg-paper p-6">
      {state.error && (
        <p role="alert" className="border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          New password
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={minLength} className="field" />
        <p className="mt-1 text-xs text-muted">At least {minLength} characters.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium">
          Confirm new password
        </label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={minLength} className="field" />
      </div>
      <button type="submit" disabled={pending} className="h-11 w-full bg-indigo text-sm font-medium text-paper hover:bg-indigo-deep disabled:opacity-60">
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
