export const dynamic = 'force-dynamic';

import { fetchSessions } from "@/lib/halseth";
import { COMPANION_CONFIG } from "@/app/companions/[id]/sections";

const FALLBACK_COLOR = "#6b7280";

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const MOTION_ICON: Record<string, string> = {
  in_motion: "→",
  at_rest:   "·",
  floating:  "~",
};

const SESSION_TYPE_COLOR: Record<string, string> = {
  work:             "#3b82f6",
  "companion-work": "#6366f1",
  hangout:          "#f97316",
  checkin:          "#22c55e",
  ritual:           "#a855f7",
};

export default async function SessionsPage() {
  const sessions = await fetchSessions(60, 100);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Sessions</h1>
        <p className="page-subtitle">past and present presence records</p>
      </div>

      {sessions.length === 0 && (
        <div className="pending-notice">
          <div className="pending-dot" />
          No sessions found.
        </div>
      )}

      <div className="card" style={{ padding: "0.5rem 0" }}>
        {sessions.map((s) => {
          const companionColor = s.companion_id ? (COMPANION_CONFIG[s.companion_id]?.color ?? FALLBACK_COLOR) : FALLBACK_COLOR;
          const typeColor = s.session_type ? (SESSION_TYPE_COLOR[s.session_type] ?? null) : null;
          const motionIcon = s.motion_state ? (MOTION_ICON[s.motion_state] ?? null) : null;

          return (
            <div key={s.id} className="journal-row" style={{ alignItems: "flex-start", gap: "0.75rem", flexDirection: "column" }}>


              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", flexWrap: "wrap" }}>
                {s.companion_id && (
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: companionColor,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>
                    {s.companion_id}
                  </span>
                )}
                {s.session_type && typeColor && (
                  <span style={{
                    fontSize: "0.72rem",
                    padding: "0.1rem 0.45rem",
                    background: `${typeColor}18`,
                    border: `1px solid ${typeColor}33`,
                    borderRadius: "3px",
                    color: typeColor,
                  }}>
                    {s.session_type}
                  </span>
                )}
                {motionIcon && (
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }} title={s.motion_state ?? undefined}>
                    {motionIcon}
                  </span>
                )}
                <span className="journal-time" style={{ marginLeft: "auto", flexShrink: 0 }}>
                  {fmtTime(s.created_at)}
                </span>
              </div>


              {s.spine && (
                <p style={{ margin: 0, fontSize: "0.92rem", color: "#e2e8f0", lineHeight: 1.45 }}>
                  {s.spine}
                </p>
              )}


              {s.last_real_thing && (
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.4, fontStyle: "italic" }}>
                  {s.last_real_thing.length > 160 ? s.last_real_thing.slice(0, 160) + "…" : s.last_real_thing}
                </p>
              )}


              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {s.front_state && (
                  <span className="page-subtitle" style={{ fontSize: "0.75rem" }}>
                    front: {s.front_state}
                  </span>
                )}
                {s.facet && (
                  <span className="page-subtitle" style={{ fontSize: "0.75rem" }}>
                    {s.facet}
                  </span>
                )}
                {s.emotional_frequency && (
                  <span className="page-subtitle" style={{ fontSize: "0.75rem" }}>
                    {s.emotional_frequency}
                  </span>
                )}
                {s.notes && (
                  <span className="page-subtitle" style={{ fontSize: "0.75rem", fontStyle: "italic" }}>
                    {s.notes.length > 80 ? s.notes.slice(0, 80) + "…" : s.notes}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
