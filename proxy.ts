import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/** Admin pages a visitor may open without signing in. Everything else under /admin needs a Supabase session. */
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/forgot-password", "/admin/auth/confirm"]);

/**
 * Keeps the Supabase session fresh and sends visitors without a valid session to the sign-in page. This is a
 * convenience layer only: every admin page, server action and admin route handler re-checks the session and the
 * staff role on the server (lib/auth/staff.ts), so skipping or bypassing this file grants nothing.
 */
export async function proxy(request: NextRequest) {
  let result;
  try {
    result = await updateSession(request);
  } catch {
    // Supabase settings missing or unreachable: fail closed.
    if (PUBLIC_ADMIN_PATHS.has(request.nextUrl.pathname)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const { response, user } = result;

  if (!user && !PUBLIC_ADMIN_PATHS.has(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Carry any cookie changes (for example a cleared, expired session) onto the redirect.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
