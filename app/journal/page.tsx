export const dynamic = 'force-dynamic';

import { fetchCompanionJournal, fetchHumanJournal } from "@/lib/halseth";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function agentDisplayName(agent: string): string {
  switch (agent) {
    case "drevan": return "Drevan";
    case "cypher": return "Cypher";
    case "gaia":   return "Gaia";
    default:       return agent.charAt(0).toUpperCase() + agent.slice(1);
  }
}

export default async function JournalPage() {
  const [companionEntries, humanEntries] = await Promise.all([
    fetchCompanionJournal(undefined, 200).then((e) => e ?? []),
    fetchHumanJournal(100),
  ]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Journal</h1>
        <p className="page-subtitle">companion reflections and personal record</p>
      </div>

      {/* ── Companion Journal ──────────────────────────────────────────── */}
      <div className="home-section-header" style={{ marginBottom: "0.75rem" }}>
        <span className="home-section-title">Companion Reflections</span>
      </div>
      <div className="card" style={{ padding: "0.5rem 0", marginBottom: "2rem" }}>
        {companionEntries.map((entry) => (
          <div key={entry.id} className="journal-row">
            <span className={`journal-agent cc-${entry.agent}`}>
              {agentDisplayName(entry.agent)}
            </span>
            <span className="journal-text">{entry.note_text}</span>
            <span className="journal-time">{fmtTime(entry.created_at)}</span>
          </div>
        ))}
        {companionEntries.length === 0 && (
          <p className="empty" style={{ padding: "1rem" }}>No companion entries yet.</p>
        )}
      </div>

      {/* ── Human Journal ─────────────────────────────────────────────── */}
      <div className="home-section-header" style={{ marginBottom: "0.75rem" }}>
        <span className="home-section-title">My Record</span>
      </div>
      <div className="card" style={{ padding: "0.5rem 0" }}>
        {humanEntries.map((entry) => (
          <div key={entry.id} className="journal-row">
            <span className="journal-agent cc-raziel">Raziel</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="journal-text">{entry.entry_text}</span>
              {(entry.emotion_tag || entry.mood_score != null) && (
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                  {entry.emotion_tag && (
                    <span className="page-subtitle" style={{ fontSize: "0.78rem" }}>
                      {entry.emotion_tag}{entry.sub_emotion ? ` · ${entry.sub_emotion}` : ""}
                    </span>
                  )}
                  {entry.mood_score != null && (
                    <span className="page-subtitle" style={{ fontSize: "0.78rem" }}>
                      mood {entry.mood_score}/100
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="journal-time">{fmtTime(entry.created_at)}</span>
          </div>
        ))}
        {humanEntries.length === 0 && (
          <p className="empty" style={{ padding: "1rem" }}>No personal entries yet.</p>
        )}
      </div>
    </div>
  );
}
