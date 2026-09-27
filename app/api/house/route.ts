import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const raw = await request.json();
  // null is a real value here (clear the field); Halseth binds it. Stripping it made
  // "clear room" report saved while the room stayed put.
  const strOrNull = (v: unknown) => (typeof v === "string" || v === null ? v : undefined);
  const body = {
    current_room:       strOrNull(raw.current_room),
    companion_mood:     strOrNull(raw.companion_mood),
    companion_activity: strOrNull(raw.companion_activity),
    spoon_count:        typeof raw.spoon_count        === "number" ? raw.spoon_count        : undefined,
    love_meter:         typeof raw.love_meter         === "number" ? raw.love_meter         : undefined,
  };
  try {
    const res = await fetch(`${base}/house`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return NextResponse.json({ error: "Request failed" }, { status: res.status });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}
