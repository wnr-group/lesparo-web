import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { requestDb } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { resolveStaffSession, type StaffRole, type StaffSession } from "./staff-core";

export type { StaffRole, StaffSession };

/**
 * Resolves the current admin from Supabase Auth plus the staff_users profile (never from client state).
 * supabase.auth.getUser() is verified by the Supabase Auth server on every call, so a forged, revoked or expired
 * token is rejected; the role is then read from the database. Cached per request, so a page and the actions it
 * calls share one lookup.
 */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  let user;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    user = data.user;
  } catch {
    return null;
  }

  const db = await requestDb();
  const profile = await db.staffUser.findUnique({ where: { auth_user_id: user.id }, select: { id: true, email: true, role: true } });
  return resolveStaffSession(user, profile);
});

/** For pages: redirects to sign-in when the visitor is not staff. */
export async function requireStaffPage(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  return session;
}

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
  }
}

/** For server actions: throws instead of redirecting so the caller can report the failure. */
export async function requireStaff(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) throw new AuthorizationError();
  return session;
}

export async function requireAdmin(): Promise<StaffSession> {
  const session = await requireStaff();
  if (!session.isAdmin) throw new AuthorizationError("Administrator access is required.");
  return session;
}
