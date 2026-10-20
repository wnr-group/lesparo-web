import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "sales";

export type StaffSession = {
  userId: string;
  email: string | null;
  roles: StaffRole[];
  isAdmin: boolean;
};

/** Resolves the current user's staff roles from the database (never from client state). */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (error || !rows?.length) return null;

  const roles = rows.map((r) => r.role as StaffRole);
  return { userId: user.id, email: user.email ?? null, roles, isAdmin: roles.includes("admin") };
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
