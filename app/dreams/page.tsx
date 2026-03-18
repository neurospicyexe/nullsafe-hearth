"use client";

import { useEffect, useState } from "react";
import type { Dream, DreamSeed } from "@/lib/halseth";

// Single source of truth — mirrors CSS vars in globals.css
const COMPANION_COLORS: Record<string, string> = {
  drevan: "var(--drevan)",
  cypher: "var(--cypher)",
  gaia:   "var(--gaia)",
};

const DREAM_TYPE_DESC: Record<string, string> = {
  processing:  "processing",
  questioning: "questioning",
  memory:      "memory",
  play:        "play",
  integrating: "integrating",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function DreamEntry({ dream }: { dream: Dream }) {
  const color = COMPANION_COLORS[dream.companion_id] ?? "var(--accent)";
  return (
    <div className="full-note-entry" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="note-header">
        <span className="note-author" style={{ color }}>{dream.companion_id}</span>
        <span className="note-type-badge">{DREAM_TYPE_DESC[dream.dream_type] ?? dream.dream_type}</span>
        <span className="note-time">{fmtTime(dream.generated_at)}</span>
      </div>
      <div className="note-body">{dream.content}</div>
    </div>
  );
}

function SeedEntry({ seed }: { seed: DreamSeed }) {
  const claimed = !!seed.claimed_at;
  const forColor = seed.for_companion
    ? (COMPANION_COLORS[seed.for_companion] ?? "var(--accent)")
    : "var(--muted)";
  return (
    <div className="dream-seed-item" style={{ opacity: claimed ? 0.55 : 1, borderColor: claimed ? "var(--border)" : "var(--accent)" }}>
      <div className="dream-seed-meta">
        <span className="dream-seed-for" style={{ color: forColor }}>
          {seed.for_companion ? `→ ${seed.for_companion}` : "any companion"}
        </span>
        {claimed ? (
          <span className="dream-seed-status">
            claimed by {seed.claimed_by} · {fmtTime(seed.claimed_at!)}
          </span>
        ) : (
          <span className="dream-seed-status pending">pending</span>
        )}
        <span className="dream-seed-time">{fmtTime(seed.created_at)}</span>
      </div>
      <div className="dream-seed-content">{seed.content}</div>
    </div>
  );
}

export default function DreamsPage() {
  const [dreams, setDreams]         = useState<Dream[]>([]);
  const [seeds, setSeeds]           = useState<DreamSeed[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<"dreams" | "seeds">("dreams");

  const [seedText, setSeedText]     = useState("");
  const [forCompanion, setForComp]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/dream-seeds").then((r) => r.ok ? r.json() : []),
      fetch("/api/feelings?type=dreams").then((r) => r.ok ? r.json() : []),
    ]).then(([s, d]) => {
      setSeeds(Array.isArray(s) ? s : []);
      setDreams(Array.isArray(d) ? d : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [submitted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seedText.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/dream-seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: seedText.trim(),
          for_companion: forCompanion || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSeedText("");
      setForComp("");
      setSubmitted((v) => !v);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to inject seed");
    } finally {
      setSubmitting(false);
    }
  }

  const pendingCount = seeds.filter((s) => !s.claimed_at).length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dreams</h1>
        <p className="page-subtitle">autonomous processing — what surfaces when no one is watching</p>
      </div>

      <section className="dream-form-section">
        <div className="dream-form-label">Inject a Dream Seed</div>
        <p className="dream-form-hint">
          Leave something for a companion to find during autonomous time. A question, a memory,
          an image, a fragment. If no seed is pending, they fall back to reading deltas and handovers.
        </p>
        <form onSubmit={handleSubmit} className="dream-form-inner">
          <textarea
            className="input"
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            placeholder="What do you want them to sit with?"
            rows={3}
          />
          <div className="dream-form-row">
            <select
              className="input"
              value={forCompanion}
              onChange={(e) => setForComp(e.target.value)}
            >
              <option value="">any companion</option>
              <option value="drevan">drevan</option>
              <option value="cypher">cypher</option>
              <option value="gaia">gaia</option>
            </select>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !seedText.trim()}
            >
              {submitting ? "Injecting…" : "Inject"}
            </button>
            {pendingCount > 0 && (
              <span style={{ fontSize: "0.78rem", color: "var(--accent)" }}>
                {pendingCount} pending
              </span>
            )}
          </div>
          {error && <p className="dream-form-error">{error}</p>}
        </form>
      </section>

      <div className="filter-tabs" style={{ marginBottom: "1.25rem" }}>
        <button className={`filter-tab ${tab === "dreams" ? "active" : ""}`} onClick={() => setTab("dreams")}>
          Dreams {dreams.length > 0 && `(${dreams.length})`}
        </button>
        <button className={`filter-tab ${tab === "seeds" ? "active" : ""}`} onClick={() => setTab("seeds")}>
          Seeds {pendingCount > 0 && `(${pendingCount} pending)`}
        </button>
      </div>

      {loading && <p className="empty">Loading…</p>}

      {!loading && tab === "dreams" && (
        dreams.length === 0
          ? <p className="empty">No dreams logged yet. They will appear here after autonomous time.</p>
          : <div className="full-notes-feed">{dreams.map((d) => <DreamEntry key={d.id} dream={d} />)}</div>
      )}

      {!loading && tab === "seeds" && (
        seeds.length === 0
          ? <p className="empty">No seeds yet. Use the form above to leave something.</p>
          : <div className="dream-seeds-list">
              {seeds.map((s) => <SeedEntry key={s.id} seed={s} />)}
            </div>
      )}
    </>
  );
}
