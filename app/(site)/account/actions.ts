"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clientId } from "@/lib/auth/client-id";
import { CustomerAuthError, endCustomerSession, requireCustomer, safeNext, startCustomerSession } from "@/lib/auth/customer";
import { prisma } from "@/lib/db";
import { authenticateCustomer, changePassword, confirmEmailToken, registerCustomer, requestEmailChange, requestPasswordReset, resendVerification, resetPassword } from "@/lib/services/customer-auth";
import { deleteAddress, makeDefaultAddress, saveAddress } from "@/lib/services/customer-account";
import { fieldErrors } from "@/lib/services/enquiry-form";
import { addressSchema, changePasswordSchema, emailChangeSchema, forgotSchema, loginSchema, profileSchema, registerSchema, resetSchema, tokenSchema } from "@/lib/validation/customer";

export type AccountState = {
  ok?: boolean;
  message?: string;
  /** Machine-readable reason the page can react to (e.g. offer to resend a verification email). */
  code?: string;
  fields?: Record<string, string>;
  values?: Record<string, string>;
};

const INVALID = "Please check the highlighted fields.";

/** Text fields echoed back after an error. Passwords are never echoed. */
function echo(fd: FormData, names: string[]) {
  const values: Record<string, string> = {};
  for (const n of names) {
    const v = fd.get(n);
    if (typeof v === "string") values[n] = v.slice(0, 300);
  }
  return values;
}
const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

async function guard<T extends AccountState>(work: () => Promise<T>): Promise<T | AccountState> {
  try {
    return await work();
  } catch (err) {
    // redirect() works by throwing; let it through.
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw err;
    if (err instanceof CustomerAuthError) return { message: err.message, code: "signed_out" };
    console.error("[account]", err instanceof Error ? err.message : "unknown error");
    return { message: "Something went wrong. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// Signed-out flows
// ---------------------------------------------------------------------------

export async function registerAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  return guard(async () => {
    const parsed = registerSchema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      // A filled honeypot means a bot: respond as if accepted, store nothing.
      if (fields.website) return { ok: true, message: "Check your inbox to verify your email." };
      return { message: INVALID, fields, values: echo(fd, ["name", "email", "phone"]) };
    }
    const result = await registerCustomer(parsed.data, await clientId());
    if (!result.ok) return { message: result.message, fields: result.fields, values: echo(fd, ["name", "email", "phone"]) };
    return { ok: true, message: result.emailSent ? "Account created. We sent a verification link to your email." : "Account created, but we could not send the verification email just now. Use “Send the link again” on the sign-in page.", values: { email: parsed.data.email } };
  });
}

export async function loginAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const result = await guard(async () => {
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) return { message: "Enter your email and password.", fields: fieldErrors(parsed.error), values: echo(fd, ["email"]) };
    const auth = await authenticateCustomer(parsed.data, await clientId());
    if (!auth.ok) return { message: auth.message, code: auth.code, values: echo(fd, ["email"]) };
    await startCustomerSession(auth.id, auth.version);
    return { ok: true };
  });
  if (result.ok) redirect(safeNext(str(fd, "next")));
  return result;
}

export async function logoutAction() {
  await endCustomerSession();
  redirect("/account/login");
}

export async function resendVerificationAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  return guard(async () => {
    const parsed = forgotSchema.safeParse({ email: fd.get("email") });
    if (!parsed.success) return { message: "Enter the email address you signed up with.", fields: fieldErrors(parsed.error), values: echo(fd, ["email"]) };
    const result = await resendVerification(parsed.data.email, await clientId());
    if (!result.ok) return { message: result.message, values: echo(fd, ["email"]) };
    return { ok: true, message: "If that address has an account waiting for verification, a new link is on its way." };
  });
}

export async function forgotPasswordAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  return guard(async () => {
    const parsed = forgotSchema.safeParse({ email: fd.get("email") });
    if (!parsed.success) return { message: INVALID, fields: fieldErrors(parsed.error), values: echo(fd, ["email"]) };
    const result = await requestPasswordReset(parsed.data.email, await clientId());
    if (!result.ok) return { message: result.message, values: echo(fd, ["email"]) };
    return { ok: true, message: "If an account exists for that email, we have sent a link to reset the password. It is valid for one hour." };
  });
}

export async function resetPasswordAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const result = await guard(async () => {
    const parsed = resetSchema.safeParse({ token: fd.get("token"), password: fd.get("password") });
    if (!parsed.success) return { message: INVALID, fields: fieldErrors(parsed.error) };
    if (fd.get("confirm") !== parsed.data.password) return { message: INVALID, fields: { confirm: "The passwords do not match." } };
    const r = await resetPassword(parsed.data.token, parsed.data.password, await clientId());
    if (!r.ok) return { message: r.message };
    return { ok: true };
  });
  if (result.ok) redirect("/account/login?reset=1");
  return result;
}

/** Runs only on the button press on the verify page, never on page load, so mail scanners that open links cannot use the token up. */
export async function confirmEmailAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  const result = await guard(async () => {
    const parsed = tokenSchema.safeParse({ token: fd.get("token") });
    if (!parsed.success) return { message: "This link is invalid or has expired." };
    let r = await confirmEmailToken(parsed.data.token, "verify_email");
    if (!r.ok) {
      const alt = await confirmEmailToken(parsed.data.token, "change_email");
      if (alt.ok) r = alt;
    }
    if (!r.ok) return { message: r.message };
    return { ok: true, code: r.changed ? "changed" : "verified" };
  });
  if (result.ok) redirect(result.code === "changed" ? "/account/login?emailchanged=1" : "/account/login?verified=1");
  return result;
}

// ---------------------------------------------------------------------------
// Signed-in flows. The customer is always the session's customer; no id is read from the form.
// ---------------------------------------------------------------------------

export async function updateProfileAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  return guard(async () => {
    const me = await requireCustomer();
    const parsed = profileSchema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) return { message: INVALID, fields: fieldErrors(parsed.error), values: echo(fd, ["name", "phone"]) };
    await prisma.customer.update({ where: { id: me.id }, data: { name: parsed.data.name, phone: parsed.data.phone } });
    refresh();
    return { ok: true, message: "Profile saved." };
  });
}

export async function changeEmailAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  return guard(async () => {
    const me = await requireCustomer();
    const parsed = emailChangeSchema.safeParse({ email: fd.get("email"), currentPassword: fd.get("currentPassword") });
    if (!parsed.success) return { message: INVALID, fields: fieldErrors(parsed.error), values: echo(fd, ["email"]) };
    const r = await requestEmailChange(me.id, parsed.data.email, parsed.data.currentPassword);
    if (!r.ok) return { message: r.message, fields: r.fields, values: echo(fd, ["email"]) };
    return { ok: true, message: r.emailSent ? "We sent a confirmation link to the new address. Your current email stays active until you confirm." : "We could not send the confirmation email just now. Please try again shortly." };
  });
}

export async function changePasswordAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  return guard(async () => {
    const me = await requireCustomer();
    const parsed = changePasswordSchema.safeParse({ currentPassword: fd.get("currentPassword"), newPassword: fd.get("newPassword") });
    if (!parsed.success) return { message: INVALID, fields: fieldErrors(parsed.error) };
    if (fd.get("confirm") !== parsed.data.newPassword) return { message: INVALID, fields: { confirm: "The passwords do not match." } };
    const r = await changePassword(me.id, parsed.data.currentPassword, parsed.data.newPassword);
    if (!r.ok) return { message: r.message, fields: r.fields };
    // Every other device is signed out by the version bump; keep this one.
    await startCustomerSession(me.id, r.version);
    return { ok: true, message: "Password updated. Other devices have been signed out." };
  });
}

function addressInput(fd: FormData) {
  return addressSchema.safeParse(Object.fromEntries(fd.entries()));
}
const ADDRESS_FIELDS = ["label", "fullName", "phone", "line", "city", "state", "postcode"];

export async function saveAddressAction(_prev: AccountState, fd: FormData): Promise<AccountState> {
  return guard(async () => {
    const me = await requireCustomer();
    const parsed = addressInput(fd);
    if (!parsed.success) return { message: INVALID, fields: fieldErrors(parsed.error), values: echo(fd, ADDRESS_FIELDS) };
    const rawId = fd.get("addressId");
    const addressId = typeof rawId === "string" && rawId ? z.uuid().safeParse(rawId).data : undefined;
    if (rawId && !addressId) return { message: "Address not found." };
    const r = await saveAddress(me.id, parsed.data, addressId);
    if (!r.ok) return { message: r.message, values: echo(fd, ADDRESS_FIELDS) };
    refresh();
    return { ok: true, message: addressId ? "Address updated." : "Address saved." };
  });
}

export async function deleteAddressAction(id: string): Promise<AccountState> {
  return guard(async () => {
    const me = await requireCustomer();
    const addressId = z.uuid().safeParse(id);
    if (!addressId.success || !(await deleteAddress(me.id, addressId.data))) return { message: "Address not found." };
    refresh();
    return { ok: true };
  });
}

export async function defaultAddressAction(id: string): Promise<AccountState> {
  return guard(async () => {
    const me = await requireCustomer();
    const addressId = z.uuid().safeParse(id);
    if (!addressId.success || !(await makeDefaultAddress(me.id, addressId.data))) return { message: "Address not found." };
    refresh();
    return { ok: true };
  });
}
