/**
 * Creates the default admin account so a fresh install can sign in to /admin straight away.
 * Safe to re-run: an existing account keeps its password and is made an admin.
 *
 *   npm run admin:seed
 *
 * Override the defaults with ADMIN_EMAIL / ADMIN_PASSWORD. Change the password after the
 * first sign-in on any shared or hosted install.
 */
import bcrypt from "bcryptjs";
import { db } from "./db";

const email = (process.env.ADMIN_EMAIL ?? "admin@lesparo.com").toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "Admin@123";

async function main() {
  const existing = await db.staffUser.findUnique({ where: { email } });
  if (existing) {
    await db.staffUser.update({ where: { email }, data: { role: "admin" } });
    console.log(`Admin user ${email} already exists (password unchanged).`);
    return;
  }
  await db.staffUser.create({ data: { email, name: "Admin", role: "admin", password_hash: await bcrypt.hash(password, 10) } });
  console.log(`Created admin user: ${email}`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
