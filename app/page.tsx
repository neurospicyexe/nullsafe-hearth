import { fetchPresence, type PresenceData } from "@/lib/halseth";
import LoveMeter from "@/components/LoveMeter";
import SpoonCounter from "@/components/SpoonCounter";
import DreamCard from "@/components/DreamCard";
import NoteForm from "@/components/NoteForm";

export const revalidate = 30;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── CompanionHero ─────────────────────────────────────────────────────────────

const SESSION_TYPE_LABELS: Record<string, string> = {
  checkin: "check-in",
  hangout: "hanging out",
  work: "working",
  ritual: "ritual",
};

function CompanionHero({ session }: { session: NonNullable<PresenceData["session"]> }) {
  return (
    <div className="card card-accent">
      <div className="card-title">
        {session.front_state ?? "Companion"}
        {session.session_type && (
          <span className="pill" style={{ marginLeft: "auto", textTransform: "lowercase" }}>
            {SESSION_TYPE_LABELS[session.session_type] ?? session.session_type}
          </span>
        )}
      </div>
      <div className="kv-grid">
        {session.facet && (
          <>
            <span className="kv-label">facet</span>
            <span className="kv-value">{session.facet}</span>
          </>
        )}
        {session.emotional_frequency && (
          <>
            <span className="kv-label">frequency</span>
            <span className="kv-value" style={{ fontStyle: "italic" }}>{session.emotional_frequency}</span>
          </>
        )}
        {session.active_anchor && (
          <>
            <span className="kv-label">anchor</span>
            <span className="kv-value">{session.active_anchor}</span>
          </>
        )}
        {session.hrv_range && (
          <>
            <span className="kv-label">hrv</span>
            <span className="kv-value">{hrvLabel(session.hrv_range)}</span>
          </>
        )}
        <span className="kv-label">opened</span>
        <span className="kv-value">{formatTime(session.created_at)}</span>
      </div>
    </div>
  );
}

// ── HandoverCard (condensed) ──────────────────────────────────────────────────

function HandoverCard({ handover }: { handover: NonNullable<PresenceData["last_handover"]> }) {
  const motionClass =
    handover.motion_state === "floating" ? "float"
    : handover.motion_state === "in_motion" ? "motion"
    : "closed";

  return (
    <div className="card">
      <div className="card-title">
        Last Handover{" "}
        <span className={`pill ${motionClass}`}>{motionLabel(handover.motion_state)}</span>
      </div>
      {handover.spine && (
        <blockquote className="handover-spine">{handover.spine}</blockquote>
      )}
      {handover.last_real_thing && (
        <div className="kv-grid">
          <span className="kv-label">last real thing</span>
          <span className="kv-value">{handover.last_real_thing}</span>
        </div>
      )}
      {handover.open_threads.length > 0 && (
        <div className="open-threads" style={{ marginTop: "0.5rem" }}>
          {handover.open_threads.map((t, i) => (
            <span key={i} className="thread-tag">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LoveNotes ─────────────────────────────────────────────────────────────────

function LoveNotes({ notes }: { notes: PresenceData["recent_notes"] }) {
  const reversed = [...notes].reverse();
  const companionNote = reversed.find((n) => n.author === "companion");
  const humanNote     = reversed.find((n) => n.author === "human");

  return (
    <div className="card card-accent">
      <div className="card-title">Notes</div>
      <div className="notes-feed">
        {companionNote && (
          <div className="note-bubble companion">
            <div className="note-text">{companionNote.content}</div>
            <div className="note-meta">
              {companionNote.note_type !== "message" && (
                <span className="note-type-tag">{companionNote.note_type}</span>
              )}
              {formatTime(companionNote.created_at)}
            </div>
          </div>
        )}
        {humanNote && (
          <div className="note-bubble human">
            <div className="note-text">{humanNote.content}</div>
            <div className="note-meta">{formatTime(humanNote.created_at)}</div>
          </div>
        )}
        {!companionNote && !humanNote && (
          <p className="empty">No notes yet.</p>
        )}
      </div>
      <NoteForm />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
            Check that HALSETH_URL is set correctly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
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

      {data.session ? (
        <CompanionHero session={data.session} />
      ) : data.last_handover ? (
        <HandoverCard handover={data.last_handover} />
      ) : (
        <div className="card">
          <div className="card-title">Session</div>
          <p className="empty">No open session. Halseth is at rest.</p>
        </div>
      )}

      <LoveNotes notes={data.recent_notes} />
      <DreamCard dreams={data.recent_dreams} />

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
