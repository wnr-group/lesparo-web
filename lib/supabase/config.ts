import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Supabase Auth settings shared by the server client and the proxy. Everything here is server-side only:
 * the browser never talks to Supabase Auth (sign-in, reset and sign-out are server actions), so no Supabase key
 * is shipped to the frontend. The publishable key is public by design but is still kept off the client here.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (the sb_publishable_... key, or the legacy anon key).
 * The secret / service-role key is NOT used by the app's auth code at all; only scripts/grant-staff-role.ts uses it.
 */
export function supabaseAuthConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new Error("Admin sign-in needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. See .env.example.");
  return { url, key };
}

/** Idle limit for the browser cookie. Each token refresh (about hourly while active) re-issues it. */
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

/**
 * httpOnly is safe because no browser-side Supabase client exists: script on the page can never read the session.
 * secure outside local development, sameSite lax so the password-reset link from an email still arrives signed in.
 */
export const authCookieOptions: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
};
