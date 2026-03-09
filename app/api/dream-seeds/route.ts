import { NextRequest, NextResponse } from "next/server";

const base = () => process.env.HALSETH_URL!;
const authHeader = (): Record<string, string> => {
  const s = process.env.HALSETH_SECRET;
  return s ? { Authorization: `Bearer ${s}` } : {};
};

export async function GET() {
  const res = await fetch(`${base()}/dream-seeds`, {
    headers: authHeader(),
    next: { revalidate: 0 },
  });
  if (!res.ok) return NextResponse.json([], { status: 200 });
  return NextResponse.json(await res.json());
}

export async function POST(req: NextRequest) {
  const raw = await req.json();
  const VALID_COMPANIONS = new Set(["drevan", "cypher", "gaia"]);
  const body = {
    content:       typeof raw.content       === "string" ? raw.content : undefined,
    for_companion: typeof raw.for_companion === "string" && VALID_COMPANIONS.has(raw.for_companion)
                     ? raw.for_companion : undefined,
  };
  const res = await fetch(`${base()}/dream-seeds`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) return NextResponse.json({ error: "Request failed" }, { status: res.status });
  return NextResponse.json(await res.json());
}
