import { NextRequest, NextResponse } from "next/server";

function authHeaders(withContentType = false): Record<string, string> {
  const secret = process.env.HALSETH_SECRET;
  return {
    ...(withContentType ? { "Content-Type": "application/json" } : {}),
    ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
  };
}

export async function GET() {
  const base = process.env.HALSETH_URL;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const res = await fetch(`${base}/routines`, {
    headers: authHeaders(),
    cache: "no-store", // routines are time-sensitive — always fresh
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const body = await request.json();
  const res = await fetch(`${base}/routines`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
