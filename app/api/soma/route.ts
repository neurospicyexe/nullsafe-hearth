import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const res = await fetch(`${base}/soma`, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    cache: "no-store",
  });

  if (!res.ok) return NextResponse.json({ error: "Halseth /soma failed" }, { status: res.status });
  return NextResponse.json(await res.json());
}
