import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { requestDb } from "@/lib/db";
import { CUSTOMER_COOKIE, CUSTOMER_SESSION_MAX_AGE, signCustomerSession, verifyCustomerSession } from "./customer-session";

export type CustomerSession = { id: string; email: string; name: string; phone: string };

/**
 * The signed-in, verified customer, or null. The id comes only from the signed cookie and is re-read from the database together with
 * the session version, so a deleted account, an unverified account or a password change ends the session at once.
 */
export const getCustomer = cache(async (): Promise<CustomerSession | null> => {
  // Checking a token compares its expiry with the current time, so this is request-time work: say so before reading it.
  await connection();
  const session = await verifyCustomerSession((await cookies()).get(CUSTOMER_COOKIE)?.value);
  if (!session) return null;
  const db = await requestDb();
  const c = await db.customer.findUnique({ where: { id: session.id }, select: { id: true, email: true, name: true, phone: true, session_version: true, email_verified_at: true } });
  if (!c || c.session_version !== session.version || !c.email_verified_at) return null;
  return { id: c.id, email: c.email, name: c.name, phone: c.phone };
});

/** For pages: sends visitors to sign-in (remembering where they were going). */
export async function requireCustomerPage(next = "/account"): Promise<CustomerSession> {
  const c = await getCustomer();
  if (!c) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return c;
}

export class CustomerAuthError extends Error {
  constructor() {
    super("Please sign in to continue.");
  }
}

/** For server actions: throws so the caller can report it. */
export async function requireCustomer(): Promise<CustomerSession> {
  const c = await getCustomer();
  if (!c) throw new CustomerAuthError();
  return c;
}

export async function startCustomerSession(customerId: string, version: number) {
  (await cookies()).set(CUSTOMER_COOKIE, await signCustomerSession(customerId, version), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CUSTOMER_SESSION_MAX_AGE,
  });
}

export async function endCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export { safeNext } from "./safe-next";
