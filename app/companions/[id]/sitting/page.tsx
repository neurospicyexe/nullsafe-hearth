export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchSittingNotes } from "@/lib/halseth";
import { COMPANION_CONFIG } from "../sections";
import { MetabolizeButton } from "./MetabolizeButton";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const NOTE_TYPE_LABEL: Record<string, string> = {
  message: "message",
  "letter:drevan": "letter",
  "letter:cypher": "letter",
  "letter:gaia": "letter",
};

export default async function CompanionSittingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.toLowerCase();
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  const notes = await fetchSittingNotes(id).catch(() => []);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/companions/${id}`} className="home-section-link">
          ← {config.display}
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">{config.display} · Sitting Notes</h1>
        <p className="page-subtitle">
          notes in active processing · oldest first · metabolize when integrated
        </p>
      </div>

      {notes.length === 0 && (
        <div className="pending-notice">
          <div className="pending-dot" />
          Nothing currently sitting.
        </div>
      )}

      {notes.length > 0 && (
        <div className="card" style={{ padding: "0.5rem 0" }}>
          {notes.map((note) => (
            <div
              key={note.note_id}
              className="journal-row"
              style={{ alignItems: "flex-start", gap: "0.75rem", flexDirection: "column" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    className="note-type-badge"
                    style={{ borderColor: config.color, color: config.color }}
                  >
                    {NOTE_TYPE_LABEL[note.note_type] ?? note.note_type}
                  </span>
                  <span className="journal-time">sitting since {fmtTime(note.sat_at)}</span>
                </div>
                <MetabolizeButton noteId={note.note_id} companionId={id} />
              </div>
              <div className="journal-text">{note.content}</div>
              {note.sit_text && (
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                    paddingLeft: "0.75rem",
                    borderLeft: `2px solid ${config.color}`,
                  }}
                >
                  {note.sit_text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
