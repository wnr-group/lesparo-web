import { connection } from "next/server";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point of the password-reset email. Exchanges the one-time token_hash for a short session and sends the
 * admin to the new-password page. Only the "recovery" type is accepted and the destination is fixed, so this route
 * cannot be used as an open redirect or to sign someone in by email-confirmation or magic-link tokens.
 */
export async function GET(request: NextRequest) {
  await connection();
  const tokenHash = request.nextUrl.searchParams.get("token_hash") ?? "";
  const type = request.nextUrl.searchParams.get("type");
  const to = (path: string) => NextResponse.redirect(new URL(path, request.nextUrl.origin));

  if (type !== "recovery" || tokenHash.length < 10 || tokenHash.length > 200) return to("/admin/login?notice=expired");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  if (error || !data.user) return to("/admin/login?notice=expired");

  // Only people with a staff profile may continue; anyone else gets no session.
  const profile = await prisma.staffUser.findUnique({ where: { auth_user_id: data.user.id }, select: { role: true } });
  if (!profile || (profile.role !== "admin" && profile.role !== "sales")) {
    await supabase.auth.signOut();
    return to("/admin/login?notice=expired");
  }
  return to("/admin/reset-password");
}
