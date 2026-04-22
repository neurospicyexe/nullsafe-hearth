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
  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 100));
  const type  = url.searchParams.get("type");

  const path = type === "dreams"
    ? `/dreams?limit=${limit}`
    : type === "companion-dreams"
    ? `/ingest/companion-dreams?limit=${limit}`
    : `/deltas?limit=${limit}`;

  try {
    const res = await fetch(`${BASE()}${path}`, {
      headers: AUTH(),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: `Halseth returned ${res.status}` }, { status: 502 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}
