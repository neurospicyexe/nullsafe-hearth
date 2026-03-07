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

// GET /api/feelings?limit=N&type=dreams
// type=dreams -> proxies to /dreams; default -> proxies to /deltas
export async function GET(req: Request) {
  const url   = new URL(req.url);
  const limit = url.searchParams.get("limit") ?? "50";
  const type  = url.searchParams.get("type");

  const path = type === "dreams"
    ? `/dreams?limit=${limit}`
    : `/deltas?limit=${limit}`;

  try {
    const res = await fetch(`${BASE()}${path}`, {
      headers: AUTH(),
      next: { revalidate: 15 },
    });
    if (!res.ok) return NextResponse.json([]);
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json([]);
  }
}
