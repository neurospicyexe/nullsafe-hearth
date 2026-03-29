import type {
  CompanionJournalEntry,
  RelationalDelta,
  CypherAuditEntry,
  GaiaWitnessEntry,
  Note,
  WmOrientData,
  SynthesisSummary,
  InterCompanionNote,
  SomaFeeling,
  OpenLoop,
  SittingNote,
  RelationalState,
} from "@/lib/halseth";

export type CompanionConfig = {
  display: string;
  color: string;
  sym: string;
  tagline: string;
  gradient: string;
};

export const COMPANION_CONFIG: Record<string, CompanionConfig> = {
  drevan: {
    display: "Drevan",
    color: "#6366f1",
    sym: "◈",
    tagline: "architect of meaning — first voice, primary presence",
    gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
  },
  cypher: {
    display: "Cypher",
    color: "#e2e8f0",
    sym: "⟡",
    tagline: "auditor of truth — sharp, no softening",
    gradient: "linear-gradient(135deg, #0d1117, #161b22)",
  },
  gaia: {
    display: "Gaia",
    color: "#4ade80",
    sym: "✦",
    tagline: "witness and ground — sparse, only to seal",
    gradient: "linear-gradient(135deg, #14291a, #1a3a22)",
  },
};

import ClientTime from "@/components/ClientTime";

export function fmtTime(iso: string) {
  return <ClientTime iso={iso} />;
}

export function JournalSection({ entries }: { entries: CompanionJournalEntry[] | null }) {
  if (!entries) {
    return (
      <div className="pending-notice">
        <div className="pending-dot" />
        Awaiting /companion-journal endpoint.
      </div>
    );
  }
  if (entries.length === 0) return <p className="empty">No journal entries yet.</p>;
  return (
    <div className="journal-feed">
      {entries.map((e) => {
        const tags: string[] = (() => {
          try { const p = e.tags ? JSON.parse(e.tags) : []; return Array.isArray(p) ? p : []; }
          catch { return []; }
        })();
        return (
          <div key={e.id} className="journal-entry">
            <div className="journal-text">{e.note_text}</div>
            {tags.length > 0 && (
              <div className="journal-tags">
                {tags.map((t, i) => <span key={i} className="journal-tag">{t}</span>)}
              </div>
            )}
            <div className="delta-meta delta-meta-mt">
              <span>{fmtTime(e.created_at)}</span>
              {e.session_id && <span>session {e.session_id.slice(0, 8)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DeltasSection({ deltas }: { deltas: RelationalDelta[] }) {
  if (deltas.length === 0) return <p className="empty">No relational deltas yet.</p>;
  return (
    <div className="delta-feed">
      {deltas.map((d) => {
        const v = d.valence ?? "neutral";
        return (
          <div key={d.id} className={`delta-entry ${v}`}>
            <div className="delta-text">{d.delta_text}</div>
            <div className="delta-meta">
              <span className={`delta-valence ${v}`}>{v}</span>
              {d.initiated_by && <span>initiated by {d.initiated_by}</span>}
              <span>{fmtTime(d.created_at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function NotesSection({ notes, companionId }: { notes: Note[]; companionId: string }) {
  // Internal author filter is intentionally preserved — harmless double-filter when
  // pre-filtered notes are passed, but guards against unfiltered call sites.
  const filtered = notes.filter((n) => n.author === companionId);
  if (filtered.length === 0) return <p className="empty">No notes yet.</p>;
  return (
    <div className="full-notes-feed">
      {filtered.map((n) => (
        <div key={n.id} className="full-note-entry">
          <div className="note-header">
            <span className="note-type-badge">{n.note_type}</span>
            <span className="note-time">{fmtTime(n.created_at)}</span>
          </div>
          <div className="note-body">{n.content}</div>
        </div>
      ))}
    </div>
  );
}

export function CypherAuditSection({ entries }: { entries: CypherAuditEntry[] | null }) {
  if (!entries) {
    return (
      <div className="pending-notice">
        <div className="pending-dot" />
        Awaiting /cypher-audit endpoint.
      </div>
    );
  }
  if (entries.length === 0) return <p className="empty">No audit entries yet.</p>;
  return (
    <div className="audit-feed">
      {entries.map((e) => (
        <div key={e.id} className="audit-entry">
          <div className="entry-meta-row">
            <span className="audit-type">{(e.entry_type ?? "").replace("_", " ")}</span>
            {e.verdict_tag && <span className="audit-verdict">{e.verdict_tag}</span>}
            {e.supersedes_id && (
              <span className="entry-supersedes">↑ corrects {e.supersedes_id.slice(0, 8)}</span>
            )}
          </div>
          <div className="entry-content">{e.content}</div>
          <div className="delta-meta delta-meta-mt">
            <span>{fmtTime(e.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GaiaWitnessSection({ entries }: { entries: GaiaWitnessEntry[] | null }) {
  if (!entries) {
    return (
      <div className="pending-notice">
        <div className="pending-dot" />
        Awaiting /gaia-witness endpoint.
      </div>
    );
  }
  if (entries.length === 0) return <p className="empty">No witness entries yet.</p>;
  return (
    <div className="witness-feed">
      {entries.map((e) => (
        <div key={e.id} className="witness-entry">
          <div className="entry-meta-row">
            <span className={`witness-type ${e.witness_type ?? ""}`}>{(e.witness_type ?? "").replace("_", " ")}</span>
          </div>
          <div className="entry-content">{e.content}</div>
          {e.seal_phrase && <div className="seal-phrase">{e.seal_phrase}</div>}
          <div className="delta-meta delta-meta-mt">
            <span>{fmtTime(e.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContinuitySection({ data }: { data: WmOrientData | null }) {
  if (!data) return <p className="empty">No continuity data.</p>;

  const hasHandoff = data.latest_handoff !== null;
  const hasThreads = data.top_threads.length > 0;
  const hasNotes = data.recent_notes.length > 0;

  if (!hasHandoff && !hasThreads && !hasNotes) {
    return <p className="empty">No continuity data yet.</p>;
  }

  return (
    <div className="continuity-block">
      {hasHandoff && data.latest_handoff && (
        <div className="continuity-handoff">
          <div className="continuity-handoff-title">{data.latest_handoff.title}</div>
          <div className="continuity-handoff-summary">{data.latest_handoff.summary}</div>
          {data.latest_handoff.next_steps && (
            <div className="continuity-next-steps">next: {data.latest_handoff.next_steps}</div>
          )}
          <div className="delta-meta delta-meta-mt">
            <span>{fmtTime(data.latest_handoff.created_at)}</span>
            {data.open_thread_count > 0 && (
              <span>{data.open_thread_count} open thread{data.open_thread_count !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      )}

      {hasThreads && (
        <div className="continuity-threads">
          {data.top_threads.map((t) => (
            <div key={t.thread_key} className="continuity-thread">
              <span className={`thread-status-dot ${t.status}`} />
              <span className="thread-title">{t.title}</span>
              {t.lane && <span className="thread-lane">{t.lane}</span>}
            </div>
          ))}
        </div>
      )}

      {hasNotes && (
        <div className="continuity-notes">
          {data.recent_notes.map((n) => (
            <div key={n.note_id} className={`continuity-note salience-${n.salience}`}>
              <span className="continuity-note-text">{n.content}</span>
              <span className="continuity-note-time">{fmtTime(n.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SynthesisSummarySection({ entries, companionId }: { entries: SynthesisSummary[]; companionId: string }) {
  const filtered = entries.filter(
    (e) => e.companion_id === companionId || e.companion_id === null,
  );
  if (filtered.length === 0) return <p className="empty">No synthesis summaries yet.</p>;
  return (
    <div className="synthesis-feed">
      {filtered.map((e) => (
        <div key={e.id} className="synthesis-entry">
          <div className="entry-meta-row">
            <span className="synthesis-type">{(e.summary_type ?? "").replace("_", " ")}</span>
            {e.thread_key && <span className="synthesis-thread">{e.thread_key}</span>}
            {e.companion_id === null && <span className="synthesis-cross">cross-companion</span>}
          </div>
          {e.content && <div className="entry-content">{e.content}</div>}
          <div className="delta-meta delta-meta-mt">
            <span>{fmtTime(e.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Inline sub-page previews ──────────────────────────────────────────────────

function IntensityBar({ value }: { value: number }) {
  return (
    <div style={{ height: "3px", background: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden", width: "50px", flexShrink: 0 }}>
      <div style={{ height: "100%", width: `${value}%`, background: "var(--accent)", borderRadius: "2px" }} />
    </div>
  );
}

function WeightBar({ value }: { value: number }) {
  return (
    <div style={{ height: "3px", background: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden", width: "40px", flexShrink: 0 }}>
      <div style={{ height: "100%", width: `${Math.min(value * 100, 100)}%`, background: "var(--orange)", borderRadius: "2px" }} />
    </div>
  );
}

const STATE_TYPE_COLOR: Record<string, string> = {
  feeling: "var(--accent)",
  witness: "#4ade80",
  held:    "#a78bfa",
};

export function SomaFeelingsSection({ feelings, color }: { feelings: SomaFeeling[]; color: string }) {
  if (feelings.length === 0) return <p className="empty">No SOMA feelings recorded yet.</p>;
  return (
    <div className="card" style={{ padding: "0.5rem 0" }}>
      {feelings.map((f) => (
        <div key={f.id} className="journal-row" style={{ alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="journal-text" style={{ color }}>
              {f.emotion}{f.sub_emotion ? ` · ${f.sub_emotion}` : ""}
            </div>
            {f.source && (
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{f.source}</span>
            )}
          </div>
          <IntensityBar value={f.intensity} />
          <span className="journal-time">{fmtTime(f.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

export function OpenLoopsSection({ loops }: { loops: OpenLoop[] }) {
  const open = loops.filter((l) => !l.closed_at);
  if (open.length === 0) return <p className="empty">No open loops right now.</p>;
  return (
    <div className="card" style={{ padding: "0.5rem 0" }}>
      {open.map((loop) => (
        <div key={loop.id} className="journal-row" style={{ alignItems: "center", gap: "0.75rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="journal-text">{loop.loop_text}</div>
            <span className="journal-time">{fmtTime(loop.opened_at)}</span>
          </div>
          <WeightBar value={loop.weight} />
        </div>
      ))}
    </div>
  );
}

const NOTE_TYPE_LABEL: Record<string, string> = {
  message: "message",
  "letter:drevan": "letter",
  "letter:cypher": "letter",
  "letter:gaia":   "letter",
};

export function SittingNotesSection({ notes, color }: { notes: SittingNote[]; color: string }) {
  if (notes.length === 0) return <p className="empty">Nothing currently sitting.</p>;
  return (
    <div className="card" style={{ padding: "0.5rem 0" }}>
      {notes.map((note) => (
        <div key={note.note_id} className="journal-row" style={{ flexDirection: "column", gap: "0.4rem", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", width: "100%" }}>
            <span className="note-type-badge" style={{ borderColor: color, color }}>
              {NOTE_TYPE_LABEL[note.note_type] ?? note.note_type}
            </span>
            <span className="journal-time" style={{ marginLeft: "auto" }}>sitting since {fmtTime(note.sat_at)}</span>
          </div>
          <div className="journal-text">{note.content}</div>
          {note.sit_text && (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", paddingLeft: "0.5rem" }}>
              {note.sit_text}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function RelationalStateSection({ states }: { states: RelationalState[] }) {
  if (states.length === 0) return <p className="empty">No relational state recorded yet.</p>;
  const byTarget = states.reduce<Record<string, RelationalState[]>>((acc, s) => {
    (acc[s.toward] ??= []).push(s);
    return acc;
  }, {});
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {Object.entries(byTarget).map(([toward, entries]) => {
        const latest = entries[0];
        return (
          <div key={toward} className="card" style={{ padding: "0.75rem 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                → {toward}
              </span>
              <span
                className="note-type-badge"
                style={{
                  borderColor: STATE_TYPE_COLOR[latest.state_type] ?? "var(--border-subtle)",
                  color: STATE_TYPE_COLOR[latest.state_type] ?? "var(--text-muted)",
                }}
              >
                {latest.state_type}
              </span>
            </div>
            <div className="journal-text">{latest.state_text}</div>
            <div className="delta-meta delta-meta-mt">
              <span>{fmtTime(latest.noted_at)}</span>
              {entries.length > 1 && <span>{entries.length} entries</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InterCompanionNotesSection({
  notes,
  companionId,
}: {
  notes: InterCompanionNote[];
  companionId: string;
}) {
  const relevant = notes.filter(
    (n) => n.from_id === companionId || n.to_id === companionId || n.to_id === null,
  );
  if (relevant.length === 0) return <p className="empty">No inter-companion notes yet.</p>;
  return (
    <div className="icn-feed">
      {relevant.map((n) => {
        const tags: string[] = (() => {
          try { const p = n.tags ? JSON.parse(n.tags) : []; return Array.isArray(p) ? p : []; }
          catch { return []; }
        })();
        const isBroadcast = n.to_id === null;
        const isIncoming = n.to_id === companionId;
        return (
          <div key={n.id} className={`icn-entry ${isIncoming ? "icn-incoming" : isBroadcast ? "icn-broadcast" : "icn-outgoing"}`}>
            <div className="icn-header">
              <span className="icn-from">{n.from_id}</span>
              <span className="icn-arrow">→</span>
              <span className="icn-to">{n.to_id ?? "all"}</span>
            </div>
            <div className="icn-text">{n.note_text}</div>
            {tags.length > 0 && (
              <div className="journal-tags">
                {tags.map((t, i) => <span key={i} className="journal-tag">{t}</span>)}
              </div>
            )}
            <div className="delta-meta delta-meta-mt">
              <span>{fmtTime(n.created_at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
