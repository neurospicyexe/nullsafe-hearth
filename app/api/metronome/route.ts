import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const url = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!url || !secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  try {
    const body = await req.json() as unknown;
    const res = await fetch(`${url}/mind/metronome/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
