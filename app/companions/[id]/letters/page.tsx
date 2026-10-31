export const dynamic = 'force-dynamic';

import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchNotes, fetchInbox } from "@/lib/halseth";
import type { Note, InboxItem } from "@/lib/halseth";
import { COMPANION_CONFIG, fmtTime } from "../sections";
import { LetterFormClient } from "../client";
import { parseCompanionId } from "@/lib/companion-page";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

const RAZIEL_COLOR = "#f59e0b";

type LetterItem =
  | { kind: "incoming"; note: InboxItem;     at: string }
  | { kind: "outgoing"; note: Note;          at: string };

export default async function CompanionLettersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  // Lowercase + validate once, before any Halseth call; every fetch below gets the parsed id.
  const id = parseCompanionId(rawId);
  if (!id) notFound();
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  // Incoming letters are the inbox's own set (tags exactly `letter` or `letter_to_raziel`, dropped
  // excluded), scoped to this companion in Halseth, so Discord speech in the journal can never push
  // them out of a window. Each links to /letters/[id], which marks it read (the door's unread count).
  const [notes, inboxRes] = await Promise.allSettled([
    fetchNotes(200),
    fetchInbox(100, id),
  ]);

  const allNotes = notes.status === "fulfilled" ? notes.value : [];
  const inbox    = inboxRes.status === "fulfilled" ? inboxRes.value : null;

  const lettersOut = allNotes.filter((n) => n.note_type === `letter:${id}`);
  const lettersIn  = inbox?.items ?? [];

  const letters: LetterItem[] = [
    ...lettersIn.map((n): LetterItem  => ({ kind: "incoming", note: n, at: n.created_at })),
    ...lettersOut.map((n): LetterItem => ({ kind: "outgoing", note: n, at: n.created_at })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <>
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <h1 className="page-title" style={{ marginTop: "0.4rem" }}>Letters</h1>
        <p className="page-subtitle">
          full thread · {letters.length} {letters.length === 1 ? "letter" : "letters"}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <LetterFormClient companionId={id} companionName={config.display} />

        {inbox === null && (
          <p className="empty">Can&apos;t reach Halseth right now.</p>
        )}

        {letters.length === 0 ? (
          inbox === null ? null : (
            <p className="empty">
              No letters yet. Write something. {config.display} will find it next session.
            </p>
          )
        ) : (
          <div className="letter-thread">
            {letters.map((item) => {
              if (item.kind === "incoming") {
                return (
                  <Link
                    key={item.note.id}
                    href={`/letters/${item.note.id}`}
                    className={`letter-bubble incoming${item.note.read ? "" : " is-unread"}`}
                    style={{ borderLeftColor: config.color }}
                  >
                    <div className="letter-body">{item.note.preview}</div>
                    <div className="letter-meta">
                      <span style={{ color: config.color, fontWeight: 600 }}>{config.display}</span>
                      <span>·</span>
                      <span>{fmtTime(item.note.created_at)}</span>
                      <span>·</span>
                      {item.note.read ? (
                        <span>read</span>
                      ) : (
                        <span className="letter-new" style={{ color: config.color }}>new</span>
                      )}
                    </div>
                  </Link>
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
