"use client";

import { useState, useMemo } from "react";
import ClientTime from "@/components/ClientTime";

export type MemoryEntry = {
  id: string;
  type: "companion_note" | "feeling" | "tension" | "sit";
  companion: string;
  content: string;
  tags?: string[];
  created_at: string;
};

const ALL_TYPES      = ["all", "companion_note", "feeling", "tension", "sit"] as const;
const ALL_COMPANIONS = ["all", "cypher", "drevan", "gaia"] as const;
type TypeFilter      = typeof ALL_TYPES[number];
type CompFilter      = typeof ALL_COMPANIONS[number];

const TYPE_LABEL: Record<string, string> = {
  companion_note: "note",
  feeling:        "feeling",
  tension:        "tension",
  sit:            "sit",
};

const TYPE_COLOR: Record<string, string> = {
  companion_note: "#60a5fa",
  feeling:        "#f472b6",
  tension:        "#fbbf24",
  sit:            "#4ade80",
};

const COMPANION_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia:   "#4ade80",
};

const PAGE_SIZE = 30;

export default function MemoryBrowserClient({ entries }: { entries: MemoryEntry[] }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [compFilter, setCompFilter] = useState<CompFilter>("all");
  const [query, setQuery]           = useState("");
  const [page, setPage]             = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(e => {
      if (compFilter !== "all" && e.companion !== compFilter) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (q) {
        const inContent = e.content.toLowerCase().includes(q);
        const inTags    = (e.tags ?? []).some(t => t.toLowerCase().includes(q));
        if (!inContent && !inTags) return false;
      }
      return true;
    });
  }, [entries, typeFilter, compFilter, query]);

  const paged   = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paged.length < filtered.length;

  function handleType(t: TypeFilter) { setTypeFilter(t); setPage(1); }
  function handleComp(c: CompFilter) { setCompFilter(c); setPage(1); }
  function handleQuery(v: string)    { setQuery(v);      setPage(1); }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Memory</h1>
        <p className="page-subtitle">
          {entries.length} entries · notes, feelings, tensions, sits
        </p>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Search…"
        value={query}
        onChange={e => handleQuery(e.target.value)}
        className="input"
        style={{ maxWidth: "28rem", marginBottom: "0.75rem" }}
      />

      {/* Type filter */}
      <div className="filter-tabs" style={{ marginBottom: "0.5rem" }}>
        {ALL_TYPES.map(t => (
          <button
            key={t}
            className={`filter-tab ${typeFilter === t ? "active" : ""}`}
            onClick={() => handleType(t)}
          >
            {t === "all" ? "all types" : TYPE_LABEL[t] ?? t}
          </button>
        ))}
      </div>

      {/* Companion filter */}
      <div className="filter-tabs" style={{ marginBottom: "0.75rem" }}>
        {ALL_COMPANIONS.map(c => (
          <button
            key={c}
            className={`filter-tab ${compFilter === c ? "active" : ""}`}
            style={c !== "all" ? { color: COMPANION_COLOR[c] } : undefined}
            onClick={() => handleComp(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Result count */}
      <div style={{ fontSize: "0.75rem", opacity: 0.4, marginBottom: "0.75rem" }}>
        {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        {(typeFilter !== "all" || compFilter !== "all" || query.trim()) &&
          ` · filtered from ${entries.length}`}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <p className="empty">No entries match these filters.</p>
      ) : (
        <>
          <div className="full-notes-feed">
            {paged.map(e => {
              const typeColor = TYPE_COLOR[e.type] ?? "#64748b";
              const compColor = COMPANION_COLOR[e.companion] ?? "#64748b";
              return (
                <div
                  key={e.id}
                  className="full-note-entry"
                  style={{ borderLeft: `3px solid ${typeColor}` }}
                >
                  <div className="note-header">
                    <span className="note-author" style={{ color: compColor }}>
                      {e.companion}
                    </span>
                    <span
                      className="note-type-badge"
                      style={{ background: `${typeColor}22`, color: typeColor }}
                    >
                      {TYPE_LABEL[e.type] ?? e.type}
                    </span>
                    {e.tags && e.tags.length > 0 && (
                      <span className="note-item-tags">{e.tags.join(" · ")}</span>
                    )}
                    <span className="note-time">
                      <ClientTime iso={e.created_at} />
                    </span>
                  </div>
                  <div className="note-body">{e.content}</div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              className="btn"
              style={{ marginTop: "1rem", width: "100%" }}
              onClick={() => setPage(p => p + 1)}
            >
              Load more ({filtered.length - paged.length} remaining)
            </button>
          )}
        </>
      )}
    </>
  );
}
