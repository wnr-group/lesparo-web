import { createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

/**
 * Customer session: a signed JWT in an httpOnly cookie, kept strictly apart from the staff session:
 * a different cookie, a different signing key (derived from AUTH_SECRET with a customer-only label) and a different audience,
 * so a customer token can never be accepted as a staff token or the other way round.
 * The token carries the customer id and a session version; the version is checked against the database on every request,
 * so changing the password signs every other device out.
 */
export const CUSTOMER_COOKIE = "abija_customer_session";
export const CUSTOMER_SESSION_MAX_AGE = 60 * 60 * 24 * 14;
const AUDIENCE = "abija:customer";

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 characters. See .env.example.");
  return new Uint8Array(createHmac("sha256", secret).update("customer-session-v1").digest());
}

export function signCustomerSession(customerId: string, version: number) {
  return new SignJWT({ ver: version }).setProtectedHeader({ alg: "HS256" }).setSubject(customerId).setAudience(AUDIENCE).setIssuedAt().setExpirationTime(`${CUSTOMER_SESSION_MAX_AGE}s`).sign(key());
}

export async function verifyCustomerSession(token: string | undefined): Promise<{ id: string; version: number } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: AUDIENCE });
    if (!payload.sub || typeof payload.ver !== "number") return null;
    return { id: payload.sub, version: payload.ver };
  } catch {
    return null;
  }
}
