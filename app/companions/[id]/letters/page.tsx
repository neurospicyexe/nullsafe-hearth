export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchNotes, fetchCompanionNotesByAgent } from "@/lib/halseth";
import type { Note, CompanionNote } from "@/lib/halseth";
import { COMPANION_CONFIG, fmtTime } from "../sections";
import { LetterFormClient } from "../client";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

const RAZIEL_COLOR = "#f59e0b";

type LetterItem =
  | { kind: "incoming"; note: CompanionNote; at: string }
  | { kind: "outgoing"; note: Note;          at: string };

export default async function CompanionLettersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = COMPANION_CONFIG[id.toLowerCase()];
  if (!config) notFound();

  const [notes, companionNotes] = await Promise.allSettled([
    fetchNotes(200),
    fetchCompanionNotesByAgent(id, 200),
  ]);

  const allNotes       = notes.status         === "fulfilled" ? notes.value         : [];
  const allCompNotes   = companionNotes.status === "fulfilled" ? companionNotes.value : [];

  const lettersOut = allNotes.filter((n) => n.note_type === `letter:${id}`);
  const lettersIn  = allCompNotes.filter((n) => n.tags?.includes("letter") ?? false);

  const letters: LetterItem[] = [
    ...lettersIn.map((n): LetterItem  => ({ kind: "incoming", note: n, at: n.created_at })),
    ...lettersOut.map((n): LetterItem => ({ kind: "outgoing", note: n, at: n.created_at })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <>
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <Link
          href={`/companions/${id}`}
          style={{ fontSize: "0.82rem", color: "var(--text-muted)", textDecoration: "none" }}
        >
          ← {config.display}
        </Link>
        <h1 className="page-title" style={{ marginTop: "0.4rem" }}>Letters</h1>
        <p className="page-subtitle">
          full thread · {letters.length} {letters.length === 1 ? "letter" : "letters"}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <LetterFormClient companionId={id} companionName={config.display} />

        {letters.length === 0 ? (
          <p className="empty">
            No letters yet. Write something — {config.display} will find it next session.
          </p>
        ) : (
          <div className="letter-thread">
            {letters.map((item) => {
              if (item.kind === "incoming") {
                return (
                  <div
                    key={item.note.id}
                    className="letter-bubble incoming"
                    style={{ borderLeftColor: config.color }}
                  >
                    <div className="letter-body">{item.note.note_text}</div>
                    <div className="letter-meta">
                      <span style={{ color: config.color, fontWeight: 600 }}>{config.display}</span>
                      <span>·</span>
                      <span>{fmtTime(item.note.created_at)}</span>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={item.note.id}
                  className="letter-bubble outgoing"
                  style={{ borderLeftColor: RAZIEL_COLOR }}
                >
                  <div className="letter-body">{item.note.content}</div>
                  <div className="letter-meta">
                    <span style={{ color: RAZIEL_COLOR, fontWeight: 600 }}>Raziel</span>
                    <span>·</span>
                    <span>{fmtTime(item.note.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
