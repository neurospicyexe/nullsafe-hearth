export const dynamic = 'force-dynamic';

import Link from "next/link";
import { fetchSynthesisSummaries } from "@/lib/halseth";
import ClientTime from "@/components/ClientTime";

// Synthesis summaries were the last stream on the home dashboard with no "see all" -- every other
// section there had one, and this table had no full-list surface anywhere in Hearth. The home card
// showed 5 of 20 fetched and stopped.
//
// /ingest/synthesis-summaries caps limit at 500 and takes no offset, so this page names what it
// fetched rather than implying it holds everything.
const PAGE_LIMIT = 200;

const COMPANION_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia: "#4ade80",
};

const FILTERS = [
  { key: "", label: "all" },
  { key: "drevan", label: "drevan" },
  { key: "cypher", label: "cypher" },
  { key: "gaia", label: "gaia" },
  { key: "cross", label: "cross-companion" },
];

function parseThreads(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? (p as string[]) : [];
  } catch {
    // Not JSON -- older rows stored a plain string. Show it rather than dropping it silently.
    return [raw];
  }
}

export default async function SynthesisPage({
  searchParams,
}: {
  searchParams: Promise<{ companion?: string }>;
}) {
  const { companion: rawCompanion } = await searchParams;
  const raw = rawCompanion?.toLowerCase();
  const companion = raw && (COMPANION_COLOR[raw] || raw === "cross") ? raw : null;

  const all = await fetchSynthesisSummaries(PAGE_LIMIT);

  // companion_id NULL means cross-companion, which is a real category rather than missing data --
  // so "cross" is a filter value, not an absence to hide.
  const summaries = companion
    ? all.filter((s) => (companion === "cross" ? s.companion_id === null : s.companion_id === companion))
    : all;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Synthesis</h1>
        <p className="page-subtitle">
          what the swarm made of a session, a day, a topic
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {FILTERS.map((f) => {
          const active = (f.key || null) === companion;
          const color = f.key && f.key !== "cross" ? COMPANION_COLOR[f.key] : "#94a3b8";
          return (
            <Link
              key={f.key || "all"}
              href={f.key ? `/synthesis?companion=${f.key}` : "/synthesis"}
              style={{
                fontSize: "0.8rem",
                textDecoration: "none",
                padding: "0.2rem 0.7rem",
                borderRadius: "999px",
                border: `1px solid ${active ? color : "#ffffff22"}`,
                background: active ? `${color}1a` : "transparent",
                color: active ? color : "var(--text-muted)",
              }}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {summaries.length === 0 ? (
        <p className="empty">
          {companion ? `No synthesis for ${companion} in this window.` : "No synthesis summaries yet."}
        </p>
      ) : (
        <>
          <p className="section-row-meta" style={{ fontSize: "0.82rem", marginBottom: "0.75rem" }}>
            {summaries.length} summar{summaries.length === 1 ? "y" : "ies"} — most recent {PAGE_LIMIT} fetched
            {all.length >= PAGE_LIMIT ? ", older ones exist beyond this window" : ""}
          </p>

          <div className="handover-feed">
            {summaries.map((s) => {
              const threads = parseThreads(s.open_threads);
              const who = s.companion_id ?? "cross-companion";
              const color = s.companion_id ? COMPANION_COLOR[s.companion_id] ?? "#94a3b8" : "#94a3b8";
              return (
                <div key={s.id} className="handover-entry">
                  <div className="handover-footer" style={{ marginBottom: "0.5rem" }}>
                    <span className="note-item-author" style={{ color }}>{who}</span>
                    <span className="note-type-badge">{s.summary_type.replace(/_/g, " ")}</span>
                    <span className="ml-auto"><ClientTime iso={s.created_at} /></span>
                  </div>
                  {s.subject && <p className="handover-spine">{s.subject}</p>}
                  {s.narrative && <p className="handover-last-real">{s.narrative}</p>}
                  {s.emotional_register && (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      {s.emotional_register}
                    </p>
                  )}
                  {threads.length > 0 && (
                    <div className="handover-threads">
                      {threads.map((t, i) => (
                        <span key={i} className="thread-tag">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
