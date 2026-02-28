import { fetchPresence, type PresenceData } from "@/lib/halseth";
import LoveMeter from "@/components/LoveMeter";
import SpoonCounter from "@/components/SpoonCounter";
import NoteForm from "@/components/NoteForm";
import BiometricCard from "@/components/BiometricCard";
import PersonalityCard from "@/components/PersonalityCard";
import DreamCard from "@/components/DreamCard";

export const revalidate = 30;

// ── Helpers ─────────────────────────────────────────────────────────────────

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

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === now.toDateString()) return "today";
  if (d.toDateString() === tomorrow.toDateString()) return "tomorrow";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Components ───────────────────────────────────────────────────────────────

function RoomCard({ house }: { house: PresenceData["house"] }) {
  if (!house.current_room) return null;
  return (
    <div className="room-card">
      <div className="room-bg" />
      <div className="room-content">
        <div className="room-name">{house.current_room}</div>
        {(house.companion_mood || house.companion_activity) && (
          <div className="room-meta">
            {[house.companion_mood, house.companion_activity].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session }: { session: NonNullable<PresenceData["session"]> }) {
  return (
    <div className="card">
      <div className="card-title">
        Session <span className="pill open">open</span>
      </div>
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
  const motionClass = handover.motion_state === "floating" ? "float"
    : handover.motion_state === "in_motion" ? "motion" : "closed";

  return (
    <div className="card">
      <div className="card-title">
        Last Handover{" "}
        <span className={`pill ${motionClass}`}>{motionLabel(handover.motion_state)}</span>
      </div>
      {handover.spine && (
        <blockquote className="handover-spine">{handover.spine}</blockquote>
      )}
      <div className="kv-grid">
        {handover.last_real_thing && (
          <>
            <span className="kv-label">last real thing</span>
            <span className="kv-value">{handover.last_real_thing}</span>
          </>
        )}
        {handover.active_anchor && (
          <>
            <span className="kv-label">anchor</span>
            <span className="kv-value">{handover.active_anchor}</span>
          </>
        )}
        <span className="kv-label">closed</span>
        <span className="kv-value">{formatTime(handover.created_at)}</span>
      </div>
      {handover.open_threads.length > 0 && (
        <div className="open-threads">
          {handover.open_threads.map((t, i) => (
            <span key={i} className="thread-tag">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesCard({ notes }: { notes: PresenceData["recent_notes"] }) {
  return (
    <div className="card">
      <div className="card-title">Notes</div>
      {notes.length > 0 && (
        <div className="notes-feed">
          {[...notes].reverse().map((n) => (
            <div key={n.id} className={`note-bubble ${n.author}`}>
              <div className="note-text">{n.content}</div>
              <div className="note-meta">
                {n.note_type !== "message" && (
                  <span className="note-type-tag">{n.note_type}</span>
                )}
                {formatTime(n.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
      <NoteForm />
    </div>
  );
}

function TasksCard({ tasks }: { tasks: PresenceData["tasks"] }) {
  if (tasks.length === 0) return null;
  return (
    <div className="card">
      <div className="card-title">Open Tasks ({tasks.length})</div>
      <div className="task-list">
        {tasks.map((t) => (
          <div key={t.id} className="task-row">
            <span className={`priority-badge ${t.priority}`}>{t.priority}</span>
            <span className="task-title">{t.title}</span>
            {t.due_at && <span className="task-due">{formatDate(t.due_at)}</span>}
            {t.assigned_to && <span className="task-who">→ {t.assigned_to}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanionsCard({ companions }: { companions: PresenceData["companions"] }) {
  if (companions.length === 0) return null;
  return (
    <div className="card">
      <div className="card-title">Companions</div>
      <div className="companion-list">
        {companions.map((c) => (
          <div key={c.id} className="companion-row">
            <span className="companion-dot" />
            <span className="companion-name">{c.display_name}</span>
            <span className="companion-role">{c.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

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
      <main className="page">
        <div className="error-card">
          <strong>Could not connect to Halseth</strong>
          <p style={{ marginTop: "0.4rem", fontSize: "0.88rem" }}>{error}</p>
          <p style={{ marginTop: "0.4rem", fontSize: "0.82rem", opacity: 0.7 }}>
            Check that HALSETH_URL is set correctly in Vercel environment variables.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      {/* Header + relationship metrics */}
      <header className="header">
        <div className="header-top">
          <h1>{data.system.name}</h1>
          <span className="system-owner">{data.system.owner}</span>
        </div>
        <div className="metrics-row">
          <LoveMeter initial={data.house.love_meter} />
          <SpoonCounter initial={data.house.spoon_count} />
        </div>
      </header>

      {/* Room / location */}
      <RoomCard house={data.house} />

      {/* Session or last handover */}
      {data.session ? (
        <SessionCard session={data.session} />
      ) : data.last_handover ? (
        <HandoverCard handover={data.last_handover} />
      ) : (
        <div className="card">
          <div className="card-title">Session</div>
          <p className="empty">No open session. Halseth is at rest.</p>
        </div>
      )}

      {/* Biometrics */}
      {data.latest_biometrics && (
        <BiometricCard biometrics={data.latest_biometrics} />
      )}

      {/* Async notes */}
      <NotesCard notes={data.recent_notes} />

      {/* Dreams */}
      <DreamCard dreams={data.recent_dreams} />

      {/* Open tasks */}
      <TasksCard tasks={data.tasks} />

      {/* Companions */}
      <CompanionsCard companions={data.companions} />

      {/* Relational shape */}
      {data.personality && (
        <PersonalityCard personality={data.personality} />
      )}

      {/* Footer */}
      <div className="footer-row">
        {data.wounds_count > 0 && (
          <span className="wounds-badge">
            ⚠ {data.wounds_count} living {data.wounds_count === 1 ? "wound" : "wounds"}
          </span>
        )}
        <span className="refresh-note">refreshes every 30 s</span>
      </div>
    </main>
  );
}
