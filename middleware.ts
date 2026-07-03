import { NextResponse, NextRequest } from "next/server";

const AUTH_COOKIE = "ce_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public: login page, the login action, and the cron endpoint (guarded by its own secret).
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const expected = process.env.APP_PASSWORD || "changeme-please";
  if (token !== expected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
