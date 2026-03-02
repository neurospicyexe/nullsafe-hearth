import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const res = await fetch(`${base}/bridge`, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    next: { revalidate: 30 },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
