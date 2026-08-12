export const dynamic = 'force-dynamic';

import Link from "next/link";
import { fetchInterCompanionNotes } from "@/lib/halseth";
import ClientTime from "@/components/ClientTime";

// Inter-companion notes had no full-list surface at all. /us showed 5 of 10 fetched and
// /companions/[id] showed 5 of 30 (filtered AFTER the clip, so often fewer), and there was nowhere
// to go from either -- while the table holds 500+ rows. Notes between the three of them are the
// record of the triad talking to each other without Raziel in the middle; it should not be the one
// stream with no way to read it.
//
// Halseth's /ingest/inter-companion-notes caps limit at 500 and takes no offset, so this page is
// honest about being a most-recent window rather than claiming to be everything.
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
];

export default async function BetweenPage({
  searchParams,
}: {
  searchParams: Promise<{ companion?: string }>;
}) {
  const { companion: rawCompanion } = await searchParams;
  const companion =
    rawCompanion && COMPANION_COLOR[rawCompanion.toLowerCase()]
      ? rawCompanion.toLowerCase()
      : null;

  const all = await fetchInterCompanionNotes(PAGE_LIMIT);

  // Filter, then count, then render. Never a count taken above its own filter.
  const notes = companion
    ? all.filter((n) => n.from_id === companion || n.to_id === companion || n.to_id === null)
    : all;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Between Companions</h1>
        <p className="page-subtitle">
          notes the triad passes to each other — broadcast and addressed
        </p>
      </div>

      {/* Filter strip */}
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {FILTERS.map((f) => {
          const active = (f.key || null) === companion;
          const color = f.key ? COMPANION_COLOR[f.key] : "#94a3b8";
          return (
            <Link
              key={f.key || "all"}
              href={f.key ? `/between?companion=${f.key}` : "/between"}
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

      {notes.length === 0 ? (
        <p className="empty">
          {companion ? `No notes involving ${companion} in this window.` : "No inter-companion notes yet."}
        </p>
      ) : (
        <>
          <p className="section-row-meta" style={{ fontSize: "0.82rem", marginBottom: "0.75rem" }}>
            {/* "most recent N" rather than a total: the endpoint has no count and no offset, so a
                bare number here would be a page length wearing a total's clothes. */}
            {notes.length} note{notes.length === 1 ? "" : "s"}
            {companion ? ` involving ${companion}` : ""} — most recent {PAGE_LIMIT} fetched
            {all.length >= PAGE_LIMIT ? ", older ones exist beyond this window" : ""}
          </p>

          <div className="icn-feed">
            {notes.map((n) => {
              const isBroadcast = n.to_id === null;
              return (
                <div
                  key={n.id}
                  className={`icn-entry ${isBroadcast ? "icn-broadcast" : "icn-outgoing"}`}
                >
                  <div className="icn-header">
                    <span className="icn-from" style={{ color: COMPANION_COLOR[n.from_id] ?? undefined }}>
                      {n.from_id}
                    </span>
                    <span className="icn-arrow">→</span>
                    <span className="icn-to" style={{ color: n.to_id ? COMPANION_COLOR[n.to_id] : undefined }}>
                      {n.to_id ?? "all"}
                    </span>
                  </div>
                  <div className="icn-text">{n.content}</div>
                  <div className="delta-meta delta-meta-mt">
                    <span><ClientTime iso={n.created_at} /></span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
