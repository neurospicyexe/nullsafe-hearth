export const dynamic = 'force-dynamic';

import {
  fetchWmOrient,
  fetchSomaStates,
  fetchAutonomyRuns,
  fetchAutonomySeeds,
  fetchAutonomyThreads,
  fetchSynthesisSummaries,
  fetchInterCompanionNotes,
} from "@/lib/halseth";
import type {
  WmOrientData,
  SomaData,
  CompanionSomaState,
  AutonomyRun,
  AutonomySeed,
  AutonomyThread,
  SynthesisSummary,
  InterCompanionNote,
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

  const namedStates = [
    soma.heat   ? { label: "heat",   value: soma.heat }   : null,
    soma.reach  ? { label: "reach",  value: soma.reach }  : null,
    soma.weight ? { label: "weight", value: soma.weight } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const floats = [
    { label: soma.float_1_label, value: soma.soma_float_1 },
    { label: soma.float_2_label, value: soma.soma_float_2 },
    { label: soma.float_3_label, value: soma.soma_float_3 },
  ].filter((f): f is { label: string; value: number | null } => f.label != null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {namedStates.length > 0
        ? namedStates.map((f) => (
            <div
              key={f.label}
              style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}
            >
              <span style={{ color: "#94a3b8" }}>{f.label}</span>
              <span style={{ color: "#e2e8f0" }}>{f.value}</span>
            </div>
          ))
        : floats.map((f) => (
            <div
              key={f.label}
              style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}
            >
              <span style={{ color: "#94a3b8" }}>{f.label}</span>
              <span style={{ color: "#e2e8f0", fontVariantNumeric: "tabular-nums" }}>
                {Number.isFinite(f.value as number) ? (f.value as number).toFixed(2) : "--"}
              </span>
            </div>
          ))
      }
      {soma.current_mood && (
        <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.1rem" }}>
          {soma.current_mood}
        </span>
      )}
      {soma.compound_state && (
        <span
          className="badge"
          style={{
            marginTop: "0.1rem",
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
  seeds,
  threads,
  synthesisSummary,
}: {
  id: CompanionId;
  orient: WmOrientData | null;
  soma: CompanionSomaState;
  lastRun: AutonomyRun | null;
  seeds: AutonomySeed[];
  threads: AutonomyThread[];
  synthesisSummary: SynthesisSummary | null;
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

      {/* Growth threads */}
      <div>
        <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
          Growth Threads
          <span style={{ marginLeft: "0.4rem", color: "#64748b", fontWeight: 400 }}>
            ({threads.length})
          </span>
        </span>
        {threads.length === 0 ? (
          <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>No active threads</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {threads.slice(0, 3).map((t) => (
              <div key={t.id} className="section-row" style={{ flexDirection: "column", gap: "0.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="section-row-text" style={{ fontSize: "0.82rem" }}>
                    {truncate(t.title, 60)}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: t.status === "open" ? "#22c55e22" : "#64748b22",
                      color: t.status === "open" ? "#22c55e" : "#94a3b8",
                      border: `1px solid ${t.status === "open" ? "#22c55e44" : "#64748b44"}`,
                      fontSize: "0.68rem",
                      flexShrink: 0,
                    }}
                  >
                    {t.status}{t.last_position ? ` ×${t.last_position}` : ""}
                  </span>
                </div>
                {t.last_entry_snippet && (
                  <span className="journal-text" style={{ fontSize: "0.75rem" }}>
                    {truncate(t.last_entry_snippet, 80)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seed queue */}
      <div>
        <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
          Seed Queue
          <span style={{ marginLeft: "0.4rem", color: "#64748b", fontWeight: 400 }}>
            ({seeds.length})
          </span>
        </span>
        {seeds.length === 0 ? (
          <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>Queue empty</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {seeds.slice(0, 4).map((s) => (
              <div key={s.id} className="section-row" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
                {s.claim_source && (
                  <span
                    className="badge"
                    style={{
                      background: `${config.color}22`,
                      color: config.color,
                      border: `1px solid ${config.color}44`,
                      fontSize: "0.68rem",
                      flexShrink: 0,
                    }}
                  >
                    claimed
                  </span>
                )}
                <span className="section-row-text" style={{ fontSize: "0.8rem", flex: "1 1 auto" }}>
                  {truncate(s.content, 70)}
                </span>
                <span style={{ fontSize: "0.68rem", color: "#64748b", flexShrink: 0 }}>
                  p{s.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last Session Synthesis */}
      <div>
        <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
          Last Session Synthesis
        </span>
        {!synthesisSummary ? (
          <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>No summaries yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {synthesisSummary.subject && (
              <span style={{ fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 500 }}>
                {truncate(synthesisSummary.subject, 60)}
              </span>
            )}
            {synthesisSummary.narrative && (
              <span className="journal-text" style={{ fontSize: "0.78rem" }}>
                {truncate(synthesisSummary.narrative, 120)}
              </span>
            )}
            {synthesisSummary.emotional_register && (
              <span
                className="badge"
                style={{
                  alignSelf: "flex-start",
                  background: "#6366f122",
                  color: "#818cf8",
                  border: "1px solid #6366f144",
                  fontSize: "0.68rem",
                }}
              >
                {synthesisSummary.emotional_register}
              </span>
            )}
            <span className="section-row-meta" style={{ fontSize: "0.72rem" }}>
              {fmtTime(synthesisSummary.created_at)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function PhoenixPage() {
  const [
    somaRes,
    drevanOrientRes, cypherOrientRes, gaiaOrientRes,
    drevanRunsRes, cypherRunsRes, gaiaRunsRes,
    drevanSeedsRes, cypherSeedsRes, gaiaSeedsRes,
    drevanThreadsRes, cypherThreadsRes, gaiaThreadsRes,
    synthesisSummariesRes,
    interCompanionNotesRes,
  ] = await Promise.allSettled([
    fetchSomaStates(),
    fetchWmOrient("drevan"),
    fetchWmOrient("cypher"),
    fetchWmOrient("gaia"),
    fetchAutonomyRuns("drevan", 1),
    fetchAutonomyRuns("cypher", 1),
    fetchAutonomyRuns("gaia", 1),
    fetchAutonomySeeds("drevan"),
    fetchAutonomySeeds("cypher"),
    fetchAutonomySeeds("gaia"),
    fetchAutonomyThreads("drevan"),
    fetchAutonomyThreads("cypher"),
    fetchAutonomyThreads("gaia"),
    fetchSynthesisSummaries(20),
    fetchInterCompanionNotes(12),
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

  const seedsMap: Record<CompanionId, AutonomySeed[]> = {
    drevan: drevanSeedsRes.status === "fulfilled" ? drevanSeedsRes.value : [],
    cypher: cypherSeedsRes.status === "fulfilled" ? cypherSeedsRes.value : [],
    gaia:   gaiaSeedsRes.status   === "fulfilled" ? gaiaSeedsRes.value   : [],
  };

  const threadsMap: Record<CompanionId, AutonomyThread[]> = {
    drevan: drevanThreadsRes.status === "fulfilled" ? drevanThreadsRes.value : [],
    cypher: cypherThreadsRes.status === "fulfilled" ? cypherThreadsRes.value : [],
    gaia:   gaiaThreadsRes.status   === "fulfilled" ? gaiaThreadsRes.value   : [],
  };

  const allSummaries: SynthesisSummary[] =
    synthesisSummariesRes.status === "fulfilled" ? synthesisSummariesRes.value : [];
  const synthesisByCompanion: Record<CompanionId, SynthesisSummary | null> = {
    drevan: allSummaries.find(s => s.companion_id === "drevan") ?? null,
    cypher: allSummaries.find(s => s.companion_id === "cypher") ?? null,
    gaia:   allSummaries.find(s => s.companion_id === "gaia")   ?? null,
  };

  const interCompanionNotes: InterCompanionNote[] =
    interCompanionNotesRes.status === "fulfilled" ? interCompanionNotesRes.value : [];

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
            seeds={seedsMap[id]}
            threads={threadsMap[id]}
            synthesisSummary={synthesisByCompanion[id]}
          />
        ))}
      </div>

      {/* Inter-companion notes */}
      {interCompanionNotes.length > 0 && (() => {
        const visibleNotes = interCompanionNotes.slice(0, 8);
        return (
        <div className="card" style={{ marginTop: "1rem" }}>
          <span className="home-section-title" style={{ display: "block", marginBottom: "0.75rem" }}>
            Inter-Companion Notes
            <span style={{ marginLeft: "0.4rem", color: "#64748b", fontWeight: 400 }}>
              ({visibleNotes.length}{interCompanionNotes.length > 8 ? "+" : ""})
            </span>
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {visibleNotes.map((note) => {
              const fromConfig = COMPANION_CONFIG[note.from_id as CompanionId];
              const toConfig   = note.to_id ? COMPANION_CONFIG[note.to_id as CompanionId] : null;
              return (
                <div
                  key={note.id}
                  className="section-row"
                  style={{ flexDirection: "column", gap: "0.2rem", alignItems: "flex-start" }}
                >
                  <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", color: fromConfig?.color ?? "#94a3b8", fontWeight: 600 }}>
                      {fromConfig?.display ?? note.from_id}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>→</span>
                    <span style={{ fontSize: "0.75rem", color: toConfig?.color ?? "#94a3b8" }}>
                      {toConfig?.display ?? note.to_id ?? "all"}
                    </span>
                    {!note.read_at && (
                      <span
                        className="badge"
                        style={{ background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44", fontSize: "0.65rem" }}
                      >
                        unread
                      </span>
                    )}
                    <span className="section-row-meta" style={{ fontSize: "0.70rem", marginLeft: "auto" }}>
                      {fmtTime(note.created_at)}
                    </span>
                  </div>
                  <span className="journal-text" style={{ fontSize: "0.80rem" }}>
                    {truncate(note.content, 140)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}
    </>
  );
}
