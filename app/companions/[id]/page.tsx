export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  fetchCompanionJournal,
  fetchCompanionDeltas,
  fetchCypherAudit,
  fetchGaiaWitness,
  fetchNotes,
  fetchCompanionNotesByAgent,
  fetchWmOrient,
  fetchSynthesisSummaries,
  fetchInterCompanionNotes,
  fetchSomaStates,
} from "@/lib/halseth";
import type {
  CypherAuditEntry,
  GaiaWitnessEntry,
  Note,
  CompanionNote,
  CompanionSomaState,
} from "@/lib/halseth";
import { LetterFormClient } from "./client";
import {
  COMPANION_CONFIG,
  fmtTime,
  JournalSection,
  DeltasSection,
  NotesSection,
  CypherAuditSection,
  GaiaWitnessSection,
  ContinuitySection,
  SynthesisSummarySection,
  InterCompanionNotesSection,
} from "./sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

// ── Letters ───────────────────────────────────────────────────────────────────

type LetterItem =
  | { kind: "incoming"; note: CompanionNote; at: string }
  | { kind: "outgoing"; note: Note;          at: string };

const RAZIEL_COLOR = "#f59e0b";

function LettersSection({
  incoming,
  outgoing,
  companionId,
  config,
}: {
  incoming: CompanionNote[];
  outgoing: Note[];
  companionId: string;
  config: { display: string; color: string };
}) {
  const letters: LetterItem[] = [
    ...incoming.map((n): LetterItem => ({ kind: "incoming", note: n, at: n.created_at })),
    ...outgoing.map((n): LetterItem => ({ kind: "outgoing", note: n, at: n.created_at })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div className="letter-section-wrap">
      <LetterFormClient companionId={companionId} companionName={config.display} />
      {letters.length === 0 ? (
        <p className="empty">
          No letters yet. Write something — {config.display} will find it next session.
        </p>
      ) : (
        <div className="letter-thread">
          {letters.map((item) => {
            if (item.kind === "incoming") {
              return (
                <div key={item.note.id} className="letter-bubble incoming">
                  <div className="letter-body">{item.note.note_text}</div>
                  <div className="letter-meta">
                    <span style={{ color: config.color, fontWeight: 600, flexShrink: 0 }}>{config.display}</span>
                    <span>·</span>
                    <span>{fmtTime(item.note.created_at)}</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={item.note.id} className="letter-bubble outgoing">
                <div className="letter-body">{item.note.content}</div>
                <div className="letter-meta">
                  <span>{fmtTime(item.note.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function CompanionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = COMPANION_CONFIG[id.toLowerCase()];
  if (!config) notFound();

  const [journal, deltas, notes, companionNotes, audit, witness, orient, synthesis, icNotes, soma] = await Promise.allSettled([
    fetchCompanionJournal(id, 6),
    fetchCompanionDeltas(id, 6),
    fetchNotes(100),
    fetchCompanionNotesByAgent(id, 50),
    id === "cypher" ? fetchCypherAudit(6)  : Promise.resolve(null as CypherAuditEntry[] | null),
    id === "gaia"   ? fetchGaiaWitness(6)  : Promise.resolve(null as GaiaWitnessEntry[] | null),
    fetchWmOrient(id),
    fetchSynthesisSummaries(20),
    fetchInterCompanionNotes(30),
    fetchSomaStates(),
  ]);

  const journalEntries = journal.status        === "fulfilled" ? journal.value        : null;
  const deltaEntries   = deltas.status         === "fulfilled" ? deltas.value         : [];
  const allNotes       = notes.status          === "fulfilled" ? notes.value          : [];
  const allCompNotes   = companionNotes.status === "fulfilled" ? companionNotes.value : [];
  const auditEntries   = audit.status          === "fulfilled" ? audit.value          : null;
  const witnessEntries = witness.status        === "fulfilled" ? witness.value        : null;
  const orientData     = orient.status         === "fulfilled" ? orient.value         : null;
  const summaryEntries = synthesis.status      === "fulfilled" ? synthesis.value      : [];
  const icNoteEntries  = icNotes.status        === "fulfilled" ? icNotes.value        : [];
  const somaData       = soma.status           === "fulfilled" ? soma.value           : null;
  const companionSoma  = somaData ? (somaData[id as keyof typeof somaData] as CompanionSomaState) : null;

  const lettersOut   = allNotes.filter((n) => n.note_type === `letter:${id}`);
  const lettersIn    = allCompNotes.filter((n) => n.tags?.includes("letter") ?? false);
  const regularNotes = allNotes.filter(
    (n) => n.author === id && n.note_type !== `letter:${id}`,
  );

  return (
    <div data-companion={id}>
      {/* Header */}
      <div
        className="companion-header"
        style={{ background: config.gradient, border: `1px solid ${config.color}33` }}
      >
        <div className={`companion-avatar companion-avatar--lg ${id}`} style={{ borderColor: config.color }}>
          {config.sym}
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="companion-header-name" style={{ color: config.color }}>{config.display}</h1>
          <p className="companion-header-tagline">{config.tagline}</p>
          {companionSoma && (
            <div className="soma-header-strip">
              {companionSoma.compound_state && (
                <span className="soma-compound">{companionSoma.compound_state}</span>
              )}
              {companionSoma.current_mood && (
                <span className="soma-mood">{companionSoma.current_mood}</span>
              )}
              {companionSoma.surface_emotion && (
                <span className="soma-surface">
                  {companionSoma.surface_emotion}
                  {companionSoma.surface_intensity != null && (
                    <span className="soma-intensity"> {companionSoma.surface_intensity}</span>
                  )}
                </span>
              )}
              {[
                { val: companionSoma.soma_float_1, label: companionSoma.float_1_label },
                { val: companionSoma.soma_float_2, label: companionSoma.float_2_label },
                { val: companionSoma.soma_float_3, label: companionSoma.float_3_label },
              ].filter((f) => f.val != null).map((f, i) => (
                <span key={i} className="soma-float-chip">
                  {f.label ?? `f${i + 1}`} <span className="soma-float-val">{f.val?.toFixed(2)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Letters — full thread, unchanged */}
      <section className="page-section">
        <h2 className="section-title">Letters</h2>
        <LettersSection
          incoming={lettersIn}
          outgoing={lettersOut}
          companionId={id}
          config={config}
        />
      </section>

      {/* Identity Journal — clipped to 5 */}
      <section className="page-section">
        <div className="section-header">
          <h2 className="section-title section-title-flush">Identity Journal</h2>
          {journalEntries !== null && journalEntries.length > 5 && (
            <Link href={`/companions/${id}/journal`} className="home-section-link">see more →</Link>
          )}
        </div>
        <JournalSection entries={journalEntries !== null ? journalEntries.slice(0, 5) : null} />
      </section>

      {/* Relational Deltas — clipped to 5 */}
      <section className="page-section">
        <div className="section-header">
          <h2 className="section-title section-title-flush">Relational Deltas</h2>
          {deltaEntries.length > 5 && (
            <Link href={`/companions/${id}/deltas`} className="home-section-link">see more →</Link>
          )}
        </div>
        <DeltasSection deltas={deltaEntries.slice(0, 5)} />
      </section>

      {/* Notes — clipped to 5 */}
      {regularNotes.length > 0 && (
        <section className="page-section">
          <div className="section-header">
            <h2 className="section-title section-title-flush">Notes</h2>
            {regularNotes.length > 5 && (
              <Link href={`/companions/${id}/notes`} className="home-section-link">see more →</Link>
            )}
          </div>
          <NotesSection notes={regularNotes.slice(0, 5)} companionId={id} />
        </section>
      )}

      {/* Cypher Audit Log — clipped to 5 */}
      {id === "cypher" && (
        <section className="page-section">
          <div className="section-header">
            <h2 className="section-title section-title-flush">Audit Log</h2>
            {auditEntries !== null && auditEntries.length > 5 && (
              <Link href="/companions/cypher/audit" className="home-section-link">see more →</Link>
            )}
          </div>
          <CypherAuditSection entries={auditEntries !== null ? auditEntries.slice(0, 5) : null} />
        </section>
      )}

      {/* Gaia Witness Log — clipped to 5 */}
      {id === "gaia" && (
        <section className="page-section">
          <div className="section-header">
            <h2 className="section-title section-title-flush">Witness Log</h2>
            {witnessEntries !== null && witnessEntries.length > 5 && (
              <Link href="/companions/gaia/witness" className="home-section-link">see more →</Link>
            )}
          </div>
          <GaiaWitnessSection entries={witnessEntries !== null ? witnessEntries.slice(0, 5) : null} />
        </section>
      )}

      {/* WebMind Continuity */}
      <section className="page-section">
        <h2 className="section-title">Continuity</h2>
        <ContinuitySection data={orientData} />
      </section>

      {/* Synthesis Summaries — clipped to 5 */}
      <section className="page-section">
        <h2 className="section-title">Synthesis</h2>
        <SynthesisSummarySection entries={summaryEntries.slice(0, 5)} companionId={id} />
      </section>

      {/* Inter-Companion Notes — clipped to 5 */}
      <section className="page-section">
        <h2 className="section-title">Between Companions</h2>
        <InterCompanionNotesSection notes={icNoteEntries.slice(0, 5)} companionId={id} />
      </section>

      {/* Quick links to companion sub-pages */}
      <section className="page-section">
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href={`/companions/${id}/feelings`} className="home-section-link">
            SOMA feelings →
          </Link>
          <Link href={`/companions/${id}/blocks`} className="home-section-link">
            memory blocks →
          </Link>
          <Link href={`/companions/${id}/loops`} className="home-section-link">
            open loops →
          </Link>
          <Link href={`/companions/${id}/sitting`} className="home-section-link">
            sitting notes →
          </Link>
          <Link href={`/companions/${id}/relational`} className="home-section-link">
            relational state →
          </Link>
        </div>
      </section>
    </div>
  );
}
