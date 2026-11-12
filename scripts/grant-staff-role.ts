/**
 * Creates an admin or sales account, or removes one. This is the ONLY way staff accounts are created: public sign-up
 * is disabled and nothing on the website can create or promote a user.
 *
 * What it does for `staff:grant -- <email> <admin|sales>`:
 *   1. finds or creates the user in Supabase Auth (email already confirmed) using the SECRET key,
 *   2. creates or updates the matching staff_users row, linked by auth_user_id, with the role.
 * A new user gets a random 24-character password that is printed once; pass --password to choose one (8+ characters).
 * Run it from a trusted machine only: it needs SUPABASE_SECRET_KEY and the database URL from .env.local.
 *
 *   npm run staff:grant -- someone@abijaexports.com admin
 *   npm run staff:grant -- sales@example.com sales --password "a-long-temporary-password"
 *   npm run staff:grant -- someone@example.com --revoke        (deletes the login and the staff row)
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { MIN_PASSWORD_LENGTH, isStaffRole } from "../lib/auth/staff-core";
import { db } from "./db";

const [emailArg, roleArg, ...rest] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const revoke = roleArg === "--revoke" || rest.includes("--revoke");
const pwIndex = rest.indexOf("--password");
const givenPassword = pwIndex >= 0 ? rest[pwIndex + 1] : undefined;
const role = revoke ? null : roleArg;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || (!revoke && !(role && isStaffRole(role)))) {
  fail("Usage: staff:grant -- <email> <admin|sales> [--password <pw>]   |   staff:grant -- <email> --revoke");
}
if (givenPassword !== undefined && givenPassword.length < MIN_PASSWORD_LENGTH) fail(`Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) fail("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.");

const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } }).auth.admin;

async function findAuthUser(address: string) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === address);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  const existing = await findAuthUser(email!);

  if (revoke) {
    if (existing) {
      const { error } = await admin.deleteUser(existing.id);
      if (error) throw error;
    }
    const removed = await db.staffUser.deleteMany({ where: { email: email! } });
    console.log(existing || removed.count ? `Removed staff access for ${email}.` : "No such user.");
    return;
  }

  let authUser = existing;
  let printedPassword: string | null = null;
  if (!authUser) {
    printedPassword = givenPassword ?? randomBytes(18).toString("base64url");
    const { data, error } = await admin.createUser({ email: email!, password: printedPassword, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("Could not create the user.");
    authUser = data.user;
    console.log(`Created Supabase user ${email}.`);
  } else if (givenPassword) {
    const { error } = await admin.updateUserById(authUser.id, { password: givenPassword, email_confirm: true });
    if (error) throw error;
    console.log(`Updated the password for ${email}.`);
  } else if (!authUser.email_confirmed_at) {
    const { error } = await admin.updateUserById(authUser.id, { email_confirm: true });
    if (error) throw error;
  }

  // The staff row is the only thing that grants access, and the role lives here, not in Supabase metadata.
  await db.staffUser.upsert({
    where: { email: email! },
    create: { email: email!, auth_user_id: authUser.id, role: role! },
    update: { auth_user_id: authUser.id, role: role! },
  });
  console.log(`${email} is now ${role}.`);
  if (printedPassword && !givenPassword) console.log(`Temporary password (shown once, change it with "Forgot your password?"): ${printedPassword}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
