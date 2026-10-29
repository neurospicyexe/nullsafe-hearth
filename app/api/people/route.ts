import { NextRequest, NextResponse } from "next/server";

// Raziel's people list (Halseth mig 0149, map M5).
//   POST { action: "add", label, match_names?: string[], kind?, note? } -> Halseth POST /mind/people
//   POST { action: "archive", id }                                      -> POST /mind/people/:id/archive
// Halseth records added_by = 'raziel'. Links appear at the next graph rebuild.
const KINDS = new Set(["headmate", "person", "pet", "other"]);

export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });
  const raw = await request.json().catch(() => ({}));
  const headers = { "Content-Type": "application/json", ...(secret ? { Authorization: `Bearer ${secret}` } : {}) };

  let path: string;
  let body: unknown;
  if (raw.action === "archive" && typeof raw.id === "string" && /^[\w-]+$/.test(raw.id)) {
    path = `/mind/people/${raw.id}/archive`;
    body = {};
  } else if (raw.action === "add" && typeof raw.label === "string" && raw.label.trim()) {
    path = "/mind/people";
    body = {
      label: raw.label.trim(),
      match_names: Array.isArray(raw.match_names) ? raw.match_names.filter((x: unknown) => typeof x === "string") : [],
      kind: typeof raw.kind === "string" && KINDS.has(raw.kind) ? raw.kind : "person",
      note: typeof raw.note === "string" ? raw.note : null,
    };
  } else {
    return NextResponse.json({ error: 'need { action: "add", label } or { action: "archive", id }' }, { status: 400 });
  }

  try {
    const res = await fetch(`${base}${path}`, {
      cache: "no-store", method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000),
    });
    const out = await res.json().catch(() => ({}));
    return NextResponse.json(out, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}
