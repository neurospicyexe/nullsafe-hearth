import { NextRequest, NextResponse } from "next/server";
import { signSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { safeCompare } from "@/lib/timing-safe";
import { checkLoginRateLimit, getClientKey } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const secret = process.env.DASHBOARD_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  const clientKey = getClientKey(request.headers);
  if (!checkLoginRateLimit(clientKey)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: { secret?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof body.secret !== "string" || !safeCompare(body.secret, secret)) {
    return NextResponse.json({ error: "Incorrect passphrase" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set(SESSION_COOKIE, await signSession(secret), SESSION_COOKIE_OPTIONS);

  return response;
}
