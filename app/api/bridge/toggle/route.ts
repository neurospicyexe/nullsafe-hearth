import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const r = raw as Record<string, unknown>;

  // Allowlist: only forward known fields that /bridge/toggle accepts
  const body: Record<string, unknown> = {};
  if (typeof r["category"] === "string") body["category"] = r["category"];
  if (typeof r["enabled"] === "boolean") body["enabled"] = r["enabled"];

  const res = await fetch(`${base}/bridge/toggle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
