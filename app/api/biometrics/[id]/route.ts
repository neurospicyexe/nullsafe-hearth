import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

function config() {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return { error: NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 }) };
  if (!secret) return { error: NextResponse.json({ error: "HALSETH_SECRET not set" }, { status: 500 }) };
  return { base, secret };
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const cfg = config();
  if ("error" in cfg) return cfg.error;
  const { id } = await params;

  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const r = raw as Record<string, unknown>;

  // Allowlist: only the fields a check-in can be amended with.
  const body: Record<string, unknown> = {};
  if (typeof r["spoons"] === "number" && Number.isFinite(r["spoons"])) body.spoons = r["spoons"];
  if (typeof r["mood"] === "string") body.mood = r["mood"].slice(0, 80);
  if (typeof r["energy"] === "number" && Number.isInteger(r["energy"])) body.energy = r["energy"];

  try {
    const upstream = await fetch(`${cfg.base}/biometrics/${encodeURIComponent(id)}`, {
      cache: "no-store",
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.secret}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await upstream.json();

    // Same house mirror as POST: best-effort, clamped 0-12.
    if (upstream.ok && typeof body.spoons === "number") {
      const spoonCount = Math.min(12, Math.max(0, Math.round(body.spoons)));
      await fetch(`${cfg.base}/house`, {
        cache: "no-store",
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.secret}` },
        body: JSON.stringify({ spoon_count: spoonCount }),
        signal: AbortSignal.timeout(10_000),
      }).catch(() => {});
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const cfg = config();
  if ("error" in cfg) return cfg.error;
  const { id } = await params;

  try {
    const upstream = await fetch(`${cfg.base}/biometrics/${encodeURIComponent(id)}`, {
      cache: "no-store",
      method: "DELETE",
      headers: { Authorization: `Bearer ${cfg.secret}` },
      signal: AbortSignal.timeout(10_000),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Halseth unreachable" }, { status: 502 });
  }
}
