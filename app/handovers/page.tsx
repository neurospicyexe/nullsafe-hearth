import { fetchHandovers } from "@/lib/halseth";

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
  const handovers = await fetchHandovers(30);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Handovers</h1>
        <p className="page-subtitle">session close packets — what carried between sessions</p>
      </div>

      {!handovers ? (
        <div className="pending-notice">
          <div className="pending-dot" />
          Awaiting Halseth /handovers endpoint — will populate once deployed.
        </div>
      ) : handovers.length === 0 ? (
        <p className="empty">No handover packets yet.</p>
      ) : (
        <div className="handover-feed">
          {handovers.map((h) => {
            const threads = (() => {
              try { return h.open_threads ? JSON.parse(h.open_threads) as string[] : []; }
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
                    {h.motion_state.replace("_", " ")}
                  </span>
                  {h.session_type === "hangout" && (
                    <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontStyle: "italic" }}>autonomous</span>
                  )}
                  {h.session_front_state && (
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{h.session_front_state}</span>
                  )}
                  {h.active_anchor && <span>anchor: {h.active_anchor}</span>}
                  {h.returned ? <span className="returned-badge">returned</span> : null}
                  <span style={{ marginLeft: "auto" }}>{formatTime(h.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
