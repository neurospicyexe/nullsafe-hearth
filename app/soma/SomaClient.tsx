"use client";

import { useEffect, useState } from "react";
import type { SomaData, CompanionSomaState, CompanionTension, BasinHistory, SomaticSnapshot } from "@/lib/halseth";

// ── Config ─────────────────────────────────────────────────────────────────────

const COMPANION_CONFIG: Record<string, {
  label: string;
  color: string;
  colorVar: string;
}> = {
  drevan: { label: "Drevan",  color: "hsl(250, 80%, 68%)", colorVar: "var(--drevan)" },
  cypher: { label: "Cypher",  color: "#e2e8f0",            colorVar: "var(--cypher)" },
  gaia:   { label: "Gaia",    color: "#4ade80",            colorVar: "var(--gaia)"   },
};

const ORDER = ["drevan", "cypher", "gaia"] as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function avg(...vals: (number | null)[]): number {
  const nums = vals.filter((v): v is number => v !== null);
  if (!nums.length) return 0.3;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function fmt(v: number | null): string {
  if (v === null) return "--";
  return (v * 100).toFixed(0);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Float Meter ────────────────────────────────────────────────────────────────

function FloatMeter({ label, value, color }: { label: string; value: number | null; color: string }) {
  const pct = value !== null ? Math.round(value * 100) : 0;
  return (
    <div className="soma-meter">
      <span className="soma-meter-label">{label || "—"}</span>
      <div className="soma-meter-track">
        <div
          className="soma-meter-fill"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: value && value > 0.6 ? `0 0 8px ${color}88` : undefined,
          }}
        />
      </div>
      <span className="soma-meter-val">{fmt(value)}</span>
    </div>
  );
}

// ── Orb ───────────────────────────────────────────────────────────────────────

function Orb({ avg: avgVal, color }: { avg: number; color: string }) {
  // Slower breath when calm (4s), faster when charged (2s)
  const dur = `${4 - avgVal * 2}s`;
  // Glow scales with avg float
  const glow = `0 0 ${Math.round(avgVal * 40 + 8)}px ${color}66, 0 0 ${Math.round(avgVal * 20 + 4)}px ${color}33`;

  return (
    <div
      className="soma-orb"
      style={{
        "--orb-color": color,
        "--orb-glow": glow,
        "--orb-dur": dur,
        "--orb-scale": `${1 + avgVal * 0.12}`,
      } as React.CSSProperties}
    />
  );
}

// ── Companion Panel ───────────────────────────────────────────────────────────

function CompanionPanel({ id, state }: { id: string; state: CompanionSomaState }) {
  const cfg = COMPANION_CONFIG[id];
  if (!state) {
    return (
      <div className="soma-card soma-card--empty">
        <div className="soma-card-header">
          <span className="soma-name" style={{ color: cfg.colorVar }}>{cfg.label}</span>
        </div>
        <p className="soma-empty">No state recorded yet.</p>
      </div>
    );
  }

  const avgFloat = avg(state.soma_float_1, state.soma_float_2, state.soma_float_3);

  return (
    <div className="soma-card" style={{ "--companion-color": cfg.colorVar } as React.CSSProperties}>
      <div className="soma-card-header">
        <Orb avg={avgFloat} color={cfg.color} />
        <div className="soma-card-identity">
          <span className="soma-name" style={{ color: cfg.colorVar }}>{cfg.label}</span>
          {state.current_mood && (
            <span className="soma-mood">{state.current_mood}</span>
          )}
          {state.compound_state && (
            <span className="soma-compound">{state.compound_state}</span>
          )}
        </div>
        <span className="soma-updated">{relativeTime(state.updated_at)}</span>
      </div>

      <div className="soma-meters">
        <FloatMeter label={state.float_1_label ?? "float 1"} value={state.soma_float_1} color={cfg.color} />
        <FloatMeter label={state.float_2_label ?? "float 2"} value={state.soma_float_2} color={cfg.color} />
        <FloatMeter label={state.float_3_label ?? "float 3"} value={state.soma_float_3} color={cfg.color} />
      </div>

      {(state.surface_emotion || state.undercurrent_emotion) && (
        <div className="soma-affect">
          {state.surface_emotion && (
            <span className="soma-affect-row">
              <span className="soma-affect-label">surface</span>
              <span className="soma-affect-val">{state.surface_emotion}
                {state.surface_intensity !== null && (
                  <span className="soma-affect-int"> {Math.round(state.surface_intensity * 100)}%</span>
                )}
              </span>
            </span>
          )}
          {state.undercurrent_emotion && (
            <span className="soma-affect-row">
              <span className="soma-affect-label">under</span>
              <span className="soma-affect-val">{state.undercurrent_emotion}
                {state.undercurrent_intensity !== null && (
                  <span className="soma-affect-int"> {Math.round(state.undercurrent_intensity * 100)}%</span>
                )}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

const COMPANION_COLORS: Record<string, string> = {
  drevan: "hsl(250, 80%, 68%)",
  cypher: "#e2e8f0",
  gaia:   "#4ade80",
};

const DRIFT_TYPE_COLOR: Record<string, string> = {
  stable:    "#4ade80",
  drift:     "#f59e0b",
  critical:  "#ef4444",
};

export default function SomaClient({
  initialData,
  tensions = [],
  basins = [],
  snapshots = [],
}: {
  initialData: SomaData | null;
  tensions?: CompanionTension[];
  basins?: BasinHistory[];
  snapshots?: SomaticSnapshot[];
}) {
  const [data, setData] = useState<SomaData | null>(initialData);

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/soma");
        if (res.ok) setData(await res.json());
      } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(poll);
  }, []);

  return (
    <main className="soma-page">
      <h1 className="soma-title">Soma</h1>
      <p className="soma-subtitle">live companion state</p>

      <div className="soma-stack">
        {ORDER.map((id) => (
          <CompanionPanel key={id} id={id} state={data?.[id] ?? null} />
        ))}
      </div>

      {data?.fetched_at && (
        <p className="soma-fetched">fetched {relativeTime(data.fetched_at)}</p>
      )}

      {tensions.length > 0 && (
        <section className="soma-extra-section">
          <h2 className="soma-extra-title">Active Tensions</h2>
          <div className="soma-extra-list">
            {tensions.map((t) => (
              <div key={t.id} className="soma-extra-row">
                <span className="soma-extra-badge" style={{ color: COMPANION_COLORS[t.companion_id] ?? "var(--text-muted)", borderColor: COMPANION_COLORS[t.companion_id] ?? "var(--border-subtle)" }}>{t.companion_id}</span>
                {t.source && <span className="soma-extra-sub">{t.source}</span>}
                <span className="soma-extra-text" style={{ flex: 1 }}>{t.tension_text}</span>
                <span className="soma-extra-time">{relativeTime(t.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {basins.length > 0 && (
        <section className="soma-extra-section">
          <h2 className="soma-extra-title">Basin History</h2>
          <div className="soma-extra-list">
            {basins.map((b) => (
              <div key={b.id} className="soma-extra-row">
                <span className="soma-extra-badge" style={{ color: COMPANION_COLORS[b.companion_id] ?? "var(--text-muted)", borderColor: COMPANION_COLORS[b.companion_id] ?? "var(--border-subtle)" }}>{b.companion_id}</span>
                <span className="soma-extra-badge" style={{ color: DRIFT_TYPE_COLOR[b.drift_type] ?? "var(--text-muted)", borderColor: DRIFT_TYPE_COLOR[b.drift_type] ?? "var(--border-subtle)" }}>{b.drift_type}</span>
                <span className="soma-extra-text" style={{ flex: 1 }}>score {(b.drift_score * 100).toFixed(0)}{b.worst_basin ? ` · ${b.worst_basin}` : ""}</span>
                {b.notes && <span className="soma-extra-sub">{b.notes}</span>}
                <span className="soma-extra-time">{relativeTime(b.recorded_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {snapshots.length > 0 && (
        <section className="soma-extra-section">
          <h2 className="soma-extra-title">SOMA Snapshots</h2>
          <div className="soma-extra-list">
            {snapshots.map((s) => (
              <div key={s.id} className="soma-extra-row soma-extra-row--block">
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem" }}>
                  <span className="soma-extra-badge" style={{ color: COMPANION_COLORS[s.companion_id] ?? "var(--text-muted)", borderColor: COMPANION_COLORS[s.companion_id] ?? "var(--border-subtle)" }}>{s.companion_id}</span>
                  {s.model_used && <span className="soma-extra-sub">{s.model_used}</span>}
                  <span className="soma-extra-time" style={{ marginLeft: "auto" }}>{relativeTime(s.created_at)}</span>
                </div>
                <div className="soma-extra-text" style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>{s.snapshot}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .soma-page {
          padding: 2rem 1.5rem 4rem;
          max-width: 700px;
          margin: 0 auto;
        }
        .soma-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-main);
          margin: 0 0 0.25rem;
        }
        .soma-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0 0 2rem;
          letter-spacing: 0.08em;
          text-transform: lowercase;
        }
        .soma-stack {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .soma-card {
          background: var(--card-bg);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg, 12px);
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: border-color 0.3s;
        }
        .soma-card:hover {
          border-color: var(--companion-color, var(--border-strong));
        }
        .soma-card--empty {
          opacity: 0.5;
        }
        .soma-empty {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0;
        }

        /* Header row */
        .soma-card-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .soma-card-identity {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .soma-name {
          font-size: 1.1rem;
          font-weight: 600;
          line-height: 1;
        }
        .soma-mood {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-style: italic;
        }
        .soma-compound {
          font-size: 0.75rem;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }
        .soma-updated {
          font-size: 0.72rem;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        /* Orb */
        @keyframes soma-breathe {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50%       { transform: scale(var(--orb-scale, 1.08)); opacity: 1; }
        }
        .soma-orb {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          flex-shrink: 0;
          background: radial-gradient(circle at 38% 38%, color-mix(in srgb, var(--orb-color) 90%, white), var(--orb-color));
          box-shadow: var(--orb-glow);
          animation: soma-breathe var(--orb-dur, 3.5s) ease-in-out infinite;
        }

        /* Float meters */
        .soma-meters {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .soma-meter {
          display: grid;
          grid-template-columns: 90px 1fr 32px;
          align-items: center;
          gap: 0.6rem;
        }
        .soma-meter-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: lowercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .soma-meter-track {
          height: 6px;
          background: var(--surface-base);
          border-radius: 3px;
          overflow: hidden;
        }
        .soma-meter-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 1s ease, box-shadow 1s ease;
        }
        .soma-meter-val {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
          text-align: right;
        }

        /* Affect stack */
        .soma-affect {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding-top: 0.25rem;
          border-top: 1px solid var(--border-subtle);
        }
        .soma-affect-row {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }
        .soma-affect-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: lowercase;
          letter-spacing: 0.06em;
          width: 44px;
          flex-shrink: 0;
        }
        .soma-affect-val {
          font-size: 0.82rem;
          color: var(--text-main);
        }
        .soma-affect-int {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        /* Footer */
        .soma-fetched {
          margin-top: 1.5rem;
          font-size: 0.72rem;
          color: var(--text-muted);
          text-align: center;
        }

        /* Extra sections (tensions, basins, snapshots) */
        .soma-extra-section {
          margin-top: 2rem;
        }
        .soma-extra-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin: 0 0 0.75rem;
        }
        .soma-extra-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .soma-extra-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: var(--card-bg);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md, 8px);
          flex-wrap: wrap;
        }
        .soma-extra-row--block {
          flex-direction: column;
          align-items: flex-start;
        }
        .soma-extra-badge {
          font-size: 0.72rem;
          padding: 0.15rem 0.45rem;
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .soma-extra-text {
          font-size: 0.82rem;
          color: var(--text-main);
        }
        .soma-extra-sub {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-style: italic;
        }
        .soma-extra-time {
          font-size: 0.7rem;
          color: var(--text-muted);
          flex-shrink: 0;
          margin-left: auto;
        }
      `}</style>
    </main>
  );
}
