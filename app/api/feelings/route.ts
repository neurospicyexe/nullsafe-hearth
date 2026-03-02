import { NextResponse } from "next/server";

const BASE = () => {
  const u = process.env.HALSETH_URL;
  if (!u) throw new Error("HALSETH_URL not set");
  return u;
};

const AUTH = (): Record<string, string> => {
  const s = process.env.HALSETH_SECRET;
  return s ? { Authorization: `Bearer ${s}` } : {};
};

// GET /api/feelings?limit=N
// Proxies to Halseth /deltas endpoint.
// Returns [] if endpoint doesn't exist yet (404).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = url.searchParams.get("limit") ?? "50";

  try {
    const base = BASE();
    const res = await fetch(`${base}/deltas?limit=${limit}`, {
      headers: AUTH(),
      next: { revalidate: 15 },
    });

    if (res.status === 404) {
      return NextResponse.json([]);
    }

    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
