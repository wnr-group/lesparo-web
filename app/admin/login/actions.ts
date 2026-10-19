"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.email().trim(), password: z.string().min(1).max(200) });

export type LoginState = { error?: string; email?: string };

export async function signIn(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  const email = typeof fd.get("email") === "string" ? String(fd.get("email")) : "";
  if (!parsed.success) return { error: "Enter your email and password.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  // One generic message: never reveal whether the account exists.
  if (error || !data.user) return { error: "Those details didn’t match. Please try again.", email };

  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
  if (!roles?.length) {
    await supabase.auth.signOut();
    return { error: "This account does not have staff access.", email };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
