export const dynamic = 'force-dynamic';

import { fetchCompanionJournal } from "@/lib/halseth";

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
  const entries = (await fetchCompanionJournal(undefined, 200)) ?? [];

  return (
    <div>
      <h1 className="page-title">Journal</h1>
      <div className="card" style={{ padding: "0.5rem 0" }}>
        {entries.map(entry => (
          <div key={entry.id} className="journal-row">
            <span className={`journal-agent cc-${entry.agent}`}>
              {agentDisplayName(entry.agent)}
            </span>
            <span className="journal-text">{entry.note_text}</span>
            <span className="journal-time">{fmtTime(entry.created_at)}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="empty" style={{ padding: "1rem" }}>No journal entries yet.</p>
        )}
      </div>
    </div>
  );
}
