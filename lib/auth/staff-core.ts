/**
 * Pure admin-access rules (no I/O) so they can be unit-tested. A visitor is staff only when ALL of these hold:
 *  - Supabase verified their session (the caller passes the user from supabase.auth.getUser(), never a decoded cookie),
 *  - their email is confirmed,
 *  - their sign-in is not older than the absolute session limit,
 *  - a staff_users row is linked to their auth user id and carries a known role.
 * The role comes ONLY from that row. user_metadata and app_metadata are never read, so a user cannot grant themselves
 * a role by editing their own profile or by signing up.
 */
export type StaffRole = "admin" | "sales";

export type StaffSession = {
  /** staff_users.id: what the app stores as author / actor. */
  userId: string;
  authUserId: string;
  email: string | null;
  roles: StaffRole[];
  isAdmin: boolean;
};

export type VerifiedAuthUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
};

export type StaffProfile = { id: string; email: string; role: string };

/** Longest a sign-in stays valid however actively it is used. Staff sign in again after this. */
export const ADMIN_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function isStaffRole(role: string): role is StaffRole {
  return role === "admin" || role === "sales";
}

/** True when the sign-in is older than the limit. A missing timestamp counts as expired: fail closed. */
export function isSignInTooOld(lastSignInAt: string | null | undefined, now = Date.now(), maxAgeMs = ADMIN_SESSION_MAX_AGE_MS): boolean {
  if (!lastSignInAt) return true;
  const at = Date.parse(lastSignInAt);
  if (Number.isNaN(at)) return true;
  return now - at > maxAgeMs;
}

export function resolveStaffSession(user: VerifiedAuthUser | null, profile: StaffProfile | null, now = Date.now()): StaffSession | null {
  if (!user || !profile) return null;
  if (!user.email_confirmed_at) return null;
  if (isSignInTooOld(user.last_sign_in_at, now)) return null;
  if (!isStaffRole(profile.role)) return null;
  return { userId: profile.id, authUserId: user.id, email: profile.email, roles: [profile.role], isAdmin: profile.role === "admin" };
}

/** Minimum length for an admin password (also set as the minimum in the Supabase dashboard). */
export const MIN_PASSWORD_LENGTH = 8;
