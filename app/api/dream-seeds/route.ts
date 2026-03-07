import { NextRequest, NextResponse } from "next/server";

const base = () => process.env.HALSETH_URL!;
const authHeader = () => {
  const s = process.env.HALSETH_SECRET;
  return s ? { Authorization: `Bearer ${s}` } : {};
};

export async function GET() {
  const res = await fetch(`${base()}/dream-seeds`, {
    headers: authHeader(),
    cache: "no-store",
  });
  if (!res.ok) return NextResponse.json([], { status: 200 });
  return NextResponse.json(await res.json());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${base()}/dream-seeds`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
