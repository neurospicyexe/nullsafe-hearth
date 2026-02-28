import { fetchPresence, type PresenceData } from "@/lib/halseth";

export const revalidate = 30;

function motionLabel(state: string) {
  return state === "in_motion" ? "in motion" : state === "at_rest" ? "at rest" : "floating";
}

function hrvLabel(hrv: string | null) {
  if (!hrv) return null;
  return { low: "low — recovery", mid: "mid — regulated", high: "high — activated" }[hrv] ?? hrv;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function SessionCard({ session }: { session: NonNullable<PresenceData["session"]> }) {
  return (
    <div className="card">
      <div className="card-title">Current Session <span className="pill open">open</span></div>
      <div className="kv-grid">
        {session.front_state && (
          <>
            <span className="kv-label">front</span>
            <span className="kv-value">{session.front_state}</span>
          </>
        )}
        {session.active_anchor && (
          <>
            <span className="kv-label">anchor</span>
            <span className="kv-value">{session.active_anchor}</span>
          </>
        )}
        {session.facet && (
          <>
            <span className="kv-label">facet</span>
            <span className="kv-value">{session.facet}</span>
          </>
        )}
        {session.depth !== null && (
          <>
            <span className="kv-label">depth</span>
            <span className="kv-value">{session.depth}</span>
          </>
        )}
        {session.hrv_range && (
          <>
            <span className="kv-label">hrv</span>
            <span className="kv-value">{hrvLabel(session.hrv_range)}</span>
          </>
        )}
        {session.emotional_frequency && (
          <>
            <span className="kv-label">frequency</span>
            <span className="kv-value">{session.emotional_frequency}</span>
          </>
        )}
        <span className="kv-label">opened</span>
        <span className="kv-value">{formatTime(session.created_at)}</span>
      </div>
    </div>
  );
}

function HandoverCard({ handover }: { handover: NonNullable<PresenceData["last_handover"]> }) {
  return (
    <div className="card">
      <div className="card-title">
        Last Handover{" "}
        <span className={`pill ${handover.motion_state === "floating" ? "float" : "closed"}`}>
          {motionLabel(handover.motion_state)}
        </span>
      </div>
      <div className="kv-grid">
        {handover.active_anchor && (
          <>
            <span className="kv-label">anchor</span>
            <span className="kv-value">{handover.active_anchor}</span>
          </>
        )}
        <span className="kv-label">closed</span>
        <span className="kv-value">{formatTime(handover.created_at)}</span>
      </div>
    </div>
  );
}

function NoSessionCard() {
  return (
    <div className="card">
      <div className="card-title">Session <span className="pill closed">none</span></div>
      <p className="empty">No open session. Halseth is at rest.</p>
    </div>
  );
}

export default async function Page() {
  let data: PresenceData | null = null;
  let error: string | null = null;

  try {
    data = await fetchPresence();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load presence data";
  }

  if (error || !data) {
    return (
      <main className="page">
        <div className="error-card">
          <strong>Could not connect to Halseth</strong>
          <p style={{ marginTop: "0.4rem", fontSize: "0.88rem" }}>{error}</p>
          <p style={{ marginTop: "0.4rem", fontSize: "0.82rem", opacity: 0.7 }}>
            Check that HALSETH_URL is set correctly in your Vercel environment variables.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="header">
        <h1>{data.system.name}</h1>
        <span className="system-owner">{data.system.owner}</span>
      </header>

      {data.session ? (
        <SessionCard session={data.session} />
      ) : (
        <>
          <NoSessionCard />
          {data.last_handover && <HandoverCard handover={data.last_handover} />}
        </>
      )}

      {data.companions.length > 0 && (
        <div className="card">
          <div className="card-title">Companions</div>
          <div className="companion-list">
            {data.companions.map((c) => (
              <div key={c.id} className="companion-row">
                <span className="companion-name">{c.display_name}</span>
                <span className="companion-role">{c.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="refresh-note">refreshes every 30 seconds</p>
    </main>
  );
}
