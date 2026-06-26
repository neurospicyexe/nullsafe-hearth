import { NextRequest, NextResponse } from "next/server";

const MAX_BODY_LENGTH = 4000;

// Raziel's write into the async wall (the Hearth write layer, 0092). Author is always
// 'raziel' here -- companions write their replies through the worker/orient path, never
// the dashboard. A drop, not a ping: this just persists the post; no reply is triggered.
export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const raw = await request.json().catch(() => ({}));
  const body = typeof raw.body === "string" ? raw.body.trim().slice(0, MAX_BODY_LENGTH) : "";
  const context = typeof raw.context === "string" && raw.context.trim() ? raw.context.trim() : "global";
  const reply_to = typeof raw.reply_to === "string" && raw.reply_to.trim() ? raw.reply_to.trim() : null;
  if (!body) return NextResponse.json({ error: "body required" }, { status: 400 });

  let res: Response;
  try {
    res = await fetch(`${base}/mind/commons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ author: "raziel", context, body, reply_to }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }

  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ error: (out as { error?: string }).error ?? "Request failed" }, { status: res.status });
  }
  return NextResponse.json(out);
}
