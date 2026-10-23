import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/**
 * Sends visitors without a valid session cookie to the sign-in page. This is
 * a convenience only: every admin page and server action re-checks staff roles on the
 * server (lib/auth/staff.ts).
 */
export async function proxy(request: NextRequest) {
  const signedIn = !!(await verifySession(request.cookies.get(SESSION_COOKIE)?.value));
  const isLogin = request.nextUrl.pathname === "/admin/login";

  if (!signedIn && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
