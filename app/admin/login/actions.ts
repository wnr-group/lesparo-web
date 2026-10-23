"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

const schema = z.object({ email: z.email().trim(), password: z.string().min(1).max(200) });

export type LoginState = { error?: string; email?: string };

// Compared against when the account does not exist, so both paths take similar time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export async function signIn(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  const email = typeof fd.get("email") === "string" ? String(fd.get("email")) : "";
  if (!parsed.success) return { error: "Enter your email and password.", email };

  const user = await prisma.staffUser.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  const valid = await bcrypt.compare(parsed.data.password, user?.password_hash ?? DUMMY_HASH);
  // One generic message: never reveal whether the account exists.
  if (!user || !valid) return { error: "Those details didn’t match. Please try again.", email };
  if (user.role !== "admin" && user.role !== "sales") return { error: "This account does not have staff access.", email };

  (await cookies()).set(SESSION_COOKIE, await signSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/admin");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}
