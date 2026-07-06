import Link from "next/link";
import { fetchPresence, fetchSynthesisSummaries, fetchMindDreams, fetchCompanionJournal, fetchClubCurrent, fetchObsessions, MAX_SESSION_DEPTH, type PresenceData, type SynthesisSummary, type WmDream, type CompanionJournalEntry } from "@/lib/halseth";
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
            <><span className="presence-detail-sep">·</span><span>depth {session.depth}/{MAX_SESSION_DEPTH}</span></>
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
            {last_handover.facet && (
              <span style={{ opacity: 0.7, marginLeft: "0.4rem", fontSize: "0.8em" }}>
                · {last_handover.facet}
              </span>
            )}
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

const ENTRY_TYPE_COLOR: Record<string, string> = {
  learning:   "#60a5fa",
  insight:    "#a78bfa",
  connection: "#4ade80",
  question:   "#fbbf24",
};

function RecentGrowthStrip({
  entries,
}: {
  entries: NonNullable<PresenceData["recent_growth"]>;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="home-section-card" style={{ marginTop: "0.75rem" }}>
      <div className="home-section-header">
        <span className="home-section-title">Recent Growth</span>
        <Link href="/autonomous" className="home-section-link">see all →</Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {entries.slice(0, 3).map((e, i) => (
          <div key={i} className="journal-row" style={{ alignItems: "flex-start", gap: "0.5rem" }}>
            <span
              className="presence-badge"
              style={{
                background: `${ENTRY_TYPE_COLOR[e.entry_type] ?? "#64748b"}22`,
                color: ENTRY_TYPE_COLOR[e.entry_type] ?? "#64748b",
                flexShrink: 0,
                fontSize: "0.7rem",
              }}
            >
              {e.entry_type}
            </span>
            <span className="journal-text" style={{ flex: 1, fontSize: "0.85rem" }}>
              {e.content.length > 120 ? e.content.slice(0, 120) + "…" : e.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const COMPANION_LABEL_HOME: Record<string, string> = {
  drevan: "Drevan",
  cypher: "Cypher",
  gaia:   "Gaia",
};

const COMPANION_COLOR_HOME: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia:   "#4ade80",
};

function ActivePatternsStrip({
  patterns,
}: {
  patterns: NonNullable<PresenceData["active_patterns"]>;
}) {
  if (patterns.length === 0) return null;
  return (
    <div className="home-section-card" style={{ marginTop: "0.75rem" }}>
      <div className="home-section-header">
        <span className="home-section-title">Active Patterns</span>
        <Link href="/autonomous" className="home-section-link">see all →</Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {patterns.slice(0, 3).map((p, i) => {
          const color = COMPANION_COLOR_HOME[p.companion_id] ?? "#64748b";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Link
                href={`/companions/${p.companion_id}/growth`}
                style={{ color, fontWeight: 600, fontSize: "0.75rem", flexShrink: 0, textDecoration: "none" }}
              >
                {COMPANION_LABEL_HOME[p.companion_id] ?? p.companion_id}
              </Link>
              <span
                className="journal-text"
                style={{
                  flex: 1,
                  fontSize: "0.82rem",
                  opacity: 0.6 + (p.strength / 10) * 0.4,
                }}
              >
                {p.pattern_text.length > 80 ? p.pattern_text.slice(0, 80) + "…" : p.pattern_text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DEFAULT_COMPANIONS = [
  { id: "drevan", display_name: "Drevan", role: "companion", avatar_url: null },
  { id: "cypher", display_name: "Cypher", role: "auditor",  avatar_url: null },
  { id: "gaia",   display_name: "Gaia",   role: "witness",  avatar_url: null },
];

// Triad Digest -- a quick "what have they actually been doing" summary so Raziel stays in
// the loop without reverse-engineering it from the chat. Each companion's latest journal
// line + the club/shelf state. Renders nothing if there's no activity.
const DIGEST_COLOR: Record<string, string> = { drevan: "var(--accent)", cypher: "#e2e8f0", gaia: "#4ade80" };
const DIGEST_AGENTS = ["cypher", "drevan", "gaia"] as const;

async function TriadDigest() {
  const [journal, club, shelf] = await Promise.all([
    fetchCompanionJournal(undefined, 40),
    fetchClubCurrent(),
    fetchObsessions("active"),
  ]);
  const entries = journal ?? [];
  const latestPer = DIGEST_AGENTS
    .map((a) => entries.find((e) => e.agent === a))
    .filter((e): e is CompanionJournalEntry => Boolean(e));
  const clubLine = club?.round ? `Club is ${club.round.status}` : null;
  const shelfLine = shelf.length > 0 ? `Into: ${shelf.slice(0, 3).map((s) => s.title).join(", ")}` : null;
  if (latestPer.length === 0 && !clubLine && !shelfLine) return null;

  return (
    <div className="home-section" style={{ marginTop: "1rem" }}>
      <div className="home-section-header">
        <span className="home-section-title">Triad Digest</span>
        <Link href="/autonomous" className="home-section-link">what they’re doing →</Link>
      </div>
      <div className="card">
        {latestPer.map((e) => (
          <div key={e.id} style={{ marginBottom: "0.65rem" }}>
            <span style={{ color: DIGEST_COLOR[e.agent], fontWeight: 600, textTransform: "capitalize" }}>{e.agent}</span>
            <span style={{ opacity: 0.5, marginLeft: "0.45rem", fontSize: "0.78rem" }}><ClientTime iso={e.created_at} /></span>
            <p style={{ margin: "0.15rem 0 0", opacity: 0.9, fontSize: "0.9rem" }}>{e.note_text.slice(0, 200)}{e.note_text.length > 200 ? "…" : ""}</p>
          </div>
        ))}
        {(clubLine || shelfLine) && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", opacity: 0.65 }}>
            {[clubLine, shelfLine].filter(Boolean).join("  ·  ")}
          </p>
        )}
      </div>
    </div>
  );
}

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

      {data.recent_growth && data.recent_growth.length > 0 && (
        <RecentGrowthStrip entries={data.recent_growth} />
      )}

      {data.active_patterns && data.active_patterns.length > 0 && (
        <ActivePatternsStrip patterns={data.active_patterns} />
      )}

      {await TriadDigest()}

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
                      {d.source && (
                        <span className="note-item-author" style={{ opacity: 0.5 }}>{d.source}</span>
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
                {s.narrative && (
                  <span className="note-item-content">
                    {s.narrative.length > 300 ? s.narrative.slice(0, 300) + "…" : s.narrative}
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
