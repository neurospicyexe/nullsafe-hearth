import { NextRequest, NextResponse } from "next/server";

const ACTIONS = new Set(["feed", "play", "talk", "give"]);

// Raziel tends a creature from the dashboard.
// Proxies to Halseth POST /mind/creatures/:id/interact with actor=raziel.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const raw = await request.json().catch(() => ({}));
  const action = typeof raw.action === "string" ? raw.action.trim().toLowerCase() : "";
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: "action must be feed, play, talk, or give" }, { status: 400 });
  }
  const note = typeof raw.note === "string" ? raw.note.slice(0, 500) : undefined;

  try {
    const res = await fetch(`${base}/mind/creatures/${encodeURIComponent(id)}/interact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ actor: "raziel", action, ...(note ? { note } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}
