import { fetchHandovers, fetchMindHandoffs } from "@/lib/halseth";

export const dynamic = 'force-dynamic';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function motionClass(state: string) {
  return state === "in_motion" ? "in_motion" : state === "at_rest" ? "at_rest" : "floating";
}

export default async function HandoversPage() {
  const [handovers, mindHandoffs] = await Promise.all([
    fetchHandovers(30),
    fetchMindHandoffs(30),
  ]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Handovers</h1>
        <p className="page-subtitle">session close packets — what carried between sessions</p>
      </div>

      {!handovers?.length ? (
        <p className="empty">No handover packets yet.</p>
      ) : (
        <div className="handover-feed">
          {handovers.map((h) => {
            const threads = (() => {
              try { const p = h.open_threads ? JSON.parse(h.open_threads) : []; return Array.isArray(p) ? p as string[] : []; }
              catch { return []; }
            })();

            return (
              <div key={h.id} className="handover-entry">
                {/* Spine */}
                <p className="handover-spine">{h.spine}</p>

                {/* Last real thing */}
                {h.last_real_thing && (
                  <p className="handover-last-real">{h.last_real_thing}</p>
                )}

                {/* Open threads */}
                {threads.length > 0 && (
                  <div className="handover-threads">
                    {threads.map((t, i) => (
                      <span key={i} className="thread-tag">{t}</span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="handover-footer">
                  <span className={`motion-badge ${motionClass(h.motion_state)}`}>
                    {(h.motion_state ?? "unknown").replace("_", " ")}
                  </span>
                  {h.session_type === "hangout" && (
                    <span className="badge-autonomous">autonomous</span>
                  )}
                  {h.session_front_state && (
                    <span className="handover-front-state">{h.session_front_state}</span>
                  )}
                  {h.active_anchor && <span>anchor: {h.active_anchor}</span>}
                  {h.returned ? <span className="returned-badge">returned</span> : null}
                  <span className="ml-auto">{formatTime(h.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="page-header" style={{ marginTop: "2.5rem" }}>
        <h2 className="page-title" style={{ fontSize: "1.4rem" }}>WebMind Handoffs</h2>
        <p className="page-subtitle">companion continuity — what they carried forward</p>
      </div>

      {!mindHandoffs.length ? (
        <p className="empty">No WebMind handoffs yet.</p>
      ) : (
        <div className="handover-feed">
          {mindHandoffs.map((h) => (
            <div key={h.id} className="handover-entry">
              <div className="handover-footer" style={{ marginBottom: "0.5rem" }}>
                <span className="note-item-author">{h.agent_id}</span>
                <span className="ml-auto">{formatTime(h.created_at)}</span>
              </div>
              {h.title && <p className="handover-spine">{h.title}</p>}
              {h.summary && <p className="handover-last-real">{h.summary}</p>}
              {h.next_steps && (
                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                  next: {h.next_steps}
                </p>
              )}
              {h.state_hint && (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  {h.state_hint}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
