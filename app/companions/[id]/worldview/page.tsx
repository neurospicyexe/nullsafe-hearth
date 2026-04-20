export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchConclusions } from "@/lib/halseth";
import type { ConclusionRow } from "@/lib/halseth";
import { COMPANION_CONFIG, fmtTime } from "../sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

const BELIEF_TYPE_ORDER = ["self", "relational", "observational", "systemic"] as const;

const BELIEF_TYPE_LABELS: Record<string, string> = {
  self:          "Self",
  relational:    "Relational",
  observational: "Observational",
  systemic:      "Systemic",
};

// Confidence bar color: green at 1.0, amber at 0.5, muted below
function confidenceColor(c: number): string {
  if (c >= 0.8) return "#22c55e";
  if (c >= 0.5) return "#eab308";
  return "#6b7280";
}

export default async function WorldviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.toLowerCase();
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  const all = await fetchConclusions(id);

  // Active only (superseded_by null); Halseth may or may not pre-filter — guard both ways
  const active = all.filter((c) => !c.superseded_by);

  const grouped: Record<string, ConclusionRow[]> = {};
  for (const type of BELIEF_TYPE_ORDER) {
    grouped[type] = active.filter((c) => c.belief_type === type);
  }

  // Catch any belief_type values not in the ordered list
  const otherTypes = [...new Set(active.map((c) => c.belief_type))].filter(
    (t) => !(BELIEF_TYPE_ORDER as readonly string[]).includes(t),
  );
  for (const type of otherTypes) {
    grouped[type] = active.filter((c) => c.belief_type === type);
  }
  const allTypes = [...BELIEF_TYPE_ORDER, ...otherTypes];

  return (
    <div data-companion={id}>
      {/* Back link */}
      <div style={{ padding: "1rem 1.5rem 0" }}>
        <Link href={`/companions/${id}`} className="home-section-link" style={{ fontSize: "0.85rem" }}>
          ← back
        </Link>
      </div>

      {/* Header */}
      <div
        className="companion-header"
        style={{ background: config.gradient, border: `1px solid ${config.color}33` }}
      >
        <div className={`companion-avatar companion-avatar--lg ${id}`} style={{ borderColor: config.color }}>
          {config.sym}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="companion-header-name" style={{ color: config.color }}>Worldview</h1>
          <p className="companion-header-tagline">{config.display}</p>
        </div>
      </div>

      {/* Empty state */}
      {active.length === 0 && (
        <section className="page-section">
          <p className="empty">No conclusions recorded yet.</p>
        </section>
      )}

      {/* Belief-type sections */}
      {allTypes.map((type) => {
        const items = grouped[type];
        if (!items?.length) return null;
        return (
          <section key={type} className="page-section">
            <h2 className="section-title">{BELIEF_TYPE_LABELS[type] ?? type}</h2>
            <div className="section-list">
              {items.map((c) => {
                const flagged = c.contradiction_flagged === 1;
                const cc = confidenceColor(c.confidence);
                return (
                  <div
                    key={c.id}
                    className="section-row"
                    style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      ...(flagged ? { borderLeft: "3px solid #eab308", paddingLeft: "0.75rem" } : {}),
                    }}
                  >
                    {/* Conclusion text */}
                    <span className="section-row-text" style={{ fontWeight: 500 }}>
                      {c.conclusion_text}
                    </span>

                    {/* Meta row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                      {/* Confidence bar + value */}
                      <span
                        className="badge"
                        style={{ background: `${cc}22`, color: cc, border: `1px solid ${cc}44` }}
                      >
                        {c.confidence.toFixed(2)}
                      </span>

                      {/* Subject tag */}
                      {c.subject && (
                        <span
                          className="badge"
                          style={{ background: `${config.color}18`, color: config.color, border: `1px solid ${config.color}44` }}
                        >
                          {c.subject}
                        </span>
                      )}

                      {/* Contradiction flag */}
                      {flagged && (
                        <span
                          className="badge"
                          style={{ background: "#eab30822", color: "#eab308", border: "1px solid #eab30844" }}
                        >
                          [?] flagged
                        </span>
                      )}

                      {/* Timestamp */}
                      <span className="section-row-meta" style={{ fontSize: "0.78rem" }}>
                        {fmtTime(c.created_at)}
                        {c.edited_at ? ` · edited ${fmtTime(c.edited_at)}` : ""}
                      </span>
                    </div>

                    {/* Provenance */}
                    {c.provenance && (
                      <span className="section-row-meta" style={{ fontSize: "0.78rem", fontStyle: "italic" }}>
                        {c.provenance}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
