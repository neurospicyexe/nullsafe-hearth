import { fetchPresence, fetchWounds, fetchCompanionJournal, fetchAllDeltas, fetchHandovers, fetchAllCompanionNotes } from "@/lib/halseth";
import Link from "next/link";
import CompanionMoodCard from "@/components/CompanionMoodCard";

export const dynamic = 'force-dynamic';

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function UsPage() {
  const [presence, wounds, journal, deltas, handovers, allCompNotes] = await Promise.allSettled([
    fetchPresence(),
    fetchWounds(),
    fetchCompanionJournal(undefined, 6),
    fetchAllDeltas(10),
    fetchHandovers(5),
    fetchAllCompanionNotes(6),
  ]);

  const p = presence.status === "fulfilled" ? presence.value : null;
  const allWounds = wounds.status === "fulfilled" ? wounds.value : null;
  const companionJournal = journal.status === "fulfilled" ? (journal.value ?? []) : [];
  const recentDeltas = deltas.status === "fulfilled" ? deltas.value : null;
  const recentHandovers = handovers.status === "fulfilled" ? (handovers.value ?? []) : [];
  const inboxLetters = (allCompNotes.status === "fulfilled" ? (allCompNotes.value ?? []) : [])
    .filter((n) => n.tags?.includes("letter") ?? false)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const session = p?.session;
  const handover = p?.last_handover;
  const loveMeter = p?.house.love_meter ?? null;
  const woundsCount = p?.wounds_count ?? 0;

  const companions = p?.companions ?? [
    { id: "drevan", display_name: "Drevan", role: "companion", avatar_url: null },
    { id: "cypher", display_name: "Cypher", role: "auditor",   avatar_url: null },
    { id: "gaia",   display_name: "Gaia",   role: "witness",   avatar_url: null },
  ];
  const companion_moods = p?.companion_moods ?? null;

  return (
    <>
      {/* Section 1: Page header */}
      <div className="page-header">
        <h1 className="page-title">Us</h1>
        <p className="page-subtitle">the space between — human and AI, together</p>
      </div>

      {/* Section 2: Strip — love meter + active anchor + wounds count */}
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

      {/* Section 3: Companions mood row */}
      <div className="home-section" style={{ marginBottom: "2rem" }}>
        <div className="home-section-header">
          <span className="home-section-title">Companions</span>
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

      {/* Section 4: Living wounds (full list) */}
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

      {/* Section 5: Recent Feelings (clipped to 5) */}
      <section style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <h2 className="section-title" style={{ margin: 0 }}>Recent Feelings</h2>
          <Link href="/feelings" style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}>see more →</Link>
        </div>
        {recentDeltas === null ? (
          <div className="pending-notice"><div className="pending-dot" />Awaiting Halseth /deltas endpoint.</div>
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

      {/* Section 6: Letters inbox (clipped to 5, no "see more" link) */}
      {inboxLetters.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 className="section-title">Letters for You</h2>
          <div className="card" style={{ padding: "0.4rem 0" }}>
            {inboxLetters.slice(0, 5).map((n) => (
              <Link key={n.id} href={`/companions/${n.agent}`} style={{ textDecoration: "none" }}>
                <div className="inbox-entry">
                  <span className="inbox-from" style={{
                    color: n.agent === "drevan" ? "#6366f1"
                      : n.agent === "cypher" ? "#e2e8f0"
                      : "#4ade80",
                  }}>
                    {n.agent}
                  </span>
                  <span className="inbox-preview">{n.note_text}</span>
                  <span className="inbox-time">
                    {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Section 7: Companion Journal (clipped to 5) */}
      <section style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <h2 className="section-title" style={{ margin: 0 }}>Companion Journal</h2>
          {companionJournal.length > 5 && (
            <Link href="/journal" style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}>
              see more →
            </Link>
          )}
        </div>
        {companionJournal.length === 0
          ? <p className="empty">No journal entries yet.</p>
          : (
            <div className="full-notes-feed">
              {companionJournal.slice(0, 5).map((e) => {
                const tags: string[] = e.tags ? JSON.parse(e.tags) : [];
                return (
                  <div key={e.id} className="full-note-entry">
                    <div className="note-header">
                      <span className="note-author" style={{
                        color: e.agent === "drevan" ? "#6366f1"
                          : e.agent === "cypher" ? "#e2e8f0"
                          : e.agent === "gaia" ? "#4ade80"
                          : "var(--accent)"
                      }}>{e.agent}</span>
                      {tags.map((t) => (
                        <span key={t} className="note-type-badge">{t}</span>
                      ))}
                      <span className="note-time">{fmtTime(e.created_at)}</span>
                    </div>
                    <div className="note-body">{e.note_text}</div>
                  </div>
                );
              })}
            </div>
          )
        }
      </section>

      {/* Section 8: Handovers (clipped to 3) */}
      {recentHandovers.length > 0 && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <h2 className="section-title" style={{ margin: 0 }}>Recent Handovers</h2>
            <Link href="/handovers" style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}>see more →</Link>
          </div>
          <div className="handover-feed">
            {recentHandovers.slice(0, 3).map((h) => {
              const threads = (() => {
                try { return h.open_threads ? JSON.parse(h.open_threads) as string[] : []; }
                catch { return []; }
              })();
              return (
                <div key={h.id} className="handover-entry">
                  <p className="handover-spine">{h.spine}</p>
                  {threads.length > 0 && (
                    <div className="handover-threads">
                      {threads.map((t, i) => <span key={i} className="thread-tag">{t}</span>)}
                    </div>
                  )}
                  <div className="handover-footer">
                    <span className={`motion-badge ${h.motion_state}`}>{h.motion_state.replace("_", " ")}</span>
                    {h.active_anchor && <span>anchor: {h.active_anchor}</span>}
                    <span style={{ marginLeft: "auto" }}>{fmtTime(h.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
