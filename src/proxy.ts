import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 proxy (replacement for middleware).
 *
 * Per Better Auth guidance this layer performs only a fast, cookie-existence
 * check to redirect early — it deliberately makes no database calls. The
 * authoritative validation happens server-side in the (shell) layout, which
 * derives the visitor from the real Better Auth session before any
 * application UI renders.
 */
const PROTECTED_ROUTES = [
  "/",
  "/expenses",
  "/analytics",
  "/reports",
  "/settings",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(getSessionCookie(request));
  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/expenses", "/analytics", "/reports", "/settings"],
};
