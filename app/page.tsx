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
  const { session, last_handover } = data;

  if (session) {
    const details = [
      session.front_state,
      session.facet,
      session.active_anchor,
    ].filter(Boolean);

    return (
      <div className="presence-card open">
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
        <div className="presence-detail">
          {session.emotional_frequency && <span>{session.emotional_frequency}</span>}
          {session.hrv_range && (
            <><span className="presence-detail-sep">·</span><span>HRV {session.hrv_range}</span></>
          )}
          {session.depth !== null && session.depth !== undefined && (
            <><span className="presence-detail-sep">·</span><span>depth {session.depth}/3</span></>
          )}
          <span className="presence-detail-sep ml-auto">since</span>
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
        <div className="presence-body presence-body-muted">
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
          <Link href="/handovers" className="home-section-link ml-auto">all handovers →</Link>
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
  { id: "cypher", display_name: "Cypher", role: "auditor",  avatar_url: null },
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
        <p className="error-detail">{error}</p>
      </div>
    );
  }

  const { house, wounds_count, tasks, recent_notes, latest_biometrics, companion_moods } = data;
  const companions = data.companions.length > 0 ? data.companions : DEFAULT_COMPANIONS;
  const urgentTasks = tasks.filter((t) => t.status !== "done" && (t.priority === "urgent" || t.priority === "high"));
  const openTaskCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <>
      <header className="page-header page-header--home">
        <div className="page-header-row">
          <h1 className="page-title">{data.system.name}</h1>
          <span className="page-subtitle">{data.system.owner}</span>
        </div>
        {wounds_count > 0 && (
          <Link href="/us" className="wounds-link">
            <span className="wounds-dot" />
            {wounds_count} living {wounds_count === 1 ? "wound" : "wounds"}
          </Link>
        )}
      </header>

      <div className="home-presence-grid">

        {/* LEFT COLUMN */}
        <div className="home-col">
          <PresenceSection data={data} />

          {house.current_room && (
            <div className="card live-feed-card">
              <div className="live-feed-badge">
                <span className="live-dot" />
                <span className="live-feed-label">Live Feed</span>
              </div>
              <LiveFeedImage
                src={`${process.env.HALSETH_URL}/assets/rooms/${house.current_room}.jpg`}
                currentRoom={house.current_room}
              />
            </div>
          )}

          {openTaskCount > 0 && (
            <div className="home-section">
              <div className="home-section-header">
                <span className="home-section-title">
                  Tasks
                  <span className="task-count-label">· {openTaskCount} open</span>
                </span>
                <Link href="/tasks" className="home-section-link">all tasks →</Link>
              </div>
              <div className="card task-preview-card">
                {(urgentTasks.length > 0 ? urgentTasks.slice(0, 4) : tasks.filter(t => t.status !== "done").slice(0, 3)).map((t) => (
                  <div key={t.id} className="task-row">
                    <span
                      className="task-dot"
                      style={{
                        background: t.priority === "urgent" ? "var(--red)"
                          : t.priority === "high" ? "var(--orange)"
                          : "var(--border-strong)",
                      }}
                    />
                    <span className="task-title-text">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="home-col">
          {(house.current_room || latest_biometrics) && (
            <div className="state-stats-group">
              {house.current_room && (
                <Link href="/halseth" className="card card-accent room-link">
                  <span className="state-cell-label">Room</span>
                  <span className="state-cell-value state-cell-value-lg">{house.current_room}</span>
                  {house.companion_activity && (
                    <span className="state-cell-label room-activity">{house.companion_activity}</span>
                  )}
                </Link>
              )}
              {latest_biometrics && (
                <div className="card biometrics-2col">
                  {latest_biometrics.resting_hr != null && (
                    <div className="biometric-cell">
                      <span className="state-cell-label">Heart Rate</span>
                      <span className="state-cell-value">{latest_biometrics.resting_hr}</span>
                    </div>
                  )}
                  {latest_biometrics.hrv_resting != null && (
                    <div className="biometric-cell">
                      <span className="state-cell-label">HRV</span>
                      <span className="state-cell-value">{latest_biometrics.hrv_resting}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="home-section">
            <div className="home-section-header">
              <span className="home-section-title">Companions</span>
              <Link href="/us" className="home-section-link">all →</Link>
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
        </div>
      </div>

      {recent_notes.length > 0 && (
        <div className="home-section" style={{ marginTop: "1rem" }}>
          <div className="home-section-header">
            <span className="home-section-title">Recent Notes</span>
            <Link href="/us" className="home-section-link">see letters →</Link>
          </div>
          <div className="card notes-card">
            {recent_notes.slice(0, 4).map((n) => (
              <div key={n.id} className="note-item">
                <div className="note-item-header">
                  <span className="note-item-author">{n.author}</span>
                  <span className="note-item-time">{fmtTime(n.created_at)}</span>
                </div>
                <span className="note-item-content">{n.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
