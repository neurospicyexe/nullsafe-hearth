import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  try {
    const res = await fetch(`${base}/biometrics`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
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
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const bool = (v: unknown) => (typeof v === "boolean" ? v : v === 1 ? true : v === 0 ? false : null);
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
    // Subjective ND-state layer (migration 0081)
    mood:          str(r["mood"]),
    pain:          num(r["pain"]),
    energy:        num(r["energy"]),
    focus:         num(r["focus"]),
    spoons:        num(r["spoons"]),
    meds_taken:    bool(r["meds_taken"]),
  };

  try {
    const upstream = await fetch(`${base}/biometrics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await upstream.json();

    // Keep the dashboard header live: a logged spoon count also updates house
    // state. Best-effort — the snapshot is the record of truth, house is a mirror.
    // Clamped 0-12 to match the worker's snapshot-side clamp (house POST doesn't validate).
    if (upstream.ok && typeof body.spoons === "number") {
      const spoonCount = Math.min(12, Math.max(0, Math.round(body.spoons)));
      await fetch(`${base}/house`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ spoon_count: spoonCount }),
        signal: AbortSignal.timeout(10_000),
      }).catch(() => {});
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}
