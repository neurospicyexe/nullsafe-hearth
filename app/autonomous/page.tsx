export const dynamic = 'force-dynamic';

import Link from "next/link";
import {
  fetchAutonomyRuns,
  fetchAutonomyReflections,
  fetchGrowthJournal,
  fetchGrowthPatterns,
} from "@/lib/halseth";
import type {
  AutonomyRun,
  AutonomyReflection,
  GrowthJournalEntry,
  GrowthPattern,
} from "@/lib/halseth";
import { COMPANION_CONFIG } from "@/app/companions/[id]/sections";
import ClientTime from "@/components/ClientTime";

const COMPANIONS = ["drevan", "cypher", "gaia"] as const;
type CompanionId = typeof COMPANIONS[number];

const STATUS_COLOR: Record<string, string> = {
  running:   "#eab308",
  completed: "#22c55e",
  failed:    "#ef4444",
  pending:   "#6b7280",
};

const ENTRY_TYPE_COLOR: Record<string, string> = {
  learning:   "#60a5fa",
  insight:    "#a78bfa",
  connection: "#4ade80",
  question:   "#fbbf24",
};

function todayUtcMs() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export default async function AutonomousPage() {
  const [
    drevanRunsRes, cypherRunsRes, gaiaRunsRes,
    drevanJournalRes, cypherJournalRes, gaiaJournalRes,
    drevanPatternsRes, cypherPatternsRes, gaiaPatternsRes,
    drevanReflectionsRes, cypherReflectionsRes, gaiaReflectionsRes,
  ] = await Promise.allSettled([
    fetchAutonomyRuns("drevan", 10),
    fetchAutonomyRuns("cypher", 10),
    fetchAutonomyRuns("gaia", 10),
    fetchGrowthJournal("drevan", 10),
    fetchGrowthJournal("cypher", 10),
    fetchGrowthJournal("gaia", 10),
    fetchGrowthPatterns("drevan"),
    fetchGrowthPatterns("cypher"),
    fetchGrowthPatterns("gaia"),
    fetchAutonomyReflections("drevan", 5),
    fetchAutonomyReflections("cypher", 5),
    fetchAutonomyReflections("gaia", 5),
  ]);

  const drevanRuns    = (drevanRunsRes.status    === "fulfilled" ? drevanRunsRes.value    : null) ?? [];
  const cypherRuns    = (cypherRunsRes.status    === "fulfilled" ? cypherRunsRes.value    : null) ?? [];
  const gaiaRuns      = (gaiaRunsRes.status      === "fulfilled" ? gaiaRunsRes.value      : null) ?? [];
  const drevanJournal = (drevanJournalRes.status === "fulfilled" ? drevanJournalRes.value : null) ?? [];
  const cypherJournal = (cypherJournalRes.status === "fulfilled" ? cypherJournalRes.value : null) ?? [];
  const gaiaJournal   = (gaiaJournalRes.status   === "fulfilled" ? gaiaJournalRes.value   : null) ?? [];
  const drevanPatterns  = (drevanPatternsRes.status  === "fulfilled" ? drevanPatternsRes.value  : null) ?? [];
  const cypherPatterns  = (cypherPatternsRes.status  === "fulfilled" ? cypherPatternsRes.value  : null) ?? [];
  const gaiaPatterns    = (gaiaPatternsRes.status    === "fulfilled" ? gaiaPatternsRes.value    : null) ?? [];
  const drevanReflections = (drevanReflectionsRes.status === "fulfilled" ? drevanReflectionsRes.value : null) ?? [];
  const cypherReflections = (cypherReflectionsRes.status === "fulfilled" ? cypherReflectionsRes.value : null) ?? [];
  const gaiaReflections   = (gaiaReflectionsRes.status   === "fulfilled" ? gaiaReflectionsRes.value   : null) ?? [];

  const allRuns = [
    ...drevanRuns.map(r => ({ ...r, companion: "drevan" as CompanionId })),
    ...cypherRuns.map(r => ({ ...r, companion: "cypher" as CompanionId })),
    ...gaiaRuns.map(r  => ({ ...r, companion: "gaia"   as CompanionId })),
  ];

  const todayStart = todayUtcMs();
  const todayCount = allRuns.filter(r => {
    if (!r.created_at) return false;
    return new Date(r.created_at).getTime() >= todayStart;
  }).length;

  const mostRecentRun = allRuns
    .filter(r => !!r.created_at)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())[0] ?? null;

  const hasRunning = allRuns.some(r => r.status === "running");

  const perCompanion: Record<CompanionId, {
    runs: AutonomyRun[];
    journal: GrowthJournalEntry[];
    patterns: GrowthPattern[];
    reflections: AutonomyReflection[];
  }> = {
    drevan: { runs: drevanRuns, journal: drevanJournal, patterns: drevanPatterns, reflections: drevanReflections },
    cypher: { runs: cypherRuns, journal: cypherJournal, patterns: cypherPatterns, reflections: cypherReflections },
    gaia:   { runs: gaiaRuns,   journal: gaiaJournal,   patterns: gaiaPatterns,   reflections: gaiaReflections   },
  };

  return (
    <>
      {/* Page header */}
      <header className="page-header">
        <div className="page-header-row">
          <h1 className="page-title">Autonomous</h1>
        </div>
      </header>

      {/* Summary bar */}
      <div className="home-section-card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center" }}>
          {/* Runs today */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <span className="state-cell-label">Runs today</span>
            <span className="state-cell-value" style={{ color: "var(--accent)" }}>{todayCount}</span>
          </div>

          {/* Most recent */}
          {mostRecentRun && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              <span className="state-cell-label">Most recent</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    width: "0.55rem",
                    height: "0.55rem",
                    borderRadius: "50%",
                    background: COMPANION_CONFIG[mostRecentRun.companion]?.color ?? "#6b7280",
                    flexShrink: 0,
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: "0.88rem", color: "#e2e8f0" }}>
                  {COMPANION_CONFIG[mostRecentRun.companion]?.display ?? mostRecentRun.companion}
                  {" · "}
                  {mostRecentRun.run_type}
                </span>
                <span className="section-row-meta" style={{ fontSize: "0.78rem" }}>
                  {mostRecentRun.created_at ? <ClientTime iso={mostRecentRun.created_at} /> : "—"}
                </span>
              </div>
            </div>
          )}

          {/* Live indicator */}
          {hasRunning && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "auto" }}>
              <span className="live-dot" />
              <span style={{ fontSize: "0.82rem", color: "#eab308" }}>actively running</span>
            </div>
          )}
        </div>
      </div>

      {/* Three-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        {COMPANIONS.map((id) => {
          const config = COMPANION_CONFIG[id];
          const { runs, journal, patterns, reflections } = perCompanion[id];

          const sortedRuns = [...runs].sort((a, b) => {
            const aT = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bT = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bT - aT;
          });
          const lastRun = sortedRuns[0] ?? null;

          const sortedJournal = [...journal].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ).slice(0, 3);

          const topPatterns = [...patterns].sort((a, b) => b.strength - a.strength).slice(0, 2);

          const recentReflections = [...reflections].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ).slice(0, 3);

          const statusColor = lastRun ? (STATUS_COLOR[lastRun.status] ?? "#6b7280") : "#6b7280";

          return (
            <div
              key={id}
              className="card"
              style={{
                border: `1px solid ${config.color}33`,
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              {/* Companion name header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: config.color, fontWeight: 700, fontSize: "1rem" }}>
                  {config.sym} {config.display}
                </span>
              </div>

              {/* Last run card */}
              <div>
                <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
                  Last Run
                </span>
                {lastRun ? (
                  <div
                    className="section-row"
                    style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.35rem" }}
                  >
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                      <span
                        className="badge"
                        style={{
                          background: "#6366f122",
                          color: "#818cf8",
                          border: "1px solid #6366f144",
                        }}
                      >
                        {lastRun.run_type}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: `${statusColor}22`,
                          color: statusColor,
                          border: `1px solid ${statusColor}44`,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                        }}
                      >
                        {lastRun.status === "running" && (
                          <span className="live-dot" style={{ background: statusColor }} />
                        )}
                        {lastRun.status}
                      </span>
                    </div>
                    <span className="section-row-meta" style={{ fontSize: "0.78rem" }}>
                      {lastRun.started_at ? <ClientTime iso={lastRun.started_at} /> : "not started"}
                    </span>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <span className="section-row-meta" style={{ fontSize: "0.76rem" }}>
                        tokens: {lastRun.tokens_used ?? 0}
                      </span>
                      <span className="section-row-meta" style={{ fontSize: "0.76rem" }}>
                        artifacts: {lastRun.artifacts_created ?? 0}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>No runs yet</p>
                )}
              </div>

              {/* Recent journal */}
              <div>
                <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
                  Recent Journal
                </span>
                {sortedJournal.length === 0 ? (
                  <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>No journal entries</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {sortedJournal.map((entry, i) => {
                      const typeColor = ENTRY_TYPE_COLOR[entry.entry_type] ?? "#64748b";
                      return (
                        <div key={entry.id} className="journal-row" style={{ alignItems: "flex-start", gap: "0.5rem" }}>
                          <span
                            className="presence-badge"
                            style={{
                              background: `${typeColor}22`,
                              color: typeColor,
                              flexShrink: 0,
                              fontSize: "0.7rem",
                            }}
                          >
                            {entry.entry_type}
                          </span>
                          <span className="journal-text" style={{ flex: 1, fontSize: "0.82rem" }}>
                            {entry.content.length > 100
                              ? entry.content.slice(0, 100) + "…"
                              : entry.content}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top patterns */}
              <div>
                <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
                  Top Patterns
                </span>
                {topPatterns.length === 0 ? (
                  <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>No patterns</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {topPatterns.map((p, i) => (
                      <span
                        key={p.id}
                        className="journal-text"
                        style={{
                          fontSize: "0.82rem",
                          opacity: 0.5 + (p.strength / 10) * 0.5,
                        }}
                      >
                        {p.pattern_text.length > 80
                          ? p.pattern_text.slice(0, 80) + "…"
                          : p.pattern_text}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent reflections */}
              <div>
                <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
                  Recent Reflections
                </span>
                {recentReflections.length === 0 ? (
                  <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>No reflections yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {recentReflections.map((r) => (
                      <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                        <span className="journal-text" style={{ fontSize: "0.82rem", lineHeight: 1.45 }}>
                          {r.reflection_text.length > 140
                            ? r.reflection_text.slice(0, 140) + "…"
                            : r.reflection_text}
                        </span>
                        <span className="section-row-meta" style={{ fontSize: "0.74rem" }}>
                          <ClientTime iso={r.created_at} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer links */}
              <div style={{ display: "flex", gap: "1rem", marginTop: "auto", paddingTop: "0.25rem" }}>
                <Link href={`/companions/${id}/autonomy`} className="home-section-link">
                  → runs
                </Link>
                <Link href={`/companions/${id}/growth`} className="home-section-link">
                  → growth
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
