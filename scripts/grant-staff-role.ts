/**
 * Creates (if needed) a staff user and sets their role, or removes their access.
 *
 *   npm run staff:grant -- someone@abijaexports.com admin --password "a-long-temporary-password"
 *   npm run staff:grant -- sales@example.com sales
 *   npm run staff:grant -- someone@example.com --revoke
 */
import bcrypt from "bcryptjs";
import { db } from "./db";

const [emailArg, roleArg, ...rest] = process.argv.slice(2);
const email = emailArg?.toLowerCase();
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

async function main() {
  const user = await db.staffUser.findUnique({ where: { email } });
  if (revoke) {
    if (!user) return console.log("No such user.");
    await db.staffUser.delete({ where: { email } });
    return console.log(`Removed staff access for ${email}.`);
  }
  if (!user) {
    if (!password) throw new Error("User does not exist yet: pass --password to create them (they should change it after first sign-in).");
    await db.staffUser.create({ data: { email, role: role!, password_hash: await bcrypt.hash(password, 10) } });
    console.log(`Created user ${email}.`);
  } else {
    await db.staffUser.update({ where: { email }, data: { role: role!, ...(password && { password_hash: await bcrypt.hash(password, 10) }) } });
    if (password) console.log(`Updated password for ${email}.`);
  }
  console.log(`Granted ${role} to ${email}.`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
