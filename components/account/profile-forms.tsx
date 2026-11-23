"use client";

import { useActionState } from "react";
import { changeEmailAction, changePasswordAction, updateProfileAction, type AccountState } from "@/app/(site)/account/actions";
import { Result, Submit, TextField } from "./bits";

const idle: AccountState = {};

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action] = useActionState(updateProfileAction, idle);
  return (
    <form action={action} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Full name" name="name" autoComplete="name" required defaultValue={name} state={state} />
        <TextField label="Mobile number" name="phone" type="tel" autoComplete="tel" required defaultValue={phone} state={state} />
      </div>
      <Result state={state} />
      <Submit>Save changes</Submit>
    </form>
  );
}

export function EmailForm({ email }: { email: string }) {
  const [state, action] = useActionState(changeEmailAction, idle);
  return (
    <form action={action} className="space-y-5" noValidate>
      <p className="text-sm text-ink-soft">
        Your sign-in email is <strong>{email}</strong>. To change it, confirm with your password. We will email a link to the new address, and nothing changes until you open it.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="New email" name="email" type="email" autoComplete="off" required state={state} />
        <TextField label="Current password" name="currentPassword" type="password" autoComplete="current-password" required state={state} />
      </div>
      <Result state={state} />
      <Submit>Send confirmation</Submit>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, idle);
  return (
    <form action={action} className="space-y-5" noValidate>
      <TextField label="Current password" name="currentPassword" type="password" autoComplete="current-password" required state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="New password" name="newPassword" type="password" autoComplete="new-password" required state={state} hint="At least 8 characters, with a letter and a number." />
        <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required state={state} />
      </div>
      <Result state={state} />
      <Submit>Update password</Submit>
    </form>
  );
}
