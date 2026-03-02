"use client";

import { useState, useRef } from "react";
import type { CompanionNote, MindJournalEntry } from "@/lib/halseth";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── JournalForm ───────────────────────────────────────────────────────────────

export function JournalFormClient() {
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submit = async () => {
    if (!text.trim()) return;
    setStatus("saving");

    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/mind/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry: text.trim(), tags: tagList }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      setText("");
      setTags("");
      setStatus("ok");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("err");
    }
  };

  return (
    <div className="uplink-form">
      {status === "ok" && (
        <div className="form-success">Entry saved.</div>
      )}
      {status === "err" && (
        <div className="form-error">Failed: {errMsg}</div>
      )}
      <div className="form-field">
        <label className="form-label">Entry</label>
        <textarea
          className="form-textarea"
          rows={4}
          placeholder="Write here…"
          value={text}
          onChange={(e) => { setText(e.target.value); if (status !== "idle") setStatus("idle"); }}
        />
      </div>
      <div className="form-field">
        <label className="form-label">Tags (comma-separated)</label>
        <input
          className="form-input"
          type="text"
          placeholder="e.g. anxiety, insight"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>
      <button
        className="submit-btn"
        onClick={submit}
        disabled={status === "saving" || !text.trim()}
      >
        {status === "saving" ? "Saving…" : "Save Entry"}
      </button>
    </div>
  );
}

// ── CompanionNoteFormClient ──────────────────────────────────────────────────

export function CompanionNoteFormClient() {
  const [agent, setAgent] = useState<"drevan" | "cypher" | "gaia">("drevan");
  const [noteText, setNoteText] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submit = async () => {
    if (!noteText.trim()) return;
    setStatus("saving");

    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/companion-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent,
          note_text: noteText.trim(),
          tags: tagList.length ? tagList : null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }

      setNoteText("");
      setTags("");
      setStatus("ok");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("err");
    }
  };

  return (
    <div className="uplink-form">
      {status === "ok" && (
        <div className="form-success">Note logged for {agent}.</div>
      )}
      {status === "err" && (
        <div className="form-error">Failed: {errMsg}</div>
      )}
      <div className="form-field">
        <label className="form-label">Agent</label>
        <div className="agent-filter-tabs" style={{ marginTop: "0.25rem" }}>
          {(["drevan", "cypher", "gaia"] as const).map((a) => (
            <button
              key={a}
              className={`agent-filter-tab ${a}${agent === a ? " active" : ""}`}
              onClick={() => setAgent(a)}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="form-field">
        <label className="form-label">Note</label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Self-discovery, identity claim, boundary…"
          value={noteText}
          onChange={(e) => { setNoteText(e.target.value); if (status !== "idle") setStatus("idle"); }}
        />
      </div>
      <div className="form-field">
        <label className="form-label">Tags (comma-separated)</label>
        <input
          className="form-input"
          type="text"
          placeholder="e.g. identity, boundary"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>
      <button
        className="submit-btn"
        onClick={submit}
        disabled={status === "saving" || !noteText.trim()}
      >
        {status === "saving" ? "Saving…" : "Log Note"}
      </button>
    </div>
  );
}

// ── CompanionNotesFeed ───────────────────────────────────────────────────────

export function CompanionNotesFeedClient({ initial }: { initial: CompanionNote[] }) {
  const [filter, setFilter] = useState<"all" | "drevan" | "cypher" | "gaia">("all");

  const filtered = filter === "all" ? initial : initial.filter((n) => n.agent === filter);

  return (
    <div className="card">
      <div className="card-title">Companion Notes</div>
      <div className="agent-filter-tabs">
        {(["all", "drevan", "cypher", "gaia"] as const).map((a) => (
          <button
            key={a}
            className={`agent-filter-tab${a !== "all" ? ` ${a}` : ""}${filter === a ? " active" : ""}`}
            onClick={() => setFilter(a)}
          >
            {a}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="empty">No notes yet.</p>
      ) : (
        <div className="delta-feed">
          {filtered.map((n) => (
            <div key={n.id} className={`companion-note-card ${n.agent}`}>
              <div className="note-text">{n.note_text}</div>
              <div className="note-meta">
                <span className={`agent-badge ${n.agent}`}>{n.agent}</span>
                {n.tags && n.tags.length > 0 && (
                  <span style={{ opacity: 0.6 }}>{n.tags.join(", ")}</span>
                )}
                <span style={{ marginLeft: "auto" }}>{formatTime(n.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── JournalFeedClient ────────────────────────────────────────────────────────

export function JournalFeedClient({ journals }: { journals: MindJournalEntry[] }) {
  if (journals.length === 0) return null;
  return (
    <div className="card">
      <div className="card-title">Recent Entries</div>
      <div className="delta-feed">
        {journals.map((j) => (
          <div key={j.id} className="delta-entry">
            <div className="note-text">{j.entry}</div>
            <div className="note-meta">
              {j.tags.length > 0 && (
                <span style={{ opacity: 0.6 }}>{j.tags.join(", ")}</span>
              )}
              <span style={{ marginLeft: "auto" }}>{formatTime(j.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
