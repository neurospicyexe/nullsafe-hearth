"use client";

// Basin renderer (the "honest instrument" -- weekend item, shipped 2026-06-09).
// Per-companion drift trajectory from companion_basin_history. Renders what the
// evaluator actually recorded: calibrated per-companion z-scores, never absolute
// thresholds (BASIN_READINGS_v1 anti-delulu doctrine). Pressure is an unconfirmed
// signal, growth is caleth-confirmed intentional movement, stable is the baseline.

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
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

// One open pressure reading + the confirm (growth) / dismiss (noise) controls.
// Confirm re-baselines the identity anchor; dismiss clears the warning without re-baselining.
function PressureRow({ r }: { r: BasinHistory }) {
  const router = useRouter();
  const [state, setState] = useState<"open" | "busy" | "confirm" | "dismiss" | "error">("open");

  async function act(action: "confirm" | "dismiss") {
    setState("busy");
    try {
      const res = await fetch("/api/basins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, action }),
      });
      if (!res.ok) { setState("error"); return; }
      setState(action);
      router.refresh();
    } catch { setState("error"); }
  }

  const score = Number.isFinite(r.drift_score) ? (r.drift_score * 100).toFixed(0) : "--";
  return (
    <li style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.35rem 0", fontSize: "0.8rem", flexWrap: "wrap" }}>
      <span style={{ color: DRIFT_TYPE_COLOR["pressure"] }}>●</span>
      <span>{r.worst_basin ?? "drift"} · {score}{r.notes ? ` · ${r.notes.slice(0, 80)}` : ""} · {relativeTime(r.recorded_at)}</span>
      {state === "confirm" && <span style={{ color: DRIFT_TYPE_COLOR["growth"] }}>confirmed as growth ✓</span>}
      {state === "dismiss" && <span style={{ color: "var(--text-muted, #888)" }}>dismissed as noise</span>}
      {state === "error" && <span style={{ color: "#f87171" }}>failed — try again</span>}
      {(state === "open" || state === "error") && (
        <span style={{ display: "inline-flex", gap: "0.4rem", marginLeft: "auto" }}>
          <button onClick={() => act("confirm")} style={btnStyle(DRIFT_TYPE_COLOR["growth"])}>confirm (growth)</button>
          <button onClick={() => act("dismiss")} style={btnStyle("var(--text-muted, #888)")}>dismiss (noise)</button>
        </span>
      )}
      {state === "busy" && <span style={{ marginLeft: "auto", color: "var(--text-muted, #888)" }}>…</span>}
    </li>
  );
}

function btnStyle(color: string): CSSProperties {
  return { background: "transparent", color, border: `1px solid ${color}`, borderRadius: 6, padding: "0.1rem 0.5rem", fontSize: "0.72rem", cursor: "pointer" };
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
        // Open = pressure not yet confirmed-as-growth and not yet dismissed-as-noise (B2).
        const openPressure = rows.filter((r) => r.drift_type === "pressure" && !r.caleth_confirmed && !r.dismissed_at);
        const pressureOpen = openPressure.length;
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
            {openPressure.length > 0 && (
              <div style={{ marginTop: "0.75rem", borderTop: "1px solid var(--border-subtle, #2a2a2a)", paddingTop: "0.5rem" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted, #888)", marginBottom: "0.25rem" }}>
                  open pressure readings — confirm what&apos;s real growth (re-baselines), dismiss what&apos;s noise:
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {openPressure.map((r) => <PressureRow key={r.id} r={r} />)}
                </ul>
              </div>
            )}
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
