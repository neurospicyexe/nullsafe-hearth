export const dynamic = 'force-dynamic';

import { fetchSessions } from "@/lib/halseth";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function SessionsPage() {
  const sessions = await fetchSessions(60, 100);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Sessions</h1>
        <p className="page-subtitle">past and present presence records</p>
      </div>

      {sessions.length === 0 && (
        <div className="pending-notice">
          <div className="pending-dot" />
          No sessions found.
        </div>
      )}

      <div className="card" style={{ padding: "0.5rem 0" }}>
        {sessions.map((s) => {
          const details = [s.front_state, s.facet, s.active_anchor].filter(Boolean);
          return (
            <div key={s.id} className="journal-row" style={{ alignItems: "flex-start", gap: "0.75rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {details.length > 0 && (
                  <div className="journal-text" style={{ marginBottom: "0.2rem" }}>
                    {details.join(" · ")}
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  {s.emotional_frequency && (
                    <span className="page-subtitle" style={{ fontSize: "0.78rem" }}>
                      {s.emotional_frequency}
                    </span>
                  )}
                  {s.co_con && (
                    <span className="page-subtitle" style={{ fontSize: "0.78rem" }}>
                      co-con: {s.co_con}
                    </span>
                  )}
                  {s.notes && (
                    <span className="page-subtitle" style={{ fontSize: "0.78rem", fontStyle: "italic" }}>
                      {s.notes.length > 80 ? s.notes.slice(0, 80) + "…" : s.notes}
                    </span>
                  )}
                </div>
              </div>
              <span className="journal-time" style={{ flexShrink: 0 }}>{fmtTime(s.created_at)}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
