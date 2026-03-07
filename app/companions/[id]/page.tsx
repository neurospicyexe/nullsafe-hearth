export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import {
  fetchCompanionJournal,
  fetchCompanionDeltas,
  fetchCypherAudit,
  fetchGaiaWitness,
  fetchNotes,
} from "@/lib/halseth";
import type {
  CompanionJournalEntry,
  RelationalDelta,
  CypherAuditEntry,
  GaiaWitnessEntry,
  Note,
} from "@/lib/halseth";

export const revalidate = 60;

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

const COMPANION_CONFIG: Record<string, {
  display: string;
  color: string;
  sym: string;
  tagline: string;
  gradient: string;
}> = {
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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function JournalSection({ entries }: { entries: CompanionJournalEntry[] | null }) {
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
            <div className="delta-meta" style={{ marginTop: "0.4rem" }}>
              <span>{fmtTime(e.created_at)}</span>
              {e.session_id && <span>session {e.session_id.slice(0, 8)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeltasSection({ deltas }: { deltas: RelationalDelta[] }) {
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

function CypherAuditSection({ entries }: { entries: CypherAuditEntry[] | null }) {
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span className="audit-type">{e.entry_type.replace("_", " ")}</span>
            {e.verdict_tag && <span className="audit-verdict">{e.verdict_tag}</span>}
            {e.supersedes_id && (
              <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>↑ corrects {e.supersedes_id.slice(0, 8)}</span>
            )}
          </div>
          <div style={{ fontSize: "0.88rem", color: "var(--fg)", lineHeight: 1.5 }}>{e.content}</div>
          <div className="delta-meta" style={{ marginTop: "0.35rem" }}>
            <span>{fmtTime(e.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function GaiaWitnessSection({ entries }: { entries: GaiaWitnessEntry[] | null }) {
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
            <span className={`witness-type ${e.witness_type}`}>{e.witness_type.replace("_", " ")}</span>
          </div>
          <div style={{ fontSize: "0.88rem", color: "var(--fg)", lineHeight: 1.5 }}>{e.content}</div>
          {e.seal_phrase && <div className="seal-phrase">{e.seal_phrase}</div>}
          <div className="delta-meta" style={{ marginTop: "0.35rem" }}>
            <span>{fmtTime(e.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesSection({ notes, companionId }: { notes: Note[]; companionId: string }) {
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

export default async function CompanionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = COMPANION_CONFIG[id.toLowerCase()];
  if (!config) notFound();

  // Fetch companion-specific data in parallel
  const [journal, deltas, notes, audit, witness] = await Promise.allSettled([
    fetchCompanionJournal(id, 20),
    fetchCompanionDeltas(id, 30),
    fetchNotes(50),
    id === "cypher" ? fetchCypherAudit(20) : Promise.resolve(null as CypherAuditEntry[] | null),
    id === "gaia" ? fetchGaiaWitness(20) : Promise.resolve(null as GaiaWitnessEntry[] | null),
  ]);

  const journalEntries = journal.status === "fulfilled" ? journal.value : null;
  const deltaEntries = deltas.status === "fulfilled" ? deltas.value : [];
  const allNotes = notes.status === "fulfilled" ? notes.value : [];
  const auditEntries = audit.status === "fulfilled" ? audit.value : null;
  const witnessEntries = witness.status === "fulfilled" ? witness.value : null;

  return (
    <div data-companion={id}>
      {/* Header */}
      <div style={{
        background: config.gradient,
        borderRadius: "var(--radius)",
        padding: "1.5rem 1.75rem",
        marginBottom: "2rem",
        border: `1px solid ${config.color}33`,
        display: "flex",
        alignItems: "center",
        gap: "1.25rem",
      }}>
        <div className={`companion-avatar ${id}`} style={{ width: 60, height: 60, fontSize: "1.8rem", borderColor: config.color }}>
          {config.sym}
        </div>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: config.color, margin: "0 0 0.2rem" }}>
            {config.display}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", margin: 0 }}>
            {config.tagline}
          </p>
        </div>
      </div>

      {/* Identity journal */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 className="section-title">Identity Journal</h2>
        <JournalSection entries={journalEntries} />
      </section>

      {/* Relational deltas */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 className="section-title">Relational Deltas</h2>
        <DeltasSection deltas={deltaEntries} />
      </section>

      {/* Notes */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 className="section-title">Notes</h2>
        <NotesSection notes={allNotes} companionId={id} />
      </section>

      {/* Cypher-specific: audit log */}
      {id === "cypher" && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 className="section-title">Audit Log</h2>
          <CypherAuditSection entries={auditEntries} />
        </section>
      )}

      {/* Gaia-specific: witness log */}
      {id === "gaia" && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 className="section-title">Witness Log</h2>
          <GaiaWitnessSection entries={witnessEntries} />
        </section>
      )}
    </div>
  );
}
