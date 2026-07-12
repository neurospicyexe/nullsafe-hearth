import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const secret = process.env.DASHBOARD_SECRET;

  // Missing secret now denies (fail-closed, 2026-07-12) -- previously allowed all
  // requests through, which meant a single missing env var silently opened the
  // whole dashboard. Login itself already 500s without a secret configured
  // (app/api/auth/route.ts), so this doesn't newly break anything reachable.
  if (!secret) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = request.cookies.get("hearth_session")?.value;
  if (await verifySession(session, secret)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Protect all routes except login page, auth API, Next internals, and static files.
  // api/companion/* uses its own HALSETH_SECRET Bearer auth -- no cookie needed.
  matcher: ["/((?!api/auth|api/companion|login|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
