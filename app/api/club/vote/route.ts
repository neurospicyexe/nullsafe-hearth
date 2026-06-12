import { NextRequest, NextResponse } from "next/server";

const MAX_REASON_LENGTH = 500;

// Raziel's pre-cast vote from the dashboard. Voter is always 'raziel' here --
// companions vote in-voice at the worker's voting tick, never through Hearth.
export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const raw = await request.json();
  const recommendation_id = typeof raw.recommendation_id === "string" ? raw.recommendation_id.trim() : "";
  const reason = typeof raw.reason === "string" ? raw.reason.slice(0, MAX_REASON_LENGTH) : null;
  if (!recommendation_id) {
    return NextResponse.json({ error: "recommendation_id required" }, { status: 400 });
  }

  const res = await fetch(`${base}/mind/club/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ recommendation_id, voter: "raziel", reason }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Pass halseth's reason through ("no voting for your own pick", etc.)
    return NextResponse.json({ error: (body as { error?: string }).error ?? "Request failed" }, { status: res.status });
  }
  return NextResponse.json(body);
}
