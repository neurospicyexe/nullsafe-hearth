import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const res = await fetch(`${base}/biometrics`, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    next: { revalidate: 60 },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });
  if (!secret) return NextResponse.json({ error: "HALSETH_SECRET not set" }, { status: 500 });

  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const r = raw as Record<string, unknown>;

  // Allowlist: only forward known BiometricSnapshot fields
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const body = {
    recorded_at:   typeof r["recorded_at"] === "string" ? r["recorded_at"] : new Date().toISOString(),
    source:        str(r["source"]),
    hrv_resting:   num(r["hrv_resting"]),
    resting_hr:    num(r["resting_hr"]),
    sleep_hours:   num(r["sleep_hours"]),
    sleep_quality: str(r["sleep_quality"]),
    stress_score:  num(r["stress_score"]),
    steps:         num(r["steps"]),
    active_energy: num(r["active_energy"]),
    notes:         str(r["notes"]),
  };

  const upstream = await fetch(`${base}/biometrics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
