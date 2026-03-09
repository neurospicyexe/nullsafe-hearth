"use client";

import { useEffect, useState } from "react";
import type { RelationalDelta } from "@/lib/halseth";

const VALENCES = ["all", "toward", "tender", "neutral", "rupture", "repair"] as const;

const VALENCE_LABELS: Record<string, string> = {
  toward: "toward",
  tender: "tender",
  neutral: "neutral",
  rupture: "rupture",
  repair: "repair",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function DeltaEntry({ delta }: { delta: RelationalDelta }) {
  const v = delta.valence ?? "neutral";
  return (
    <div className={`delta-entry ${v}`}>
      <div className="delta-text">{delta.delta_text}</div>
      <div className="delta-meta">
        <span className={`delta-valence ${v}`}>{VALENCE_LABELS[v] ?? v}</span>
        {delta.agent && <span>by {delta.agent}</span>}
        {delta.initiated_by && <span>· initiated by {delta.initiated_by}</span>}
        <span>{formatTime(delta.created_at)}</span>
      </div>
    </div>
  );
}

export default function FeelingsPage() {
  const [deltas, setDeltas] = useState<RelationalDelta[] | null>(null);
  const [filter, setFilter] = useState<typeof VALENCES[number]>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feelings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data)) setDeltas(data);
        else setDeltas([]);
      })
      .catch(() => setDeltas([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all" ? deltas : deltas?.filter((d) => d.valence === filter);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Feelings</h1>
        <p className="page-subtitle">relational deltas — the shape of what has been felt</p>
      </div>

      <div className="filter-tabs" style={{ marginBottom: "1.25rem" }}>
        {VALENCES.map((v) => (
          <button
            key={v}
            className={`filter-tab ${filter === v ? "active" : ""}`}
            onClick={() => setFilter(v)}
          >
            {v}
          </button>
        ))}
      </div>

      {loading && (
        <p className="empty">Loading deltas…</p>
      )}

      {!loading && (!filtered || filtered.length === 0) && (
        <div className="pending-notice">
          <div className="pending-dot" />
          {deltas === null
            ? "Awaiting Halseth /deltas endpoint."
            : "No deltas match this filter."}
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="delta-feed">
          {filtered.map((d) => (
            <DeltaEntry key={d.id} delta={d} />
          ))}
        </div>
      )}
    </>
  );
}
