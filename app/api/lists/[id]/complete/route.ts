import { NextRequest, NextResponse } from "next/server";

function authHeaders(): Record<string, string> {
  const secret = process.env.HALSETH_SECRET;
  return secret ? { Authorization: `Bearer ${secret}` } : {};
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const base = process.env.HALSETH_URL;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const { id } = await params;
  const res = await fetch(`${base}/lists/${id}/complete`, {
    method: "POST",
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: "Request failed" }, { status: res.status });
  return NextResponse.json(await res.json());
}
