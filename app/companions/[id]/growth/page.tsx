export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  fetchGrowthJournal,
  fetchGrowthPatterns,
  fetchGrowthMarkers,
} from "@/lib/halseth";
import type {
  GrowthJournalEntry,
  GrowthPattern,
  GrowthMarker,
} from "@/lib/halseth";
import { COMPANION_CONFIG, fmtTime } from "../sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

export default async function GrowthPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.toLowerCase();
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  const [journalRes, patternsRes, markersRes] = await Promise.allSettled([
    fetchGrowthJournal(id, 21),
    fetchGrowthPatterns(id),
    fetchGrowthMarkers(id),
  ]);

  const allJournal  = journalRes.status  === "fulfilled" ? (journalRes.value  as GrowthJournalEntry[]) : [];
  const allPatterns = patternsRes.status === "fulfilled" ? (patternsRes.value as GrowthPattern[])      : [];
  const allMarkers  = markersRes.status  === "fulfilled" ? (markersRes.value  as GrowthMarker[])       : [];

  const hasMore = allJournal.length > 20;
  const journal = [...allJournal]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const patterns = [...allPatterns].sort((a, b) => b.strength - a.strength);

  return (
    <div data-companion={id}>
      {/* Back link */}
      <div style={{ padding: "1rem 1.5rem 0" }}>
        <Link href={`/companions/${id}`} className="home-section-link" style={{ fontSize: "0.85rem" }}>
          ← back
        </Link>
      </div>

      {/* Page title */}
      <div
        className="companion-header"
        style={{ background: config.gradient, border: `1px solid ${config.color}33` }}
      >
        <div className={`companion-avatar companion-avatar--lg ${id}`} style={{ borderColor: config.color }}>
          {config.sym}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="companion-header-name" style={{ color: config.color }}>Growth</h1>
          <p className="companion-header-tagline">{config.display}</p>
        </div>
      </div>

      {/* ── Section 1: Patterns ── */}
      <section className="page-section">
        <h2 className="section-title">Patterns</h2>
        {patterns.length === 0 ? (
          <p className="empty">No patterns recorded yet</p>
        ) : (
          <div className="section-list">
            {patterns.map((p) => {
              let evidenceCount = 0;
              try {
                const parsed = JSON.parse(p.evidence_json);
                evidenceCount = Array.isArray(parsed) ? parsed.length : 0;
              } catch {
                evidenceCount = 0;
              }
              const barWidth = `${Math.min((p.strength / 10) * 100, 100)}%`;
              return (
                <div
                  key={p.id}
                  className="section-row"
                  style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.5rem" }}
                >
                  <span className="section-row-text" style={{ fontWeight: 500 }}>
                    {p.pattern_text}
                  </span>
                  <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div
                      style={{
                        flex: 1,
                        height: "6px",
                        background: "#ffffff10",
                        borderRadius: "3px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: barWidth,
                          height: "100%",
                          background: config.color,
                          borderRadius: "3px",
                        }}
                      />
                    </div>
                    <span className="section-row-meta" style={{ flexShrink: 0, fontSize: "0.78rem" }}>
                      {evidenceCount} {evidenceCount === 1 ? "piece" : "pieces"} of evidence
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 2: Journal ── */}
      <section className="page-section">
        <h2 className="section-title">Journal</h2>
        {journal.length === 0 ? (
          <p className="empty">No journal entries yet</p>
        ) : (
          <>
            <div className="section-list">
              {journal.slice(0, 20).map((entry) => {
                const typeBadgeColor =
                  entry.entry_type === "learning"   ? "#3b82f6" :
                  entry.entry_type === "insight"    ? "#a855f7" :
                  entry.entry_type === "connection" ? "#22c55e" :
                  entry.entry_type === "question"   ? "#f59e0b" : "#6b7280";

                const sourceBadgeColor =
                  entry.source === "autonomous"   ? "#6b7280" :
                  entry.source === "conversation" ? "#f97316" :
                  entry.source === "reflection"   ? "#14b8a6" : null;

                let tags: string[] = [];
                try {
                  const parsed = JSON.parse(entry.tags_json);
                  tags = Array.isArray(parsed) ? parsed : [];
                } catch {
                  tags = [];
                }

                return (
                  <div
                    key={entry.id}
                    className="section-row"
                    style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.4rem" }}
                  >
                    {/* Badges row */}
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span
                        className="badge"
                        style={{
                          background: `${typeBadgeColor}22`,
                          color: typeBadgeColor,
                          border: `1px solid ${typeBadgeColor}44`,
                        }}
                      >
                        {entry.entry_type}
                      </span>
                      {entry.source && sourceBadgeColor && (
                        <span
                          className="badge"
                          style={{
                            background: `${sourceBadgeColor}22`,
                            color: sourceBadgeColor,
                            border: `1px solid ${sourceBadgeColor}44`,
                          }}
                        >
                          {entry.source}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <p className="section-row-text" style={{ margin: 0, lineHeight: 1.5 }}>
                      {entry.content}
                    </p>

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        {tags.map((tag, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: "0.72rem",
                              padding: "0.1rem 0.45rem",
                              background: "#ffffff0d",
                              border: "1px solid #ffffff18",
                              borderRadius: "3px",
                              color: "#94a3b8",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <span className="section-row-meta" style={{ fontSize: "0.78rem" }}>
                      {fmtTime(entry.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <p className="section-row-meta" style={{ marginTop: "0.75rem", fontSize: "0.82rem" }}>
                More entries available — view the full list
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Section 3: Markers (hidden when empty) ── */}
      {allMarkers.length > 0 && (
        <section className="page-section">
          <h2 className="section-title">Markers</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {allMarkers.map((m) => {
              const markerColor =
                m.marker_type === "milestone"   ? "#f59e0b" :
                m.marker_type === "shift"       ? "#818cf8" :
                m.marker_type === "realization" ? "#34d399" : "#6b7280";

              return (
                <div
                  key={m.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.3rem 0.7rem",
                    background: `${markerColor}18`,
                    border: `1px solid ${markerColor}44`,
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                  }}
                >
                  <span style={{ color: markerColor, fontWeight: 600 }}>{m.marker_type}</span>
                  <span style={{ color: "#cbd5e1" }}>{m.description}</span>
                  {m.related_pattern_id && (
                    <span style={{ color: "#64748b", fontSize: "0.75rem" }}>(see pattern above)</span>
                  )}
                  <span style={{ color: "#475569", fontSize: "0.75rem" }}>
                    {fmtTime(m.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
