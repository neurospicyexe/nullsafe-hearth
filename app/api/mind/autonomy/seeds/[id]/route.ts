import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const res = await fetch(`${base}/mind/autonomy/seeds/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) return NextResponse.json({ error: "Request failed" }, { status: res.status });
  return NextResponse.json(await res.json());
}
