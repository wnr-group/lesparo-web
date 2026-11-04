"use client";

import { Loader2 } from "lucide-react";
import { createContext, use, useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";

type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const FieldErrors = createContext<Record<string, string>>({});

/**
 * Wraps a server action in a form with pending, success and error feedback.
 * `action` is a server action already bound to its record id.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  successMessage = "Saved.",
  resetOnSuccess = false,
  className,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  // The success message hides 4s after each result; a new result shows it again.
  const [dismissed, setDismissed] = useState<ActionState | null>(null);
  const shown = dismissed !== state;

  useEffect(() => {
    if (state.ok && resetOnSuccess) formRef.current?.reset();
    const t = setTimeout(() => setDismissed(state), 4000);
    return () => clearTimeout(t);
  }, [state, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      <FieldErrors value={state.fields ?? {}}>{children}</FieldErrors>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {submitLabel}
        </button>
        <span role="status" className="text-sm">
          {shown && state.ok && <span className="text-success">{successMessage}</span>}
          {state.error && <span className="text-danger">{state.error}</span>}
        </span>
      </div>
    </form>
  );
}

/** Inline error for a named field inside an ActionForm. */
export function FieldError({ name }: { name: string }) {
  const error = use(FieldErrors)[name];
  return error ? <p className="mt-1 text-xs text-danger">{error}</p> : null;
}

export function ActionButton({
  action,
  children,
  confirmText,
  variant = "secondary",
}: {
  action: () => Promise<ActionState>;
  children: ReactNode;
  confirmText?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);
  const [confirming, setConfirming] = useState(false);

  const run = () =>
    start(async () => {
      setConfirming(false);
      setResult(await action());
    });

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {confirming ? (
        <>
          <span className="text-sm">{confirmText}</span>
          <button type="button" onClick={run} className={buttonClass(variant === "danger" ? "danger" : "primary", "sm")}>
            Confirm
          </button>
          <button type="button" onClick={() => setConfirming(false)} className={buttonClass("ghost", "sm")}>
            Cancel
          </button>
        </>
      ) : (
        <button type="button" disabled={pending} onClick={() => (confirmText ? setConfirming(true) : run())} className={buttonClass(variant, "sm")}>
          {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {children}
        </button>
      )}
      {result?.error && <span className="text-xs text-danger">{result.error}</span>}
      {result?.ok && <span className="text-xs text-success">Done.</span>}
    </span>
  );
}
