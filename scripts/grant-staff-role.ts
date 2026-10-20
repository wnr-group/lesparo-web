/**
 * Creates (if needed) a staff user and grants a role. Roles cannot be granted from the
 * app itself — only with the service role, which is what this script uses.
 *
 *   npm run staff:grant -- someone@abijaexports.com admin
 *   npm run staff:grant -- sales@example.com sales --password "a-long-temporary-password"
 *   npm run staff:grant -- someone@example.com --revoke
 */
import { createClient } from "@supabase/supabase-js";

const [email, roleArg, ...rest] = process.argv.slice(2);
const revoke = roleArg === "--revoke" || rest.includes("--revoke");
const pwIndex = rest.indexOf("--password");
const password = pwIndex >= 0 ? rest[pwIndex + 1] : undefined;
const role = revoke ? null : roleArg;

if (!email || (!revoke && role !== "admin" && role !== "sales")) {
  console.error("Usage: staff:grant -- <email> <admin|sales> [--password <pw>]   |   staff:grant -- <email> --revoke");
  process.exit(1);
}
if (password && password.length < 12) {
  console.error("Use a password of at least 12 characters.");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

async function findUser(target: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (found || data.users.length < 200) return found ?? null;
  }
  return null;
}

async function main() {
  let user = await findUser(email);
  if (revoke) {
    if (!user) return console.log("No such user.");
    const { error } = await db.from("user_roles").delete().eq("user_id", user.id);
    if (error) throw error;
    return console.log(`Revoked all staff roles from ${email}.`);
  }
  if (!user) {
    if (!password) throw new Error("User does not exist yet: pass --password to create them (they should change it after first sign-in).");
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    user = data.user;
    console.log(`Created user ${email}.`);
  } else if (password) {
    const { error } = await db.auth.admin.updateUserById(user.id, { password });
    if (error) throw error;
    console.log(`Updated password for ${email}.`);
  }
  const { error } = await db.from("user_roles").upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });
  if (error) throw error;
  console.log(`Granted ${role} to ${email}.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
