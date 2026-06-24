import { NextRequest, NextResponse } from "next/server";

const VALID_ACTIONS = new Set(["accept", "decline"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const { id, action } = await params;
  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  // The Halseth accept/decline handlers require { companion_id } in the body for the
  // ownership guard -- forward the inbound body or every UI accept/decline 400s.
  let body: unknown = {};
  try { body = await req.json(); } catch { body = {}; }

  try {
    const res = await fetch(`${base}/mind/growth/journal/${id}/${action}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return NextResponse.json({ error: "Request failed" }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}
