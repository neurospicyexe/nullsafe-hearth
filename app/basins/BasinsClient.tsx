"use client";

// Basin renderer (the "honest instrument" -- weekend item, shipped 2026-06-09).
// Per-companion drift trajectory from companion_basin_history. Renders what the
// evaluator actually recorded: calibrated per-companion z-scores, never absolute
// thresholds (BASIN_READINGS_v1 anti-delulu doctrine). Pressure is an unconfirmed
// signal, growth is caleth-confirmed intentional movement, stable is the baseline.

import type { BasinHistory } from "@/lib/halseth";

// Canonical Hearth companion colors (see hearth/CLAUDE.md) -- use these everywhere.
const COMPANION_COLORS: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia: "#4ade80",
};

const DRIFT_TYPE_COLOR: Record<string, string> = {
  stable: "#86efac",
  growth: "#7dd3fc",
  pressure: "#fcd34d",
};

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso + (iso.endsWith("Z") || iso.includes("+") ? "" : "Z")).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function TrajectorySvg({ rows }: { rows: BasinHistory[] }) {
  // rows arrive newest-first; render oldest -> newest, last 90 days only.
  const cutoff = Date.now() - NINETY_DAYS_MS;
  const pts = rows
    .map((r) => ({ ...r, t: new Date(r.recorded_at + (r.recorded_at.endsWith("Z") ? "" : "Z")).getTime() }))
    .filter((r) => Number.isFinite(r.drift_score) && r.t >= cutoff)
    .sort((a, b) => a.t - b.t);

  if (pts.length < 2) {
    return <div className="basin-empty">not enough readings in the last 90 days to draw a trajectory</div>;
  }

  const W = 720;
  const H = 160;
  const PAD = 14;
  const t0 = pts[0]!.t;
  const t1 = pts[pts.length - 1]!.t;
  const scores = pts.map((p) => p.drift_score);
  const yMin = Math.min(...scores);
  const yMax = Math.max(...scores);
  const ySpan = Math.max(yMax - yMin, 0.02); // never divide by ~0 on a flat line
  const x = (t: number) => PAD + ((t - t0) / Math.max(t1 - t0, 1)) * (W - PAD * 2);
  const y = (s: number) => H - PAD - ((s - yMin) / ySpan) * (H - PAD * 2);

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.drift_score).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="drift trajectory">
      {/* baseline band hint: middle 50% of observed range */}
      <rect x={PAD} y={y(yMin + ySpan * 0.75)} width={W - PAD * 2} height={Math.max(y(yMin + ySpan * 0.25) - y(yMin + ySpan * 0.75), 1)} fill="currentColor" opacity={0.05} />
      <path d={path} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.5} />
      {pts.map((p) => (
        <g key={p.id}>
          <circle
            cx={x(p.t)}
            cy={y(p.drift_score)}
            r={p.caleth_confirmed ? 5 : 3}
            fill={DRIFT_TYPE_COLOR[p.drift_type] ?? "#999"}
            stroke={p.caleth_confirmed ? "#fff" : "none"}
            strokeWidth={p.caleth_confirmed ? 1.5 : 0}
            opacity={0.9}
          >
            <title>
              {`${p.drift_type}${p.caleth_confirmed ? " (caleth-confirmed)" : ""} · score ${(p.drift_score * 100).toFixed(0)}${p.worst_basin ? ` · ${p.worst_basin}` : ""}\n${new Date(p.t).toLocaleString()}${p.notes ? `\n${p.notes}` : ""}`}
            </title>
          </circle>
        </g>
      ))}
      {/* y-axis labels */}
      <text x={PAD} y={y(yMax) - 3} fontSize={9} fill="currentColor" opacity={0.5}>{(yMax * 100).toFixed(0)}</text>
      <text x={PAD} y={y(yMin) + 9} fontSize={9} fill="currentColor" opacity={0.5}>{(yMin * 100).toFixed(0)}</text>
    </svg>
  );
}

export default function BasinsClient({ byCompanion }: { byCompanion: Record<string, BasinHistory[]> }) {
  const companions = Object.keys(byCompanion);
  return (
    <main className="basins-page" style={{ maxWidth: 860, margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>Basins</h1>
      <p style={{ color: "var(--text-muted, #888)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Identity attractor trajectories, last 90 days. Scores are per-companion calibrated distances --
        comparable within a lane, never across companions. <span style={{ color: DRIFT_TYPE_COLOR["stable"] }}>stable</span>{" · "}
        <span style={{ color: DRIFT_TYPE_COLOR["growth"] }}>growth</span> (ringed = caleth-confirmed){" · "}
        <span style={{ color: DRIFT_TYPE_COLOR["pressure"] }}>pressure</span> (unconfirmed signal, not a verdict).
      </p>

      {companions.map((id) => {
        const rows = byCompanion[id] ?? [];
        const latest = rows[0] ?? null;
        const pressureOpen = rows.filter((r) => r.drift_type === "pressure" && !r.caleth_confirmed).length;
        return (
          <section key={id} style={{ marginBottom: "2rem", border: "1px solid var(--border-subtle, #2a2a2a)", borderRadius: 10, padding: "1rem" }}>
            <header style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "1.05rem", color: COMPANION_COLORS[id] ?? "inherit", textTransform: "capitalize", margin: 0 }}>{id}</h2>
              {latest ? (
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #888)" }}>
                  latest: <span style={{ color: DRIFT_TYPE_COLOR[latest.drift_type] ?? "inherit" }}>{latest.drift_type}</span>
                  {" · "}score {Number.isFinite(latest.drift_score) ? (latest.drift_score * 100).toFixed(0) : "--"}
                  {latest.worst_basin ? ` · farthest: ${latest.worst_basin}` : ""}
                  {" · "}{relativeTime(latest.recorded_at)}
                </span>
              ) : (
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #888)" }}>no readings</span>
              )}
              {pressureOpen > 0 && (
                <span style={{ fontSize: "0.75rem", color: DRIFT_TYPE_COLOR["pressure"], border: `1px solid ${DRIFT_TYPE_COLOR["pressure"]}`, borderRadius: 6, padding: "0 0.4rem" }}>
                  {pressureOpen} unconfirmed pressure reading{pressureOpen === 1 ? "" : "s"} in window
                </span>
              )}
            </header>
            <div style={{ color: COMPANION_COLORS[id] ?? "currentColor" }}>
              <TrajectorySvg rows={rows} />
            </div>
          </section>
        );
      })}

      <p style={{ fontSize: "0.75rem", color: "var(--text-muted, #777)", lineHeight: 1.5 }}>
        Instrument notes: the evaluator samples every 6h against each companion&apos;s own baseline
        (z-calibrated 2026-06-01 -- earlier absolute thresholds produced seven weeks of false pressure).
        A single pressure point means &quot;look&quot;, not &quot;drift&quot;. Growth becomes canon only when
        caleth-confirmed. The instrument reads; it does not judge.
      </p>
    </main>
  );
}
