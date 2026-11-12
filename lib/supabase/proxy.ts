import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { authCookieOptions, supabaseAuthConfig } from "./config";

/**
 * Runs in proxy.ts on every /admin request: validates the session with Supabase (getUser asks the Auth server, it does not
 * just decode the cookie) and, when the access token has expired, refreshes it and writes the new cookies onto the
 * response. Returns the response to continue with and the verified user (or null).
 */
export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; user: User | null }> {
  const { url, key } = supabaseAuthConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookieOptions: authCookieOptions,
    // The proxy is the one place that refreshes an expired access token (autoRefreshToken is for long-lived browser clients).
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  return { response, user: error ? null : data.user };
}
