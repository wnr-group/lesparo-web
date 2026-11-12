"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { withinAuthLimits } from "@/lib/auth/request";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.email().trim().max(254), password: z.string().min(1).max(200) });

export type LoginState = { error?: string; email?: string };

// One message for every failure (unknown email, wrong password, not an admin, locked out by a limit): it never says which.
const GENERIC = "Those details didn’t match. Please try again.";

export async function signIn(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  const email = typeof fd.get("email") === "string" ? String(fd.get("email")) : "";
  if (!parsed.success) return { error: "Enter your email and password.", email };

  const address = parsed.data.email.toLowerCase();
  if (!(await withinAuthLimits("login", address, 10, 600))) return { error: "Too many attempts. Please wait a few minutes and try again.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: address, password: parsed.data.password });
  if (error || !data.user) return { error: GENERIC, email };

  // A valid Supabase login is not enough: the account must have a staff profile with a role. Otherwise end the session at once.
  const profile = await prisma.staffUser.findUnique({ where: { auth_user_id: data.user.id }, select: { role: true } });
  if (!profile || (profile.role !== "admin" && profile.role !== "sales")) {
    await supabase.auth.signOut();
    return { error: GENERIC, email };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  // Ends every session of this account, not only this browser, and clears the cookies.
  await supabase.auth.signOut();
  redirect("/admin/login?notice=signedout");
}
