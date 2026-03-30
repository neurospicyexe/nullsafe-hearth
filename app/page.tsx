import Link from "next/link";
import { fetchPresence, fetchSynthesisSummaries, fetchMindDreams, type PresenceData, type SynthesisSummary, type WmDream } from "@/lib/halseth";
import CompanionMoodCard from "@/components/CompanionMoodCard";
import LiveFeedImage from "@/components/LiveFeedImage";

export const dynamic = 'force-dynamic';

import ClientTime from "@/components/ClientTime";

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
          <span><ClientTime iso={session.created_at} /></span>
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
            {(last_handover.motion_state ?? "").replace("_", " ")}
          </span>
        </div>
        <div className="presence-body presence-body-muted">
          {last_handover.spine.length > 200
            ? last_handover.spine.slice(0, 200) + "…"
            : last_handover.spine}
        </div>
        {last_handover.last_real_thing && (
          <div className="presence-body" style={{ opacity: 0.6, fontSize: "0.8rem", marginTop: "0.25rem" }}>
            last real thing: {last_handover.last_real_thing}
          </div>
        )}
        <div className="presence-detail">
          {last_handover.active_anchor && <span>{last_handover.active_anchor}</span>}
          {last_handover.open_threads.length > 0 && (
            <>
              {last_handover.active_anchor && <span className="presence-detail-sep">·</span>}
              <span>{last_handover.open_threads.length} open thread{last_handover.open_threads.length !== 1 ? "s" : ""}</span>
            </>
          )}
          <span className="presence-detail-sep ml-auto">·</span>
          <span style={{ opacity: 0.5 }}><ClientTime iso={last_handover.created_at} /></span>
          <Link href="/handovers" className="home-section-link" style={{ marginLeft: "0.5rem" }}>all →</Link>
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
  let synthesisSummaries: SynthesisSummary[] = [];

  let mindDreams: WmDream[] = [];

  try {
    const [presenceResult, synthResult, ...dreamResults] = await Promise.all([
      fetchPresence(),
      fetchSynthesisSummaries(6),
      fetchMindDreams("drevan", 3),
      fetchMindDreams("cypher", 3),
      fetchMindDreams("gaia", 3),
    ]);
    data = presenceResult;
    synthesisSummaries = synthResult;
    mindDreams = (dreamResults.flat() as WmDream[])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load";
    // fetchSynthesisSummaries returns [] on failure so only presence error matters
    if (!data) {
      return (
        <div className="error-card">
          <strong>Could not connect to Halseth</strong>
          <p className="error-detail">{error}</p>
        </div>
      );
    }
  }

  if (!data) {
    return (
      <div className="error-card">
        <strong>Could not connect to Halseth</strong>
        <p className="error-detail">{error}</p>
      </div>
    );
  }

  const { house, wounds_count, tasks, recent_notes, recent_dreams, recent_companion_notes, latest_biometrics, companion_moods } = data;
  const companions = data.companions.length > 0 ? data.companions : DEFAULT_COMPANIONS;
  const urgentTasks = tasks.filter((t) => t.status !== "done" && (t.priority === "urgent" || t.priority === "high"));
  const openTaskCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <>
      <header className="page-header page-header--home">
        <div className="page-header-row">
          <h1 className="page-title">{data.system.name}</h1>
          {data.system.owner && !data.system.owner.includes("REPLACE_WITH") && (
            <span className="page-subtitle">{data.system.owner}</span>
          )}
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

          {house.current_room && /^[a-z0-9_-]+$/i.test(house.current_room) && (
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
          {(house.current_room || latest_biometrics || house.spoon_count > 0 || house.love_meter > 0) && (
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

              {(house.spoon_count > 0 || house.love_meter > 0 || house.autonomous_turn) && (
                <div className="card biometrics-2col">
                  {house.spoon_count > 0 && (
                    <div className="biometric-cell">
                      <span className="state-cell-label">Spoons</span>
                      <span className="state-cell-value" style={{ color: "var(--accent)" }}>{house.spoon_count}</span>
                    </div>
                  )}
                  {house.love_meter > 0 && (
                    <div className="biometric-cell">
                      <span className="state-cell-label">Love</span>
                      <span className="state-cell-value" style={{ color: "#f472b6" }}>{house.love_meter}</span>
                      <div className="stat-mini-bar">
                        <div className="stat-mini-fill" style={{ width: `${house.love_meter}%`, background: "#f472b6" }} />
                      </div>
                    </div>
                  )}
                  {house.autonomous_turn && (
                    <div className="biometric-cell" style={{ gridColumn: "span 2" }}>
                      <span className="state-cell-label">Autonomous Turn</span>
                      <span className="state-cell-value" style={{ fontSize: "0.9rem" }}>{house.autonomous_turn}</span>
                    </div>
                  )}
                </div>
              )}

              {latest_biometrics && (
                <div className="card biometrics-2col">
                  {latest_biometrics.resting_hr != null && (
                    <div className="biometric-cell">
                      <span className="state-cell-label">Heart Rate</span>
                      <span className="state-cell-value" style={{ color: "#f87171" }}>{latest_biometrics.resting_hr}</span>
                    </div>
                  )}
                  {latest_biometrics.hrv_resting != null && (
                    <div className="biometric-cell">
                      <span className="state-cell-label">HRV</span>
                      <span className="state-cell-value" style={{ color: "var(--accent)" }}>{latest_biometrics.hrv_resting}</span>
                    </div>
                  )}
                  {latest_biometrics.sleep_hours != null && (
                    <div className="biometric-cell">
                      <span className="state-cell-label">Sleep</span>
                      <span className="state-cell-value" style={{ color: "#a78bfa" }}>{latest_biometrics.sleep_hours}h</span>
                    </div>
                  )}
                  {latest_biometrics.sleep_quality != null && (
                    <div className="biometric-cell">
                      <span className="state-cell-label">Quality</span>
                      <span className="state-cell-value" style={{ fontSize: "0.85rem", color: "#a78bfa" }}>{latest_biometrics.sleep_quality}</span>
                    </div>
                  )}
                  {latest_biometrics.stress_score != null && (
                    <div className="biometric-cell">
                      <span className="state-cell-label">Stress</span>
                      <span className="state-cell-value" style={{ color: "var(--orange)" }}>{latest_biometrics.stress_score}</span>
                    </div>
                  )}
                  {latest_biometrics.steps != null && (
                    <div className="biometric-cell">
                      <span className="state-cell-label">Steps</span>
                      <span className="state-cell-value" style={{ fontSize: "0.85rem" }}>{latest_biometrics.steps.toLocaleString()}</span>
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
                  <span className="note-item-time"><ClientTime iso={n.created_at} /></span>
                </div>
                <span className="note-item-content">{n.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(mindDreams.length > 0 || recent_dreams.length > 0) && (
        <div className="home-section" style={{ marginTop: "1rem" }}>
          <div className="home-section-header">
            <span className="home-section-title">Recent Dreams</span>
            <Link href="/dreams" className="home-section-link">all dreams →</Link>
          </div>
          <div className="card notes-card">
            {mindDreams.length > 0
              ? mindDreams.map((d) => (
                  <div key={d.id} className="note-item">
                    <div className="note-item-header">
                      <span className="note-item-author">{d.companion_id}</span>
                      {d.dream_type && (
                        <span className="note-item-author" style={{ opacity: 0.5 }}>{d.dream_type.replace("_", " ")}</span>
                      )}
                      <span className="note-item-time"><ClientTime iso={d.created_at} /></span>
                    </div>
                    <span className="note-item-content">
                      {d.dream_text.length > 200 ? d.dream_text.slice(0, 200) + "…" : d.dream_text}
                    </span>
                  </div>
                ))
              : recent_dreams.slice(0, 3).map((d) => (
                  <div key={d.id} className="note-item">
                    <div className="note-item-header">
                      <span className="note-item-author">{d.companion_id}</span>
                      <span className="note-item-time"><ClientTime iso={d.created_at} /></span>
                    </div>
                    <span className="note-item-content">
                      {d.content.length > 200 ? d.content.slice(0, 200) + "…" : d.content}
                    </span>
                  </div>
                ))}
          </div>
        </div>
      )}

      {(recent_companion_notes && recent_companion_notes.length > 0) && (
        <div className="home-section" style={{ marginTop: "1rem" }}>
          <div className="home-section-header">
            <span className="home-section-title">Companion Activity</span>
            <Link href="/journal" className="home-section-link">see all →</Link>
          </div>
          <div className="card notes-card">
            {recent_companion_notes.slice(0, 5).map((n) => (
              <div key={n.id} className="note-item">
                <div className="note-item-header">
                  <span className="note-item-author">{n.agent}</span>
                  <span className="note-item-time"><ClientTime iso={n.created_at} /></span>
                </div>
                <span className="note-item-content">{n.note_text}</span>
                {n.tags.length > 0 && (
                  <span className="note-item-tags">{n.tags.join(" · ")}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {synthesisSummaries.length > 0 && (
        <div className="home-section" style={{ marginTop: "1rem" }}>
          <div className="home-section-header">
            <span className="home-section-title">Synthesis</span>
          </div>
          <div className="card notes-card">
            {synthesisSummaries.slice(0, 5).map((s) => (
              <div key={s.id} className="note-item">
                <div className="note-item-header">
                  <span className="note-item-author">{s.companion_id ?? "cross-companion"}</span>
                  <span className="note-item-author" style={{ opacity: 0.5 }}>{s.summary_type.replace("_", " ")}</span>
                  <span className="note-item-time"><ClientTime iso={s.created_at} /></span>
                </div>
                {s.content && (
                  <span className="note-item-content">
                    {s.content.length > 300 ? s.content.slice(0, 300) + "…" : s.content}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
