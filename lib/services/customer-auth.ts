import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail, siteUrl } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";
import { hitRateLimit, rateLimitKey } from "@/lib/services/enquiries";

/** Cost 12 bcrypt: slow enough to resist offline guessing, quick enough for sign-in. */
const BCRYPT_COST = 12;
// Compared against when the account does not exist, so both paths take about the same time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);

export const TOKEN_TTL_MS = { verify_email: 24 * 3600_000, change_email: 24 * 3600_000, reset_password: 3600_000 } as const;
export type TokenType = keyof typeof TOKEN_TTL_MS;

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);
export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** A new one-time token. Only its hash is stored; earlier unused tokens of the same kind stop working. */
export async function issueToken(customerId: string, type: TokenType, newEmail?: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.customerToken.updateMany({ where: { customer_id: customerId, type, used_at: null }, data: { used_at: new Date() } });
  await prisma.customerToken.create({ data: { customer_id: customerId, type, token_hash: sha256(token), new_email: newEmail ?? null, expires_at: new Date(Date.now() + TOKEN_TTL_MS[type]) } });
  return token;
}

/** Marks the token used and returns it, in one conditional write: of two simultaneous requests only one wins. */
export async function consumeToken(token: string, type: TokenType) {
  const hash = sha256(token);
  const claimed = await prisma.customerToken.updateMany({ where: { token_hash: hash, type, used_at: null, expires_at: { gt: new Date() } }, data: { used_at: new Date() } });
  if (claimed.count !== 1) return null;
  return prisma.customerToken.findUnique({ where: { token_hash: hash }, select: { customer_id: true, new_email: true } });
}

/** Whether a token could still be used, without using it (so a link scanner opening the page does not burn it). */
export async function tokenIsLive(token: string, type: TokenType) {
  const row = await prisma.customerToken.findUnique({ where: { token_hash: sha256(token) }, select: { type: true, used_at: true, expires_at: true } });
  return !!row && row.type === type && !row.used_at && row.expires_at > new Date();
}

async function allow(scope: string, id: string, max: number, windowSeconds: number) {
  try {
    return await hitRateLimit(rateLimitKey(`${scope}:${id}`), max, windowSeconds);
  } catch (err) {
    console.error("[auth] rate limit check failed", err instanceof Error ? err.message : "unknown");
    return false;
  }
}

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

export type Fail = { ok: false; message: string; code?: string; fields?: Record<string, string> };

/** Attaches earlier guest orders and enquiries made with this (now verified) address to the account. Nothing is copied or changed. */
export async function linkRecordsToCustomer(customerId: string, email: string) {
  const where = { customer_id: null, email: { equals: email, mode: "insensitive" as const } };
  await prisma.retailOrder.updateMany({ where, data: { customer_id: customerId } });
  await prisma.wholesaleEnquiry.updateMany({ where, data: { customer_id: customerId } });
}

// ---------------------------------------------------------------------------
// Register + verify
// ---------------------------------------------------------------------------

async function sendVerification(customer: { id: string; name: string; email: string }) {
  const token = await issueToken(customer.id, "verify_email");
  return sendEmail({ to: customer.email, rendered: templates.verifyEmail({ name: customer.name, token, siteUrl: siteUrl() }), template: "verify_email", key: `verify_email:${customer.id}:${sha256(token).slice(0, 12)}`, entityId: customer.id });
}

export async function registerCustomer(input: { name: string; email: string; phone: string; password: string }, client: string): Promise<{ ok: true; emailSent: boolean } | Fail> {
  if (!(await allow("register", client, 10, 3600))) return { ok: false, message: TOO_MANY };
  const existing = await prisma.customer.findUnique({ where: { email: input.email }, select: { id: true, email_verified_at: true } });
  if (existing?.email_verified_at) return { ok: false, message: "An account with this email already exists. Sign in, or reset your password if you have forgotten it.", fields: { email: "This email is already registered." } };

  const password_hash = await hashPassword(input.password);
  let customer;
  if (existing) {
    // Never verified, so nobody has proven they own this address: the newest sign-up replaces the details.
    customer = await prisma.customer.update({ where: { id: existing.id }, data: { name: input.name, phone: input.phone, password_hash, session_version: { increment: 1 } }, select: { id: true, name: true, email: true } });
  } else {
    try {
      customer = await prisma.customer.create({ data: { name: input.name, email: input.email, phone: input.phone, password_hash }, select: { id: true, name: true, email: true } });
    } catch {
      return { ok: false, message: "We could not create your account. Please try again.", code: "race" };
    }
  }
  const sent = await sendVerification(customer);
  return { ok: true, emailSent: sent.status === "sent" || (sent.status === "not_configured" && process.env.NODE_ENV === "development") };
}

/** Always reports success, so the form cannot be used to find out which addresses have accounts. */
export async function resendVerification(email: string, client: string): Promise<{ ok: true } | Fail> {
  if (!(await allow("resend", client, 6, 3600)) || !(await allow("resend-email", email, 3, 3600))) return { ok: false, message: TOO_MANY };
  const c = await prisma.customer.findUnique({ where: { email }, select: { id: true, name: true, email: true, email_verified_at: true } });
  if (c && !c.email_verified_at) await sendVerification(c);
  return { ok: true };
}

export async function confirmEmailToken(token: string, type: "verify_email" | "change_email"): Promise<{ ok: true; changed: boolean } | Fail> {
  const row = await consumeToken(token, type);
  if (!row) return { ok: false, message: "This link is invalid or has expired. Request a new one and try again." };
  const customer = await prisma.customer.findUnique({ where: { id: row.customer_id }, select: { id: true, name: true, email: true, email_verified_at: true } });
  if (!customer) return { ok: false, message: "This link is invalid or has expired." };

  if (type === "change_email" && row.new_email) {
    try {
      await prisma.customer.update({ where: { id: customer.id }, data: { email: row.new_email, email_verified_at: new Date() } });
    } catch {
      return { ok: false, message: "That email address is already in use by another account." };
    }
    await linkRecordsToCustomer(customer.id, row.new_email);
    return { ok: true, changed: true };
  }

  const firstTime = !customer.email_verified_at;
  if (firstTime) await prisma.customer.update({ where: { id: customer.id }, data: { email_verified_at: new Date() } });
  await linkRecordsToCustomer(customer.id, customer.email);
  if (firstTime) await sendEmail({ to: customer.email, rendered: templates.welcome({ name: customer.name, siteUrl: siteUrl() }), template: "welcome", key: `welcome:${customer.id}`, entityId: customer.id });
  return { ok: true, changed: false };
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

export async function authenticateCustomer(input: { email: string; password: string }, client: string): Promise<{ ok: true; id: string; version: number } | Fail> {
  if (!(await allow("login", client, 30, 900)) || !(await allow("login-email", input.email, 8, 900))) return { ok: false, message: "Too many sign-in attempts. Please wait 15 minutes and try again.", code: "rate_limited" };
  const c = await prisma.customer.findUnique({ where: { email: input.email }, select: { id: true, password_hash: true, session_version: true, email_verified_at: true } });
  const valid = await bcrypt.compare(input.password, c?.password_hash ?? DUMMY_HASH);
  // One generic message for an unknown email and a wrong password.
  if (!c || !valid) return { ok: false, message: "Those details didn’t match. Please check your email and password." };
  if (!c.email_verified_at) return { ok: false, message: "Please verify your email address before signing in. We can send the link again.", code: "unverified" };
  return { ok: true, id: c.id, version: c.session_version };
}

// ---------------------------------------------------------------------------
// Forgot / reset password
// ---------------------------------------------------------------------------

/** Always reports success so the form cannot be used to find out which addresses have accounts. */
export async function requestPasswordReset(email: string, client: string): Promise<{ ok: true } | Fail> {
  if (!(await allow("forgot", client, 8, 3600)) || !(await allow("forgot-email", email, 3, 3600))) return { ok: false, message: TOO_MANY };
  const c = await prisma.customer.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (c) {
    const token = await issueToken(c.id, "reset_password");
    await sendEmail({ to: c.email, rendered: templates.resetPassword({ name: c.name, token, siteUrl: siteUrl() }), template: "reset_password", key: `reset_password:${c.id}:${sha256(token).slice(0, 12)}`, entityId: c.id });
  }
  return { ok: true };
}

export async function resetPassword(token: string, password: string, client: string): Promise<{ ok: true } | Fail> {
  if (!(await allow("reset", client, 10, 3600))) return { ok: false, message: TOO_MANY };
  const row = await consumeToken(token, "reset_password");
  if (!row) return { ok: false, message: "This reset link is invalid or has expired. Please request a new one." };
  const password_hash = await hashPassword(password);
  // Following the emailed link proves the address, so it also verifies a still-unverified account.
  const c = await prisma.customer.update({ where: { id: row.customer_id }, data: { password_hash, session_version: { increment: 1 }, email_verified_at: new Date() }, select: { id: true, name: true, email: true } });
  await prisma.customerToken.updateMany({ where: { customer_id: c.id, used_at: null }, data: { used_at: new Date() } });
  await linkRecordsToCustomer(c.id, c.email);
  await sendEmail({ to: c.email, rendered: templates.passwordChanged({ name: c.name, siteUrl: siteUrl() }), template: "password_changed", key: `password_changed:${c.id}:${Date.now()}`, entityId: c.id });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Signed-in account changes. The customer id always comes from the session, never the form.
// ---------------------------------------------------------------------------

export async function changePassword(customerId: string, current: string, next: string): Promise<{ ok: true; version: number } | Fail> {
  if (!(await allow("change-password", customerId, 10, 3600))) return { ok: false, message: TOO_MANY };
  const c = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true, email: true, password_hash: true } });
  if (!c) return { ok: false, message: "Please sign in again." };
  if (!(await bcrypt.compare(current, c.password_hash))) return { ok: false, message: "Your current password is not correct.", fields: { currentPassword: "Not correct." } };
  const updated = await prisma.customer.update({ where: { id: c.id }, data: { password_hash: await hashPassword(next), session_version: { increment: 1 } }, select: { session_version: true } });
  await sendEmail({ to: c.email, rendered: templates.passwordChanged({ name: c.name, siteUrl: siteUrl() }), template: "password_changed", key: `password_changed:${c.id}:${Date.now()}`, entityId: c.id });
  return { ok: true, version: updated.session_version };
}

export async function requestEmailChange(customerId: string, newEmail: string, currentPassword: string): Promise<{ ok: true; emailSent: boolean } | Fail> {
  if (!(await allow("change-email", customerId, 5, 3600))) return { ok: false, message: TOO_MANY };
  const c = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true, email: true, password_hash: true } });
  if (!c) return { ok: false, message: "Please sign in again." };
  if (!(await bcrypt.compare(currentPassword, c.password_hash))) return { ok: false, message: "Your current password is not correct.", fields: { currentPassword: "Not correct." } };
  if (newEmail === c.email) return { ok: false, message: "That is already your email address.", fields: { email: "Already your email." } };
  if (await prisma.customer.findUnique({ where: { email: newEmail }, select: { id: true } })) return { ok: false, message: "That email address is already in use.", fields: { email: "Already in use." } };
  const token = await issueToken(c.id, "change_email", newEmail);
  const sent = await sendEmail({ to: newEmail, rendered: templates.confirmNewEmail({ name: c.name, token, siteUrl: siteUrl() }), template: "confirm_new_email", key: `confirm_new_email:${c.id}:${sha256(token).slice(0, 12)}`, entityId: c.id });
  return { ok: true, emailSent: sent.status === "sent" || (sent.status === "not_configured" && process.env.NODE_ENV === "development") };
}
