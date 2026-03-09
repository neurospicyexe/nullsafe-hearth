import { NextRequest, NextResponse } from "next/server";

// Companion-accessible house update — authenticated with HALSETH_SECRET Bearer token.
// Exempted from dashboard cookie middleware so companions can call it during sessions.
// Only exposes love_meter to keep scope tight.

export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  // Verify Bearer token matches HALSETH_SECRET.
  const auth = request.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json();

  // Accept absolute value or a delta from current.
  let love_meter: number | undefined;

  if (typeof raw.love_meter === "number") {
    love_meter = Math.min(100, Math.max(0, Math.round(raw.love_meter)));
  } else if (typeof raw.delta === "number") {
    // Fetch current value first.
    const presRes = await fetch(`${base}/presence`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (presRes.ok) {
      const pres = await presRes.json();
      const current = pres?.house?.love_meter ?? 50;
      love_meter = Math.min(100, Math.max(0, Math.round(current + raw.delta)));
    }
  }

  if (love_meter === undefined) {
    return NextResponse.json({ error: "Provide love_meter (0–100) or delta" }, { status: 400 });
  }

  const res = await fetch(`${base}/house`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ love_meter }),
  });

  if (!res.ok) return NextResponse.json({ error: "Request failed" }, { status: res.status });
  return NextResponse.json({ love_meter });
}
