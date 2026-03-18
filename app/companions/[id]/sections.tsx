import type {
  CompanionJournalEntry,
  RelationalDelta,
  CypherAuditEntry,
  GaiaWitnessEntry,
  Note,
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

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
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
          try { return e.tags ? JSON.parse(e.tags) : []; }
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
            <span className="audit-type">{e.entry_type.replace("_", " ")}</span>
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
            <span className={`witness-type ${e.witness_type}`}>{e.witness_type.replace("_", " ")}</span>
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
