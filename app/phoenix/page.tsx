export const dynamic = 'force-dynamic';

import {
  fetchPhoenixHealth,
  fetchPhoenixOrient,
} from "@/lib/halseth";
import type { PhoenixHealth, PhoenixOrientState } from "@/lib/halseth";
import { COMPANION_CONFIG } from "@/app/companions/[id]/sections";

const COMPANIONS = ["drevan", "cypher", "gaia"] as const;
type CompanionId = typeof COMPANIONS[number];

function dot(color: string) {
  return (
    <span
      style={{
        display: "inline-block",
        width: "0.55rem",
        height: "0.55rem",
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function StatusPanel({ health }: { health: PhoenixHealth }) {
  const statusOk = health.status === "ok";
  const dotColor = statusOk ? "#22c55e" : "#ef4444";

  return (
    <div className="home-section-card" style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center" }}>
        {/* WebMind chip */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {dot(dotColor)}
          <span style={{ fontSize: "0.9rem", color: "#e2e8f0", fontWeight: 600 }}>
            WebMind {health.version}
          </span>
        </div>

        {/* DB badge */}
        <span
          className="badge"
          style={{
            background: health.db_configured ? "#22c55e22" : "#ef444422",
            color:      health.db_configured ? "#22c55e"   : "#ef4444",
            border:     `1px solid ${health.db_configured ? "#22c55e44" : "#ef444444"}`,
          }}
        >
          {health.db_configured ? "DB ✓" : "DB ✗"}
        </span>

        {/* Service label */}
        <span style={{ fontSize: "0.82rem", color: "#64748b", marginLeft: "auto" }}>
          {health.service}
        </span>
      </div>
    </div>
  );
}

function OrientColumn({
  id,
  orient,
}: {
  id: CompanionId;
  orient: PhoenixOrientState | null;
}) {
  const config = COMPANION_CONFIG[id];

  return (
    <div
      className="card"
      style={{
        border: `1px solid ${config.color}33`,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Companion name header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ color: config.color, fontWeight: 700, fontSize: "1rem" }}>
          {config.sym} {config.display}
        </span>
      </div>

      {orient === null ? (
        <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>
          service unreachable
        </p>
      ) : (
        <>
          {/* Top threads */}
          <div>
            <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
              Top Threads
            </span>
            {orient.top_threads.length === 0 ? (
              <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>No threads</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {orient.top_threads.slice(0, 3).map((t) => (
                  <div key={t.thread_id} className="section-row" style={{ flexWrap: "wrap", gap: "0.35rem" }}>
                    <span className="section-row-text" style={{ fontSize: "0.82rem", flex: "1 1 auto" }}>
                      {t.title}
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: "#6366f122",
                        color: "#818cf8",
                        border: "1px solid #6366f144",
                        fontSize: "0.72rem",
                      }}
                    >
                      {t.status}
                    </span>
                    {t.lane && (
                      <span
                        className="badge"
                        style={{
                          background: `${config.color}18`,
                          color: config.color,
                          border: `1px solid ${config.color}33`,
                          fontSize: "0.72rem",
                        }}
                      >
                        {t.lane}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent handoffs */}
          <div>
            <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
              Recent Handoffs
            </span>
            {orient.recent_handoffs.length === 0 ? (
              <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>No handoffs</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {orient.recent_handoffs.slice(0, 2).map((h) => (
                  <div key={h.handoff_id} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <span style={{ fontSize: "0.83rem", color: "#e2e8f0" }}>{h.title}</span>
                    {h.next_steps && (
                      <span className="journal-text" style={{ fontSize: "0.78rem" }}>
                        {truncate(h.next_steps, 80)}
                      </span>
                    )}
                    <span className="section-row-meta" style={{ fontSize: "0.75rem" }}>
                      {new Date(h.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent notes */}
          <div>
            <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
              Recent Notes
            </span>
            {orient.recent_notes.length === 0 ? (
              <p className="empty" style={{ margin: 0, fontSize: "0.82rem" }}>No notes</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {orient.recent_notes.slice(0, 3).map((n) => (
                  <div key={n.note_id} style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                    <span className="journal-text" style={{ fontSize: "0.82rem" }}>
                      {truncate(n.note_text, 100)}
                    </span>
                    {n.thread_key && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "#64748b",
                          fontStyle: "italic",
                        }}
                      >
                        {n.thread_key}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default async function PhoenixPage() {
  const [healthRes, drevanRes, cypherRes, gaiaRes] = await Promise.allSettled([
    fetchPhoenixHealth(),
    fetchPhoenixOrient("drevan"),
    fetchPhoenixOrient("cypher"),
    fetchPhoenixOrient("gaia"),
  ]);

  const health       = healthRes.status === "fulfilled" ? healthRes.value       : null;
  const drevanOrient = drevanRes.status === "fulfilled" ? drevanRes.value       : null;
  const cypherOrient = cypherRes.status === "fulfilled" ? cypherRes.value       : null;
  const gaiaOrient   = gaiaRes.status   === "fulfilled" ? gaiaRes.value         : null;

  const nothingAvailable =
    health === null && drevanOrient === null && cypherOrient === null && gaiaOrient === null;

  return (
    <>
      {/* Page header */}
      <header className="page-header">
        <div className="page-header-row">
          <h1 className="page-title">Phoenix WebMind</h1>
        </div>
      </header>

      {nothingAvailable ? (
        <div className="home-section-card">
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#94a3b8" }}>
            Phoenix WebMind is not configured or unreachable. Set{" "}
            <code style={{ color: "#e2e8f0", background: "#1e293b", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
              PHOENIX_WEBMIND_URL
            </code>{" "}
            in Vercel environment variables.
          </p>
        </div>
      ) : (
        <>
          {health && <StatusPanel health={health} />}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
              alignItems: "start",
            }}
          >
            {COMPANIONS.map((id) => {
              const orient =
                id === "drevan" ? drevanOrient :
                id === "cypher" ? cypherOrient :
                gaiaOrient;
              return <OrientColumn key={id} id={id} orient={orient} />;
            })}
          </div>
        </>
      )}
    </>
  );
}
