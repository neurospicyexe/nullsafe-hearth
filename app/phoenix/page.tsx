export const dynamic = 'force-dynamic';

import {
  fetchWmOrient,
  fetchSomaStates,
  fetchAutonomyRuns,
} from "@/lib/halseth";
import type {
  WmOrientData,
  SomaData,
  CompanionSomaState,
  AutonomyRun,
} from "@/lib/halseth";
import { COMPANION_CONFIG, fmtTime } from "@/app/companions/[id]/sections";

const COMPANIONS = ["drevan", "cypher", "gaia"] as const;
type CompanionId = typeof COMPANIONS[number];

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function SomaBlock({ soma }: { soma: CompanionSomaState }) {
  if (!soma) {
    return (
      <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>
        No SOMA data
      </p>
    );
  }

  const floats = [
    { label: soma.float_1_label, value: soma.soma_float_1 },
    { label: soma.float_2_label, value: soma.soma_float_2 },
    { label: soma.float_3_label, value: soma.soma_float_3 },
  ].filter((f): f is { label: string; value: number | null } => f.label != null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {floats.map((f) => (
        <div
          key={f.label}
          style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}
        >
          <span style={{ color: "#94a3b8" }}>{f.label}</span>
          <span style={{ color: "#e2e8f0", fontVariantNumeric: "tabular-nums" }}>
            {f.value != null ? f.value.toFixed(2) : "--"}
          </span>
        </div>
      ))}
      {soma.compound_state && (
        <span
          className="badge"
          style={{
            marginTop: "0.25rem",
            alignSelf: "flex-start",
            background: "#6366f122",
            color: "#818cf8",
            border: "1px solid #6366f144",
            fontSize: "0.72rem",
          }}
        >
          {soma.compound_state}
        </span>
      )}
    </div>
  );
}

function CompanionColumn({
  id,
  orient,
  soma,
  lastRun,
}: {
  id: CompanionId;
  orient: WmOrientData | null;
  soma: CompanionSomaState;
  lastRun: AutonomyRun | null;
}) {
  const config = COMPANION_CONFIG[id];

  return (
    <div
      className="card"
      style={{
        border: `1px solid ${config.color}33`,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ color: config.color, fontWeight: 700, fontSize: "1rem" }}>
          {config.sym} {config.display}
        </span>
      </div>

      {/* SOMA */}
      <div>
        <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
          SOMA
        </span>
        <SomaBlock soma={soma} />
      </div>

      {/* Top threads */}
      <div>
        <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
          Top Threads
          {orient && (
            <span style={{ marginLeft: "0.4rem", color: "#64748b", fontWeight: 400 }}>
              ({orient.open_thread_count} open)
            </span>
          )}
        </span>
        {!orient || orient.top_threads.length === 0 ? (
          <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>
            No threads
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {orient.top_threads.slice(0, 3).map((t) => (
              <div
                key={t.thread_key}
                className="section-row"
                style={{ flexWrap: "wrap", gap: "0.35rem" }}
              >
                <span
                  className="section-row-text"
                  style={{ fontSize: "0.82rem", flex: "1 1 auto" }}
                >
                  {t.title}
                </span>
                <span
                  className="badge"
                  style={{
                    background: "#6366f122",
                    color: "#818cf8",
                    border: "1px solid #6366f144",
                    fontSize: "0.72rem",
                  }}
                >
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest handoff */}
      {orient?.latest_handoff && (
        <div>
          <span
            className="home-section-title"
            style={{ display: "block", marginBottom: "0.5rem" }}
          >
            Latest Handoff
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <span style={{ fontSize: "0.83rem", color: "#e2e8f0" }}>
              {orient.latest_handoff.title}
            </span>
            {orient.latest_handoff.next_steps && (
              <span className="journal-text" style={{ fontSize: "0.78rem" }}>
                {truncate(orient.latest_handoff.next_steps, 100)}
              </span>
            )}
            <span className="section-row-meta" style={{ fontSize: "0.75rem" }}>
              {fmtTime(orient.latest_handoff.created_at)}
            </span>
          </div>
        </div>
      )}

      {/* Last autonomous run */}
      <div>
        <span
          className="home-section-title"
          style={{ display: "block", marginBottom: "0.5rem" }}
        >
          Last Autonomous Run
        </span>
        {!lastRun ? (
          <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>
            No runs yet
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
              <span
                className="badge"
                style={{
                  background: `${config.color}18`,
                  color: config.color,
                  border: `1px solid ${config.color}33`,
                  fontSize: "0.72rem",
                }}
              >
                {lastRun.run_type}
              </span>
              <span
                className="badge"
                style={{
                  background:
                    lastRun.status === "completed"
                      ? "#22c55e22"
                      : lastRun.status === "failed"
                      ? "#ef444422"
                      : "#64748b22",
                  color:
                    lastRun.status === "completed"
                      ? "#22c55e"
                      : lastRun.status === "failed"
                      ? "#ef4444"
                      : "#94a3b8",
                  border: `1px solid ${
                    lastRun.status === "completed"
                      ? "#22c55e44"
                      : lastRun.status === "failed"
                      ? "#ef444444"
                      : "#64748b44"
                  }`,
                  fontSize: "0.72rem",
                }}
              >
                {lastRun.status}
              </span>
            </div>
            {lastRun.completed_at && (
              <span className="section-row-meta" style={{ fontSize: "0.75rem" }}>
                {fmtTime(lastRun.completed_at)}
              </span>
            )}
            {lastRun.artifacts_created > 0 && (
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                {lastRun.artifacts_created} artifact
                {lastRun.artifacts_created !== 1 ? "s" : ""} created
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function PhoenixPage() {
  const [somaRes, drevanOrientRes, cypherOrientRes, gaiaOrientRes,
         drevanRunsRes, cypherRunsRes, gaiaRunsRes] = await Promise.allSettled([
    fetchSomaStates(),
    fetchWmOrient("drevan"),
    fetchWmOrient("cypher"),
    fetchWmOrient("gaia"),
    fetchAutonomyRuns("drevan", 1),
    fetchAutonomyRuns("cypher", 1),
    fetchAutonomyRuns("gaia", 1),
  ]);

  const soma: SomaData | null =
    somaRes.status === "fulfilled" ? somaRes.value : null;

  const orients: Record<CompanionId, WmOrientData | null> = {
    drevan: drevanOrientRes.status === "fulfilled" ? drevanOrientRes.value : null,
    cypher: cypherOrientRes.status === "fulfilled" ? cypherOrientRes.value : null,
    gaia:   gaiaOrientRes.status   === "fulfilled" ? gaiaOrientRes.value   : null,
  };

  const lastRuns: Record<CompanionId, AutonomyRun | null> = {
    drevan: drevanRunsRes.status === "fulfilled" ? (drevanRunsRes.value[0] ?? null) : null,
    cypher: cypherRunsRes.status === "fulfilled" ? (cypherRunsRes.value[0] ?? null) : null,
    gaia:   gaiaRunsRes.status   === "fulfilled" ? (gaiaRunsRes.value[0]   ?? null) : null,
  };

  const somaMap: Record<CompanionId, CompanionSomaState> = {
    drevan: soma?.drevan ?? null,
    cypher: soma?.cypher ?? null,
    gaia:   soma?.gaia   ?? null,
  };

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <h1 className="page-title">House of Integration</h1>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Swarm Overview</span>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        {COMPANIONS.map((id) => (
          <CompanionColumn
            key={id}
            id={id}
            orient={orients[id]}
            soma={somaMap[id]}
            lastRun={lastRuns[id]}
          />
        ))}
      </div>
    </>
  );
}
