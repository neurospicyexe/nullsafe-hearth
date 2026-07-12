import { NextRequest, NextResponse } from "next/server";
import { signSession } from "@/lib/session";
import { safeCompare } from "@/lib/timing-safe";
import { checkLoginRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const secret = process.env.DASHBOARD_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
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

  response.cookies.set("hearth_session", await signSession(secret), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });

  return response;
}
