import { SignJWT, jwtVerify } from "jose";

/**
 * Staff session: a signed (HS256) JWT in an httpOnly cookie. It only carries the user id;
 * roles are always re-read from the database (lib/auth/staff.ts). Kept free of
 * server-only imports so proxy.ts can use it too.
 */
export const SESSION_COOKIE = "lesparo_staff_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters. See .env.example.");
  return new TextEncoder().encode(secret);
}

export function signSession(userId: string) {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuedAt().setExpirationTime(`${SESSION_MAX_AGE}s`).sign(secretKey());
}

/** The user id, or null for a missing, tampered or expired token. */
export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
