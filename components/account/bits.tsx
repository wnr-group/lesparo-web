"use client";

import clsx from "clsx";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import type { AccountState } from "@/app/(site)/account/actions";

type InputA11y = { id: string; "aria-invalid"?: true; "aria-describedby"?: string };

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: (p: InputA11y) => ReactNode }) {
  const fid = useId();
  const describedBy = [error ? `${fid}-error` : null, hint ? `${fid}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={fid} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children({ id: fid, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={`${fid}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fid}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** A labelled input wired to a form action's field errors. Text echoed back after an error comes from state.values; passwords never are. Optional leading icon; passwords get a show/hide toggle. */
export function TextField({ label, name, state, hint, className, icon, ...props }: { label: string; name: string; state: AccountState; hint?: string; icon?: ReactNode } & Omit<ComponentProps<"input">, "name">) {
  const isPassword = props.type === "password";
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={state.fields?.[name]} hint={hint}>
      {(a) => (
        <div className="relative">
          {icon && (
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted [&>svg]:size-[18px]">
              {icon}
            </span>
          )}
          <input
            {...a}
            {...props}
            type={isPassword && show ? "text" : props.type}
            name={name}
            defaultValue={isPassword ? undefined : (state.values?.[name] ?? props.defaultValue)}
            className={clsx("field field-soft !h-12 !rounded-xl", icon && "!pl-11", isPassword && "!pr-12", className)}
          />
          {isPassword && (
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-linen hover:text-ink">
              {show ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
            </button>
          )}
        </div>
      )}
    </Field>
  );
}

export function Submit({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

/** Success or error banner for a form's last result. */
export function Result({ state }: { state: AccountState }) {
  if (!state.message) return null;
  return <Alert tone={state.ok ? "success" : "danger"}>{state.message}</Alert>;
}
