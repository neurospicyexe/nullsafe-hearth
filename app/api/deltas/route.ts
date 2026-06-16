import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 100));

  try {
    const res = await fetch(`${base}/deltas?limit=${limit}`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return NextResponse.json({ error: "Request failed" }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}
