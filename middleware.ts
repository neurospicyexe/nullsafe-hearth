import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const secret = process.env.DASHBOARD_SECRET;

  // No secret set — local dev, allow all.
  if (!secret) return NextResponse.next();

  const session = request.cookies.get("hearth_session")?.value;
  if (session === secret) return NextResponse.next();

  // Redirect to login, preserving the intended destination.
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Protect all routes except login page, auth API, Next internals, and static files.
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon\\.ico).*)"],
};
