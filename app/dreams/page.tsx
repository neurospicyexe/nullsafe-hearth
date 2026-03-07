"use client";

import { useEffect, useState } from "react";
import type { Dream, DreamSeed } from "@/lib/halseth";

const COMPANION_COLORS: Record<string, string> = {
  drevan: "#6366f1",
  cypher: "#e2e8f0",
  gaia:   "#4ade80",
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
  return (
    <div className="full-note-entry" style={{ borderLeft: `3px solid ${COMPANION_COLORS[dream.companion_id] ?? "var(--accent)"}` }}>
      <div className="note-header">
        <span className="note-author" style={{ color: COMPANION_COLORS[dream.companion_id] ?? "var(--accent)" }}>
          {dream.companion_id}
        </span>
        <span className="note-type-badge">{DREAM_TYPE_DESC[dream.dream_type] ?? dream.dream_type}</span>
        <span className="note-time">{fmtTime(dream.generated_at)}</span>
      </div>
      <div className="note-body">{dream.content}</div>
    </div>
  );
}

function SeedEntry({ seed }: { seed: DreamSeed }) {
  const claimed = !!seed.claimed_at;
  return (
    <div style={{
      padding: "0.75rem 1rem",
      borderRadius: "6px",
      background: "var(--card-bg)",
      border: `1px solid ${claimed ? "var(--border)" : "var(--accent)"}`,
      opacity: claimed ? 0.55 : 1,
    }}>
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "0.4rem", flexWrap: "wrap" }}>
        {seed.for_companion ? (
          <span style={{ fontSize: "0.75rem", color: COMPANION_COLORS[seed.for_companion] ?? "var(--accent)", fontWeight: 600 }}>
            → {seed.for_companion}
          </span>
        ) : (
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>any companion</span>
        )}
        {claimed ? (
          <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontStyle: "italic" }}>
            claimed by {seed.claimed_by} · {fmtTime(seed.claimed_at!)}
          </span>
        ) : (
          <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontStyle: "italic" }}>pending</span>
        )}
        <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--muted)" }}>{fmtTime(seed.created_at)}</span>
      </div>
      <div style={{ fontSize: "0.88rem", color: "var(--fg)", lineHeight: 1.5 }}>{seed.content}</div>
    </div>
  );
}

export default function DreamsPage() {
  const [dreams, setDreams]         = useState<Dream[]>([]);
  const [seeds, setSeeds]           = useState<DreamSeed[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<"dreams" | "seeds">("dreams");

  // Seed form state
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
      setSubmitted((v) => !v); // trigger reload
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

      {/* Seed injection form */}
      <section style={{ marginBottom: "2rem", padding: "1rem 1.25rem", background: "var(--card-bg)", border: "1px solid var(--accent)", borderRadius: "8px" }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", marginBottom: "0.75rem" }}>
          Inject a Dream Seed
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
          Leave something for a companion to find during autonomous time. A question, a memory,
          an image, a fragment. If no seed is pending, they fall back to reading deltas and handovers.
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <textarea
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            placeholder="What do you want them to sit with?"
            rows={3}
            style={{
              width: "100%", padding: "0.6rem 0.75rem",
              background: "var(--input-bg, #0d0d0d)", border: "1px solid var(--border)",
              borderRadius: "4px", color: "var(--fg)", fontSize: "0.88rem",
              resize: "vertical", fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={forCompanion}
              onChange={(e) => setForComp(e.target.value)}
              style={{
                padding: "0.4rem 0.6rem", background: "var(--input-bg, #0d0d0d)",
                border: "1px solid var(--border)", borderRadius: "4px",
                color: "var(--fg)", fontSize: "0.82rem",
              }}
            >
              <option value="">any companion</option>
              <option value="drevan">drevan</option>
              <option value="cypher">cypher</option>
              <option value="gaia">gaia</option>
            </select>
            <button
              type="submit"
              disabled={submitting || !seedText.trim()}
              style={{
                padding: "0.4rem 1rem", background: "var(--accent)", color: "#000",
                border: "none", borderRadius: "4px", fontSize: "0.82rem",
                fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting || !seedText.trim() ? 0.5 : 1,
              }}
            >
              {submitting ? "Injecting…" : "Inject"}
            </button>
            {pendingCount > 0 && (
              <span style={{ fontSize: "0.78rem", color: "var(--accent)" }}>
                {pendingCount} pending
              </span>
            )}
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: "0.8rem", margin: 0 }}>{error}</p>}
        </form>
      </section>

      {/* Tabs */}
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
          : <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {seeds.map((s) => <SeedEntry key={s.id} seed={s} />)}
            </div>
      )}
    </>
  );
}
