export const dynamic = 'force-dynamic';

import { fetchCompanionJournal } from "@/lib/halseth";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function agentColor(agent: string): string {
  switch (agent) {
    case "drevan": return "var(--accent)";
    case "cypher": return "#e2e8f0";
    case "gaia":   return "#4ade80";
    default:       return "var(--muted)";
  }
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
      <h1>Journal</h1>
      <div className="card" style={{ padding: "0.5rem 0" }}>
        {entries.map(entry => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              gap: "0.65rem",
              padding: "0.45rem 1rem",
              borderBottom: "1px solid var(--border)",
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                color: agentColor(entry.agent),
                fontWeight: 600,
                textTransform: "capitalize",
                flexShrink: 0,
                paddingTop: "0.1rem",
                minWidth: "4.5rem",
              }}
            >
              {agentDisplayName(entry.agent)}
            </span>
            <span style={{ flex: 1, fontSize: "0.83rem" }}>
              {entry.note_text}
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--muted)", flexShrink: 0 }}>
              {fmtTime(entry.created_at)}
            </span>
          </div>
        ))}
        {entries.length === 0 && (
          <div style={{ padding: "1rem", color: "var(--muted)", fontSize: "0.85rem" }}>
            No journal entries yet.
          </div>
        )}
      </div>
    </div>
  );
}
