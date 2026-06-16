import { NextRequest, NextResponse } from "next/server";

const BASE = () => {
  const u = process.env.HALSETH_URL;
  if (!u) throw new Error("HALSETH_URL not set");
  return u;
};

const AUTH = (): Record<string, string> => {
  const s = process.env.HALSETH_SECRET;
  return s ? { Authorization: `Bearer ${s}` } : {};
};

// POST /api/uplink
// Body: { spoon_count: number, note: string }
// Fires PATCH /house (spoons) + POST /notes (check-in note)
export async function POST(req: NextRequest) {
  try {
    const { spoon_count, note } = (await req.json()) as {
      spoon_count?: number;
      note?: string;
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...AUTH(),
    };
    const base = BASE();

    const tasks: Promise<Response>[] = [];

    if (typeof spoon_count === "number") {
      tasks.push(
        fetch(`${base}/house`, {
          method: "POST",
          headers,
          body: JSON.stringify({ spoon_count }),
          signal: AbortSignal.timeout(10_000),
        }),
      );
    }

    if (note && note.trim()) {
      tasks.push(
        fetch(`${base}/notes`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            author: "raziel",
            content: note,
            note_type: "uplink",
          }),
          signal: AbortSignal.timeout(10_000),
        }),
      );
    }

    if (tasks.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const settled = await Promise.allSettled(tasks);
    const failed = settled.filter(
      (s) => s.status === "rejected" || (s.status === "fulfilled" && !s.value.ok),
    );

    if (failed.length > 0) {
      return NextResponse.json(
        { error: `${failed.length} upstream call(s) failed` },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, sent: tasks.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 },
    );
  }
}
