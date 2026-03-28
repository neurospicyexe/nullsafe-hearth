"use client";

import { useState } from "react";
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

export default function FeelingsClient({ deltas }: { deltas: RelationalDelta[] }) {
  const [filter, setFilter] = useState<typeof VALENCES[number]>("all");

  const filtered = filter === "all" ? deltas : deltas.filter((d) => d.valence === filter);

  return (
    <>
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

      {deltas.length === 0 && (
        <div className="pending-notice">
          <div className="pending-dot" />
          No deltas recorded yet.
        </div>
      )}

      {filtered.length === 0 && deltas.length > 0 && (
        <div className="pending-notice">
          <div className="pending-dot" />
          No deltas match this filter.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="delta-feed">
          {filtered.map((d) => (
            <DeltaEntry key={d.id} delta={d} />
          ))}
        </div>
      )}
    </>
  );
}
