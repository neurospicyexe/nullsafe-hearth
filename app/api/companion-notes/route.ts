import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const res = await fetch(`${base}/companion-notes`, {
    headers: { ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
    next: { revalidate: 30 },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const body = await request.json();
  const res = await fetch(`${base}/companion-notes`, {
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
