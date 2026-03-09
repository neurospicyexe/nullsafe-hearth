import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const raw = await request.json();
  const body = {
    current_room:       typeof raw.current_room       === "string" ? raw.current_room       : undefined,
    companion_mood:     typeof raw.companion_mood     === "string" ? raw.companion_mood     : undefined,
    companion_activity: typeof raw.companion_activity === "string" ? raw.companion_activity : undefined,
    spoon_count:        typeof raw.spoon_count        === "number" ? raw.spoon_count        : undefined,
    love_meter:         typeof raw.love_meter         === "number" ? raw.love_meter         : undefined,
  };
  const res = await fetch(`${base}/house`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return NextResponse.json({ error: "Request failed" }, { status: res.status });
  return NextResponse.json(await res.json());
}
