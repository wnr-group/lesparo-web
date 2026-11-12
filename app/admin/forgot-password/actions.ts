"use server";

import { z } from "zod";
import { withinAuthLimits } from "@/lib/auth/request";
import { createClient } from "@/lib/supabase/server";

export type ForgotState = { error?: string; sent?: boolean; email?: string };

const schema = z.object({ email: z.email().trim().max(254) });

/**
 * Sends a password-reset email through Supabase. The answer is the same whether or not the address belongs to an
 * admin, so this form cannot be used to find out which emails have accounts. The email's link points at
 * /admin/auth/confirm (see docs/admin-auth.md for the email template).
 */
export async function requestPasswordReset(_prev: ForgotState, fd: FormData): Promise<ForgotState> {
  const parsed = schema.safeParse({ email: fd.get("email") });
  const email = typeof fd.get("email") === "string" ? String(fd.get("email")) : "";
  if (!parsed.success) return { error: "Enter a valid email address.", email };

  const address = parsed.data.email.toLowerCase();
  if (!(await withinAuthLimits("reset", address, 5, 600))) return { error: "Too many requests. Please wait a few minutes and try again.", email };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/auth/confirm` });
    if (error) console.warn("[admin-auth] reset email not sent:", error.status ?? "", error.code ?? "");
  } catch (err) {
    console.warn("[admin-auth] reset email failed:", err instanceof Error ? err.message : "unknown");
  }
  return { sent: true, email };
}
