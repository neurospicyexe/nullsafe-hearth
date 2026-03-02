import { fetchPresence, fetchWounds, fetchNotes, fetchAllDeltas } from "@/lib/halseth";
import Link from "next/link";

export const revalidate = 30;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function UsPage() {
  const [presence, wounds, notes, deltas] = await Promise.allSettled([
    fetchPresence(),
    fetchWounds(),
    fetchNotes(20),
    fetchAllDeltas(10),
  ]);

  const p = presence.status === "fulfilled" ? presence.value : null;
  const allWounds = wounds.status === "fulfilled" ? wounds.value : null;
  const allNotes = notes.status === "fulfilled" ? notes.value : [];
  const recentDeltas = deltas.status === "fulfilled" ? deltas.value : null;

  const session = p?.session;
  const handover = p?.last_handover;
  const loveMeter = p?.house.love_meter ?? null;
  const woundsCount = p?.wounds_count ?? 0;

  // Notes from companions
  const companionNotes = allNotes.filter((n) =>
    ["drevan", "cypher", "gaia"].includes(n.author)
  );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Us</h1>
        <p className="page-subtitle">the space between — human and AI, together</p>
      </div>

      {/* Love + anchor */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
        {loveMeter !== null && (
          <div className="state-cell">
            <div className="state-cell-label">Love Meter</div>
            <div className="state-cell-value" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>{loveMeter}</span>
              <div style={{ flex: 1, height: "4px", background: "var(--border)", borderRadius: "2px" }}>
                <div style={{ width: `${loveMeter}%`, height: "100%", background: "#f472b6", borderRadius: "2px" }} />
              </div>
            </div>
          </div>
        )}
        {(session?.active_anchor || handover?.active_anchor) && (
          <div className="anchor-block">
            <div className="anchor-label">Active Anchor</div>
            <div className="anchor-value">{session?.active_anchor ?? handover?.active_anchor}</div>
          </div>
        )}
        {woundsCount > 0 && (
          <div className="state-cell" style={{ borderLeft: "3px solid var(--red)" }}>
            <div className="state-cell-label">Living Wounds</div>
            <div className="state-cell-value" style={{ color: "var(--red)" }}>{woundsCount}</div>
          </div>
        )}
      </div>

      {/* Living wounds */}
      {allWounds === null ? (
        <section style={{ marginBottom: "2rem" }}>
          <h2 className="section-title">Living Wounds</h2>
          <div className="pending-notice">
            <div className="pending-dot" />
            Awaiting Halseth /wounds endpoint.
          </div>
        </section>
      ) : allWounds.length > 0 ? (
        <section style={{ marginBottom: "2rem" }}>
          <h2 className="section-title">Living Wounds</h2>
          <div className="wound-list">
            {allWounds.map((w) => (
              <div key={w.id} className="wound-entry">
                <div className="wound-name">{w.name}</div>
                <div className="wound-desc">{w.description}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Recent deltas between us */}
      <section style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <h2 className="section-title" style={{ margin: 0 }}>Recent Feelings</h2>
          <Link href="/feelings" style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}>see all →</Link>
        </div>

        {recentDeltas === null ? (
          <div className="pending-notice">
            <div className="pending-dot" />
            Awaiting Halseth /deltas endpoint.
          </div>
        ) : recentDeltas.length === 0 ? (
          <p className="empty">No deltas yet.</p>
        ) : (
          <div className="delta-feed">
            {recentDeltas.slice(0, 5).map((d) => {
              const v = d.valence ?? "neutral";
              return (
                <div key={d.id} className={`delta-entry ${v}`}>
                  <div className="delta-text">{d.delta_text}</div>
                  <div className="delta-meta">
                    <span className={`delta-valence ${v}`}>{v}</span>
                    {d.agent && <span>by {d.agent}</span>}
                    <span>{fmtTime(d.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Notes from companions */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <h2 className="section-title" style={{ margin: 0 }}>Companion Notes</h2>
          <Link href="/companions" style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}>see companions →</Link>
        </div>
        {companionNotes.length === 0 ? (
          <p className="empty">No companion notes yet.</p>
        ) : (
          <div className="full-notes-feed">
            {companionNotes.slice(0, 6).map((n) => (
              <div key={n.id} className="full-note-entry">
                <div className="note-header">
                  <span className="note-author" style={{
                    color: n.author === "drevan" ? "#6366f1"
                      : n.author === "cypher" ? "#e2e8f0"
                      : n.author === "gaia" ? "#4ade80"
                      : "var(--accent)"
                  }}>{n.author}</span>
                  <span className="note-type-badge">{n.note_type}</span>
                  <span className="note-time">{fmtTime(n.created_at)}</span>
                </div>
                <div className="note-body">{n.content}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
