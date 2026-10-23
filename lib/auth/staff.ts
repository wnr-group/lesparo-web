import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { requestDb } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "./session";

export type StaffRole = "admin" | "sales";

export type StaffSession = {
  userId: string;
  email: string | null;
  roles: StaffRole[];
  isAdmin: boolean;
};

/** Resolves the current user's staff role from the database (never from client state). */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  const userId = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  const db = await requestDb();
  const user = await db.staffUser.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
  if (!user || (user.role !== "admin" && user.role !== "sales")) return null;

  const roles = [user.role as StaffRole];
  return { userId: user.id, email: user.email, roles, isAdmin: roles.includes("admin") };
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
