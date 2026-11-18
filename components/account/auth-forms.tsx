"use client";

import { Lock, Mail, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { confirmEmailAction, forgotPasswordAction, loginAction, registerAction, resendVerificationAction, resetPasswordAction, type AccountState } from "@/app/(site)/account/actions";
import { Result, Submit, TextField } from "./bits";

const idle: AccountState = {};

/** Offered after "please verify your email" so the customer is never stuck. */
function ResendForm({ email }: { email: string }) {
  const [state, action] = useActionState(resendVerificationAction, idle);
  return (
    <form action={action} className="border-t border-line pt-3">
      <input type="hidden" name="email" value={email} />
      {state.ok ? (
        <p className="text-sm text-success" role="status">
          {state.message}
        </p>
      ) : (
        <>
          <Submit className="h-9 px-4 text-[0.8rem]">Send the link again</Submit>
          {state.message && <p className="mt-2 text-xs text-danger">{state.message}</p>}
        </>
      )}
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, idle);
  return (
    <div className="space-y-5">
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <TextField label="Email" icon={<Mail />} name="email" type="email" autoComplete="email" required state={state} />
      <TextField label="Password" icon={<Lock />} name="password" type="password" autoComplete="current-password" required state={state} />
      <div className="text-right">
        <Link href="/account/forgot-password" className="text-sm font-medium text-indigo hover:underline">
          Forgot password?
        </Link>
      </div>
      <Result state={state} />
      <Submit className="h-13 w-full text-[0.95rem]">Sign in</Submit>
    </form>
    {state.code === "unverified" && state.values?.email && <ResendForm email={state.values.email} />}
    </div>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, idle);
  if (state.ok)
    return (
      <div role="status" className="space-y-4">
        <Result state={state} />
        <p className="text-sm text-ink-soft">Open the email we sent to {state.values?.email ?? "your inbox"} and tap the link to activate your account. It can take a minute to arrive, so check your spam folder too.</p>
        {state.values?.email && <ResendForm email={state.values.email} />}
        <Link href="/account/login" className="inline-block text-sm font-medium text-indigo hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  return (
    <form action={action} className="space-y-5" noValidate>
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <TextField label="Full name" icon={<UserRound />} name="name" autoComplete="name" required state={state} />
      <TextField label="Email" icon={<Mail />} name="email" type="email" autoComplete="email" required state={state} />
      <TextField label="Mobile number" icon={<Phone />} name="phone" type="tel" autoComplete="tel" inputMode="tel" required state={state} />
      <TextField label="Password" icon={<Lock />} name="password" type="password" autoComplete="new-password" required state={state} hint="At least 8 characters, with a letter and a number." />
      <Result state={state} />
      <Submit className="h-13 w-full text-[0.95rem]">Create account</Submit>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, idle);
  if (state.ok)
    return (
      <div role="status" className="space-y-4">
        <Result state={state} />
        <Link href="/account/login" className="inline-block text-sm font-medium text-indigo hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  return (
    <form action={action} className="space-y-5" noValidate>
      <TextField label="Email" icon={<Mail />} name="email" type="email" autoComplete="email" required state={state} />
      <Result state={state} />
      <Submit className="h-13 w-full text-[0.95rem]">Send reset link</Submit>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, idle);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <TextField label="New password" icon={<Lock />} name="password" type="password" autoComplete="new-password" required state={state} hint="At least 8 characters, with a letter and a number." />
      <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required state={state} />
      <Result state={state} />
      {state.message && !state.fields && (
        <Link href="/account/forgot-password" className="block text-sm font-medium text-indigo hover:underline">
          Request a new link
        </Link>
      )}
      <Submit className="h-13 w-full text-[0.95rem]">Update password</Submit>
    </form>
  );
}

export function ConfirmEmailForm({ token }: { token: string }) {
  const [state, action] = useActionState(confirmEmailAction, idle);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <Result state={state} />
      <Submit className="h-13 w-full text-[0.95rem]">Confirm email address</Submit>
      {state.message && (
        <Link href="/account/login" className="block text-center text-sm font-medium text-indigo hover:underline">
          Go to sign in
        </Link>
      )}
    </form>
  );
}
