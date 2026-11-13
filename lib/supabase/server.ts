import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { authCookieOptions, supabaseAuthConfig } from "./config";

/**
 * Supabase client for Server Components, server actions and route handlers. It reads the session from the request
 * cookies. Server Components cannot set cookies, so a refreshed session is written by proxy.ts instead; the try/catch
 * below only skips the write in that case.
 */
export async function createClient() {
  // Session checks are request-time only: never run (or read the clock) while Next prerenders or prefetches a page shell.
  await connection();
  const { url, key } = supabaseAuthConfig();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookieOptions: authCookieOptions,
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session cookie on the next request.
        }
      },
    },
  });
}
