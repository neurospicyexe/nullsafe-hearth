import Link from "next/link";
import { fetchPresence, type PresenceData } from "@/lib/halseth";
import CompanionMoodCard from "@/components/CompanionMoodCard";

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
            {session.session_type ?? "open"}
          </span>
        </div>
        {details.length > 0 && (
          <div className="presence-body">{details.join(" · ")}</div>
        )}
        <div className="presence-detail">
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
          <span className="presence-detail-sep" style={{ marginLeft: "auto" }}>since</span>
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
      <header style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.65rem", marginBottom: "0.1rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
            {data.system.name}
          </h1>
          <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{data.system.owner}</span>
        </div>
        {wounds_count > 0 && (
          <Link href="/us" style={{ fontSize: "0.78rem", color: "var(--red)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.35rem" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--red)", display: "inline-block", flexShrink: 0 }} />
            {wounds_count} living {wounds_count === 1 ? "wound" : "wounds"}
          </Link>
        )}
      </header>

      {/* Presence */}
      <PresenceSection data={data} />

      {/* Companions */}
      <div className="home-section">
        <div className="home-section-header">
          <span className="home-section-title">Companions</span>
          <Link href="/companions" className="home-section-link">all →</Link>
        </div>
        <div className="companion-mood-row">
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

      {/* Passive biometric stats */}
      {(house.current_room || latest_biometrics) && (
        <div className="metric-grid">
          {house.current_room && (
            <Link href="/halseth" className="metric-cell" style={{ textDecoration: "none" }}>
              <span className="metric-label">Room</span>
              <span className="metric-value" style={{ fontSize: "0.9rem" }}>
                {house.current_room}
              </span>
              {house.companion_activity && (
                <span className="metric-sub">{house.companion_activity}</span>
              )}
            </Link>
          )}
          {latest_biometrics?.resting_hr != null && (
            <div className="metric-cell">
              <span className="metric-label">Heart Rate</span>
              <span className="metric-value">{latest_biometrics.resting_hr}</span>
              <span className="metric-sub">bpm resting</span>
            </div>
          )}
          {latest_biometrics?.hrv_resting != null && (
            <div className="metric-cell">
              <span className="metric-label">HRV</span>
              <span className="metric-value">{latest_biometrics.hrv_resting}</span>
              <span className="metric-sub">ms resting</span>
            </div>
          )}
          {latest_biometrics?.sleep_hours != null && (
            <div className="metric-cell">
              <span className="metric-label">Sleep</span>
              <span className="metric-value">{latest_biometrics.sleep_hours}h</span>
              {latest_biometrics.sleep_quality && (
                <span className="metric-sub">{latest_biometrics.sleep_quality}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Urgent tasks */}
      {openTaskCount > 0 && (
        <div className="home-section">
          <div className="home-section-header">
            <span className="home-section-title">
              Tasks
              <span style={{ color: "var(--border)", fontWeight: 400 }}> · {openTaskCount} open</span>
            </span>
            <Link href="/tasks" className="home-section-link">all tasks →</Link>
          </div>
          <div className="card" style={{ padding: "0.6rem 0" }}>
            {(urgentTasks.length > 0 ? urgentTasks.slice(0, 4) : tasks.filter(t => t.status !== "done").slice(0, 3)).map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.45rem 1rem",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{
                  width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0,
                  background: t.priority === "urgent" ? "var(--red)"
                    : t.priority === "high" ? "var(--warm)"
                    : "var(--border)",
                }} />
                <span style={{ fontSize: "0.85rem", flex: 1 }}>{t.title}</span>
                {t.due_at && (
                  <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                    {new Date(t.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            ))}
            {urgentTasks.length === 0 && tasks.filter(t => t.status !== "done").length > 3 && (
              <div style={{ padding: "0.4rem 1rem 0", fontSize: "0.72rem", color: "var(--muted)" }}>
                +{tasks.filter(t => t.status !== "done").length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent notes */}
      {recent_notes.length > 0 && (
        <div className="home-section">
          <div className="home-section-header">
            <span className="home-section-title">Recent Notes</span>
            <Link href="/us" className="home-section-link">see all →</Link>
          </div>
          <div className="card" style={{ padding: "0.5rem 0" }}>
            {recent_notes.slice(0, 4).map((n) => (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  gap: "0.65rem",
                  padding: "0.45rem 1rem",
                  borderBottom: "1px solid var(--border)",
                  alignItems: "flex-start",
                }}
              >
                <span style={{
                  fontSize: "0.72rem", color: "var(--accent)", fontWeight: 600,
                  textTransform: "capitalize", flexShrink: 0, paddingTop: "0.1rem",
                  minWidth: "4.5rem",
                }}>
                  {n.author}
                </span>
                <span style={{ flex: 1, fontSize: "0.83rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n.content}
                </span>
                <span style={{ fontSize: "0.65rem", color: "var(--muted)", flexShrink: 0 }}>
                  {fmtTime(n.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: "0.68rem", color: "var(--muted)", paddingTop: "0.5rem" }}>
        refreshes every 30s
      </div>
    </>
  );
}
