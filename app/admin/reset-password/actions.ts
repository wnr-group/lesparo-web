"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getStaffSession } from "@/lib/auth/staff";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/staff-core";
import { createClient } from "@/lib/supabase/server";

export type ResetState = { error?: string };

const schema = z
  .object({
    password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`).max(128, "That password is too long."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The two passwords do not match.", path: ["confirm"] });

/** Sets the new password for the signed-in (recovery) session, then ends every session so the admin signs in fresh. */
export async function resetPassword(_prev: ResetState, fd: FormData): Promise<ResetState> {
  // Re-checked on the server: the page being open proves nothing.
  const session = await getStaffSession();
  if (!session) return { error: "This reset session has expired. Request a new link." };

  const parsed = schema.safeParse({ password: fd.get("password"), confirm: fd.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the password and try again." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.code === "same_password" ? "Choose a password you have not used before." : "We could not change the password. Try a different one." };

  await supabase.auth.signOut();
  redirect("/admin/login?notice=reset");
}
