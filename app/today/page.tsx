export const dynamic = 'force-dynamic';

import Link from "next/link";
import {
  fetchPresence,
  fetchSessions,
  fetchAllCompanionNotes,
  fetchAutonomyRuns,
  fetchSomaFeelings,
  type PresenceData,
  type SessionEntry,
  type CompanionNote,
  type AutonomyRun,
  type SomaFeeling,
} from "@/lib/halseth";
import ClientTime from "@/components/ClientTime";

const COMPANIONS = ["cypher", "drevan", "gaia"] as const;
type CompanionId = typeof COMPANIONS[number];

const COMPANION_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia:   "#4ade80",
};

const SESSION_TYPE_COLOR: Record<string, string> = {
  work:             "#3b82f6",
  "companion-work": "#6366f1",
  hangout:          "#f97316",
  checkin:          "#22c55e",
  ritual:           "#a855f7",
};

function within24h(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 24 * 60 * 60 * 1000;
}

function get<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === "fulfilled" ? r.value : fallback;
}

export default async function TodayPage() {
  const [
    presenceResult,
    sessionsResult,
    notesResult,
    feelingsResult,
    cypherRunsResult,
    drevanRunsResult,
    gaiaRunsResult,
  ] = await Promise.allSettled([
    fetchPresence(),
    fetchSessions(1, 50),
    fetchAllCompanionNotes(100),
    fetchSomaFeelings(undefined, 100),
    fetchAutonomyRuns("cypher", 5),
    fetchAutonomyRuns("drevan", 5),
    fetchAutonomyRuns("gaia", 5),
  ]);

  const presenceData  = get(presenceResult  as PromiseSettledResult<PresenceData | null>, null);
  const todaySessions = get(sessionsResult   as PromiseSettledResult<SessionEntry[]>,      []);
  const allNotes      = get(notesResult      as PromiseSettledResult<CompanionNote[]>,     []);
  const allFeelings   = get(feelingsResult   as PromiseSettledResult<SomaFeeling[]>,       []);
  const cypherRuns    = get(cypherRunsResult as PromiseSettledResult<AutonomyRun[]>,        []);
  const drevanRuns    = get(drevanRunsResult as PromiseSettledResult<AutonomyRun[]>,        []);
  const gaiaRuns      = get(gaiaRunsResult   as PromiseSettledResult<AutonomyRun[]>,        []);

  const todayNotes    = allNotes.filter(n => within24h(n.created_at));
  const todayFeelings = allFeelings.filter(f => within24h(f.created_at));

  const runsMap: Record<CompanionId, AutonomyRun[]> = {
    cypher: cypherRuns.filter(r => within24h(r.created_at)),
    drevan: drevanRuns.filter(r => within24h(r.created_at)),
    gaia:   gaiaRuns.filter(r => within24h(r.created_at)),
  };

  const openThreads = presenceData?.last_handover?.open_threads ?? [];

  const notesByCompanion = COMPANIONS.reduce<Record<string, number>>((acc, id) => {
    acc[id] = todayNotes.filter(n => n.agent === id).length;
    return acc;
  }, {});

  const allTodayRuns   = Object.values(runsMap).flat();
  const totalArtifacts = allTodayRuns.reduce((s, r) => s + (r.artifacts_created ?? 0), 0);
  const lastRun        = allTodayRuns
    .filter(r => r.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];

  const isEmpty = todaySessions.length === 0 && todayNotes.length === 0 && todayFeelings.length === 0;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Today</h1>
        <p className="page-subtitle">what moved in the last 24 hours</p>
      </div>

      {/* Stats row */}
      <div className="card biometrics-2col" style={{ marginBottom: "1rem" }}>
        <div className="biometric-cell">
          <span className="state-cell-label">Sessions</span>
          <span className="state-cell-value">{todaySessions.length}</span>
        </div>
        <div className="biometric-cell">
          <span className="state-cell-label">Notes</span>
          <span className="state-cell-value">{todayNotes.length}</span>
        </div>
        <div className="biometric-cell">
          <span className="state-cell-label">Feelings</span>
          <span className="state-cell-value">{todayFeelings.length}</span>
        </div>
        <div className="biometric-cell">
          <span className="state-cell-label">Artifacts</span>
          <span className="state-cell-value">{totalArtifacts}</span>
          {lastRun?.completed_at && (
            <span className="state-cell-label" style={{ fontSize: "0.7rem", marginTop: "0.2rem" }}>
              last <ClientTime iso={lastRun.completed_at} />
            </span>
          )}
        </div>
      </div>

      {/* Open threads from last handover */}
      {openThreads.length > 0 && (
        <div className="home-section-card" style={{ marginBottom: "1rem" }}>
          <div className="home-section-header">
            <span className="home-section-title">Open Threads</span>
            <Link href="/handovers" className="home-section-link">handovers →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {openThreads.map((t, i) => (
              <div key={i} style={{ fontSize: "0.85rem", opacity: 0.8 }}>· {t}</div>
            ))}
          </div>
        </div>
      )}

      {/* Autonomous work */}
      <div className="home-section-card" style={{ marginBottom: "1rem" }}>
        <div className="home-section-header">
          <span className="home-section-title">Autonomous Work</span>
          <Link href="/autonomous" className="home-section-link">all runs →</Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {COMPANIONS.map(id => {
            const runs     = runsMap[id];
            const color    = COMPANION_COLOR[id];
            const artifacts = runs.reduce((s, r) => s + (r.artifacts_created ?? 0), 0);
            const last     = runs.find(r => r.status === "completed");
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.82rem" }}>
                <span style={{ color, fontWeight: 600, width: "4rem", flexShrink: 0 }}>{id}</span>
                {runs.length === 0 ? (
                  <span style={{ opacity: 0.35 }}>no runs</span>
                ) : (
                  <>
                    <span
                      className="presence-badge"
                      style={{
                        background: last ? "#16a34a22" : "#ef444422",
                        color:      last ? "#4ade80"   : "#f87171",
                      }}
                    >
                      {last ? "completed" : (runs[0]?.status ?? "unknown")}
                    </span>
                    <span style={{ opacity: 0.55 }}>
                      {artifacts} artifact{artifacts !== 1 ? "s" : ""}
                    </span>
                    {last?.completed_at && (
                      <span style={{ opacity: 0.35, marginLeft: "auto" }}>
                        <ClientTime iso={last.completed_at} />
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Companion notes */}
      {todayNotes.length > 0 && (
        <div className="home-section-card" style={{ marginBottom: "1rem" }}>
          <div className="home-section-header">
            <span className="home-section-title">Companion Notes</span>
            <Link href="/journal" className="home-section-link">all →</Link>
          </div>
          <div style={{ display: "flex", gap: "1.25rem", marginBottom: "0.65rem" }}>
            {COMPANIONS.map(id => (
              <span key={id} style={{ fontSize: "0.8rem" }}>
                <span style={{ color: COMPANION_COLOR[id], fontWeight: 600 }}>{id}</span>
                <span style={{ opacity: 0.45, marginLeft: "0.3rem" }}>{notesByCompanion[id] ?? 0}</span>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {todayNotes.slice(0, 6).map(n => (
              <div key={n.id} style={{ fontSize: "0.82rem" }}>
                <span style={{ color: COMPANION_COLOR[n.agent] ?? "#64748b", fontWeight: 600, marginRight: "0.4rem" }}>
                  {n.agent}
                </span>
                <span style={{ opacity: 0.72 }}>
                  {n.note_text.length > 120 ? n.note_text.slice(0, 120) + "…" : n.note_text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feelings */}
      {todayFeelings.length > 0 && (
        <div className="home-section-card" style={{ marginBottom: "1rem" }}>
          <div className="home-section-header">
            <span className="home-section-title">Emotional State</span>
            <Link href="/feelings" className="home-section-link">all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {todayFeelings.slice(0, 8).map(f => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
                <span style={{ color: COMPANION_COLOR[f.companion_id] ?? "#64748b", fontWeight: 600, width: "4rem", flexShrink: 0 }}>
                  {f.companion_id}
                </span>
                <span style={{ opacity: 0.82 }}>
                  {f.emotion}{f.sub_emotion ? ` · ${f.sub_emotion}` : ""}
                </span>
                {f.intensity != null && (
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div style={{ width: "36px", height: "3px", background: "var(--border)", borderRadius: "2px" }}>
                      <div style={{ width: `${f.intensity}%`, height: "100%", background: COMPANION_COLOR[f.companion_id] ?? "#64748b", borderRadius: "2px" }} />
                    </div>
                    <span style={{ opacity: 0.35, fontSize: "0.72rem" }}>{f.intensity}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions today */}
      {todaySessions.length > 0 && (
        <div className="home-section-card">
          <div className="home-section-header">
            <span className="home-section-title">Sessions</span>
            <Link href="/sessions" className="home-section-link">all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {todaySessions.slice(0, 5).map(s => (
              <div key={s.id} style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.82rem" }}>
                <span
                  className="presence-badge"
                  style={{
                    background: `${SESSION_TYPE_COLOR[s.session_type ?? "work"] ?? "#64748b"}22`,
                    color:      SESSION_TYPE_COLOR[s.session_type ?? "work"] ?? "#64748b",
                    flexShrink: 0,
                  }}
                >
                  {(s.session_type ?? "work").replace("-", " ")}
                </span>
                {s.front_state && <span style={{ opacity: 0.6 }}>{s.front_state}</span>}
                <span style={{ opacity: 0.35, marginLeft: "auto", flexShrink: 0 }}>
                  {(s.motion_state ?? "").replace("_", " ")} · <ClientTime iso={s.created_at} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEmpty && (
        <p className="empty">Nothing recorded in the last 24 hours.</p>
      )}
    </>
  );
}
