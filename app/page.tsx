import Link from "next/link";
import { fetchPresence, type PresenceData } from "@/lib/halseth";
import CompanionMoodCard from "@/components/CompanionMoodCard";
import LiveFeedImage from "@/components/LiveFeedImage";

export const dynamic = 'force-dynamic';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function PresenceSection({ data }: { data: PresenceData }) {
  const { session, last_handover, house } = data;

  if (session) {
    const details = [
      session.front_state,
      session.facet,
      session.active_anchor,
    ].filter(Boolean);

    return (
      <div className="presence-card">
        <div className="presence-top">
          <span className="presence-label">
            <span className="status-dot live" />
            Session
          </span>
          <span className="presence-badge open">
            {(session.session_type ?? "open").replace(/([a-z])([A-Z])/g, "$1 $2").replace("sessionwork", "session work")}
          </span>
        </div>
        {details.length > 0 && (
          <div className="presence-body">{details.join(" · ")}</div>
        )}
        <div className="presence-detail" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.25rem" }}>
          {session.emotional_frequency && (
            <span>{session.emotional_frequency}</span>
          )}
          {session.hrv_range && (
            <>
              <span className="presence-detail-sep">·</span>
              <span>HRV {session.hrv_range}</span>
            </>
          )}
          {session.depth !== null && session.depth !== undefined && (
            <>
              <span className="presence-detail-sep">·</span>
              <span>depth {session.depth}/3</span>
            </>
          )}
          <span className="presence-detail-sep" style={{ marginLeft: "0.5rem" }}>since</span>
          <span>{fmtTime(session.created_at)}</span>
        </div>
      </div>
    );
  }

  if (last_handover) {
    return (
      <div className="presence-card handover">
        <div className="presence-top">
          <span className="presence-label">
            <span className="status-dot away" />
            Last Handover
          </span>
          <span className="presence-badge handover">
            {last_handover.motion_state.replace("_", " ")}
          </span>
        </div>
        <div className="presence-body" style={{ fontSize: "0.88rem", lineHeight: 1.55, color: "var(--muted)" }}>
          {last_handover.spine.length > 200
            ? last_handover.spine.slice(0, 200) + "…"
            : last_handover.spine}
        </div>
        <div className="presence-detail">
          {last_handover.active_anchor && <span>{last_handover.active_anchor}</span>}
          {last_handover.open_threads.length > 0 && (
            <>
              {last_handover.active_anchor && <span className="presence-detail-sep">·</span>}
              <span>{last_handover.open_threads.length} open thread{last_handover.open_threads.length !== 1 ? "s" : ""}</span>
            </>
          )}
          <Link href="/handovers" className="home-section-link" style={{ marginLeft: "auto" }}>
            all handovers →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="presence-card no-session">
      <div className="presence-top">
        <span className="presence-label">
          <span className="status-dot offline" />
          No open session
        </span>
      </div>
    </div>
  );
}

const DEFAULT_COMPANIONS = [
  { id: "drevan", display_name: "Drevan", role: "companion", avatar_url: null },
  { id: "cypher", display_name: "Cypher", role: "auditor", avatar_url: null },
  { id: "gaia",   display_name: "Gaia",   role: "witness",  avatar_url: null },
];

export default async function Page() {
  let data: PresenceData | null = null;
  let error: string | null = null;

  try {
    data = await fetchPresence();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load";
  }

  if (error || !data) {
    return (
      <div className="error-card">
        <strong>Could not connect to Halseth</strong>
        <p style={{ marginTop: "0.4rem", fontSize: "0.88rem" }}>{error}</p>
      </div>
    );
  }

  const { house, wounds_count, tasks, recent_notes, latest_biometrics, companion_moods } = data;

  const companions = data.companions.length > 0 ? data.companions : DEFAULT_COMPANIONS;

  const urgentTasks = tasks.filter(
    (t) => t.status !== "done" && (t.priority === "urgent" || t.priority === "high"),
  );
  const openTaskCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <>
      {/* Page header */}
      <header className="page-header" style={{ marginBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.25rem" }}>
          <h1 className="page-title">
            {data.system.name}
          </h1>
          <span className="page-subtitle">{data.system.owner}</span>
        </div>
        {wounds_count > 0 && (
          <Link href="/us" style={{ fontSize: "0.85rem", color: "var(--red)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem", marginTop: "0.5rem" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--red)", display: "inline-block", flexShrink: 0 }} />
            {wounds_count} living {wounds_count === 1 ? "wound" : "wounds"}
          </Link>
        )}
      </header>

      <div className="home-presence-grid" style={{ gap: "2.5rem" }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          <PresenceSection data={data} />
          
          {/* Dynamic Environment Viewer */}
          {house.current_room && (
             <div className="card" style={{ padding: 0, overflow: "hidden", flex: 1, minHeight: "300px", position: "relative" }}>
                 <div style={{ position: "absolute", top: "1rem", left: "1.25rem", zIndex: 10, display: "flex", gap: "0.5rem", alignItems: "center" }}>
                   <span className="status-dot live" style={{ width: "8px", height: "8px", background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" }} />
                   <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "#fff", textTransform: "uppercase", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>Live Feed</span>
                 </div>
                 <LiveFeedImage currentRoom={house.current_room} />
             </div>
          )}
          
          {openTaskCount > 0 && (
            <div className="home-section" style={{ marginBottom: 0 }}>
              <div className="home-section-header" style={{ marginBottom: "1.25rem" }}>
                <span className="home-section-title">
                  Tasks
                  <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.95rem", marginLeft: "0.5rem" }}>· {openTaskCount} open</span>
                </span>
                <Link href="/tasks" className="home-section-link">all tasks →</Link>
              </div>
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
                {(urgentTasks.length > 0 ? urgentTasks.slice(0, 4) : tasks.filter(t => t.status !== "done").slice(0, 3)).map((t) => (
                  <div key={t.id} style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
                    <span style={{
                      width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, marginTop: "0.4rem",
                      background: t.priority === "urgent" ? "var(--red)"
                        : t.priority === "high" ? "var(--orange)"
                        : "var(--border-strong)",
                    }} />
                    <span style={{ fontSize: "1rem", flex: 1, color: "var(--text-main)", lineHeight: 1.4 }}>{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {/* Passive biometric stats */}
          {(house.current_room || latest_biometrics) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {house.current_room && (
                <Link href="/halseth" className="card card-accent" style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: "0.4rem", padding: "1.5rem" }}>
                  <span className="state-cell-label">Room</span>
                  <span className="state-cell-value" style={{ fontSize: "1.35rem" }}>
                    {house.current_room}
                  </span>
                  {house.companion_activity && (
                    <span className="state-cell-label" style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>{house.companion_activity}</span>
                  )}
                </Link>
              )}
              {latest_biometrics && (
                <div className="card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", padding: "1.5rem" }}>
                  {latest_biometrics?.resting_hr != null && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <span className="state-cell-label">Heart Rate</span>
                      <span className="state-cell-value">{latest_biometrics.resting_hr}</span>
                    </div>
                  )}
                  {latest_biometrics?.hrv_resting != null && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <span className="state-cell-label">HRV</span>
                      <span className="state-cell-value">{latest_biometrics.hrv_resting}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Companions */}
          <div className="home-section" style={{ marginBottom: 0 }}>
            <div className="home-section-header" style={{ marginBottom: "1.25rem" }}>
              <span className="home-section-title">Companions</span>
              <Link href="/us" className="home-section-link">all →</Link>
            </div>
            <div className="companion-mood-row" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {companions.map((c) => (
                <CompanionMoodCard
                  key={c.id}
                  companionId={c.id}
                  displayName={c.display_name}
                  mood={companion_moods?.[c.id]}
                  avatarUrl={c.avatar_url}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FULL WIDTH BOTTOM: Recent notes */}
      {recent_notes.length > 0 && (
        <div className="home-section" style={{ marginTop: "1rem" }}>
          <div className="home-section-header" style={{ marginBottom: "1.5rem" }}>
            <span className="home-section-title">Recent Notes</span>
            <Link href="/us" className="home-section-link">see letters →</Link>
          </div>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "1.75rem", borderLeft: "3px solid var(--accent)" }}>
            {recent_notes.slice(0, 4).map((n) => (
              <div key={n.id} style={{ display: "flex", flexDirection: "column", gap: "0.6rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "1rem", color: "var(--accent)", fontWeight: 600, textTransform: "capitalize" }}>
                    {n.author}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    {fmtTime(n.created_at)}
                  </span>
                </div>
                <span style={{ fontSize: "1.05rem", color: "var(--text-main)", lineHeight: 1.6 }}>
                  {n.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
