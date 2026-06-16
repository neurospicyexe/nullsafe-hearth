import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.MIND_URL ?? process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "MIND_URL / HALSETH_URL not set" }, { status: 500 });

  const h: Record<string, string> = secret ? { Authorization: `Bearer ${secret}` } : {};

  // AbortSignal.timeout bounds each upstream call -- without it a hung Halseth connection
  // hangs the route until the platform kills it. (2026-06-16 sweep.)
  const opts = { headers: h, cache: "no-store" as const, signal: AbortSignal.timeout(10_000) };
  try {
    const [healthRes, patternsRes, journalsRes] = await Promise.all([
      fetch(`${base}/mind/health`,           opts),
      fetch(`${base}/mind/patterns?days=7`,  opts),
      fetch(`${base}/mind/recent?hours=168`, opts),
    ]);

    const health          = healthRes.ok   ? await healthRes.json()   : { entities: 0, observations: 0, relations: 0, journals: 0, salience: {} };
    const patterns        = patternsRes.ok ? await patternsRes.json() : null;
    const recent_journals = journalsRes.ok ? await journalsRes.json() : [];

    return NextResponse.json({ health, patterns, recent_journals });
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}
