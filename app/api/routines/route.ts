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

  try {
    const res = await fetch(`${base}/routines`, {
      headers: authHeaders(),
      cache: "no-store", // routines are time-sensitive — always fresh
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const raw = await request.json();
  const body = {
    routine_name: typeof raw.routine_name === "string" ? raw.routine_name : undefined,
    owner:        typeof raw.owner        === "string" ? raw.owner        : undefined,
    notes:        typeof raw.notes        === "string" ? raw.notes        : undefined,
  };
  try {
    const res = await fetch(`${base}/routines`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return NextResponse.json({ error: "Request failed" }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}
