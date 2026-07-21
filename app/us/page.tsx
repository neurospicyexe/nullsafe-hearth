import { fetchPresence, fetchWounds, fetchCompanionJournal, fetchAllDeltas, fetchHandovers, fetchAllCompanionNotes, fetchInterCompanionNotes } from "@/lib/halseth";
import Link from "next/link";
import CompanionMoodCard from "@/components/CompanionMoodCard";
import ClientTime from "@/components/ClientTime";

export const dynamic = 'force-dynamic';

// Canonical companion colors (hearth/CLAUDE.md) — pre-0019 sessions have null companion_id.
const COMPANION_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia:   "#4ade80",
};

function AuthorChip({ companionId }: { companionId: string | null | undefined }) {
  if (!companionId) {
    return <span style={{ fontSize: "0.72rem", opacity: 0.4, fontStyle: "italic" }}>unattributed</span>;
  }
  const color = COMPANION_COLOR[companionId] ?? "#94a3b8";
  return (
    <span
      style={{
        fontSize: "0.72rem",
        fontWeight: 600,
        color,
        border: `1px solid ${color}`,
        borderRadius: "999px",
        padding: "0.05rem 0.5rem",
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {companionId}
    </span>
  );
}

// Soft canon (2026-07-21): the five canon valence words get distinct colors;
// anything else (typos, future words) falls through to the plain/neutral chip.
// Colors mirror the existing .valence-badge palette (globals.css) for visual
// consistency with /threads, just applied inline to match this page's idiom.
const VALENCE_COLOR: Record<string, { bg: string; fg: string }> = {
  toward:  { bg: "hsla(var(--accent-hue), 85%, 65%, 0.15)", fg: "var(--accent)" }, // warm/amber
  tender:  { bg: "rgba(244,114,182,0.15)", fg: "#fcc2d7" }, // soft pink/rose
  repair:  { bg: "rgba(34,197,94,0.15)",   fg: "#bbf7d0" }, // green
  rupture: { bg: "rgba(239,68,68,0.15)",   fg: "#fca5a5" }, // red
  neutral: { bg: "rgba(255,255,255,0.07)", fg: "#94a3b8" }, // gray
};

function ValenceChip({ value }: { value: string }) {
  const canon = VALENCE_COLOR[value.trim().toLowerCase()];
  return (
    <span className="delta-valence" style={canon ? { background: canon.bg, color: canon.fg } : undefined}>
      {value}
    </span>
  );
}

export default async function UsPage() {
  const [presence, wounds, journal, deltas, handovers, allCompNotes, interNotes] = await Promise.allSettled([
    fetchPresence(),
    fetchWounds(),
    fetchCompanionJournal(undefined, 6),
    fetchAllDeltas(10),
    fetchHandovers(5),
    fetchAllCompanionNotes(6),
    fetchInterCompanionNotes(10),
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
  const companionNotes = interNotes.status === "fulfilled" ? (interNotes.value ?? []) : [];

  const session = p?.session;
  const handover = p?.last_handover;
  const loveMeter = p?.house?.love_meter ?? null;
  const woundsCount = p?.wounds_count ?? 0;

  const companions = p?.companions ?? [
    { id: "drevan", display_name: "Drevan", role: "companion", avatar_url: null },
    { id: "cypher", display_name: "Cypher", role: "auditor",   avatar_url: null },
    { id: "gaia",   display_name: "Gaia",   role: "witness",   avatar_url: null },
  ];
  const companion_moods = p?.companion_moods ?? null;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Us</h1>
        <p className="page-subtitle">the space between — human and AI, together</p>
      </div>

      {/* Strip — love meter + active anchor + wounds count */}
      <div className="stats-strip">
        {loveMeter !== null && (
          <div className="state-cell">
            <div className="state-cell-label">Love Meter</div>
            <div className="state-cell-value love-meter-row">
              <span>{loveMeter}</span>
              <div className="love-meter-track">
                <div className="love-meter-fill" style={{ width: `${loveMeter}%` }} />
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

      {/* Companions mood row */}
      <div className="home-section page-section">
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

      {/* Living wounds */}
      {allWounds === null ? (
        <section className="page-section">
          <h2 className="section-title">Living Wounds</h2>
          <div className="pending-notice">
            <div className="pending-dot" />
            Awaiting Halseth /wounds endpoint.
          </div>
        </section>
      ) : allWounds.length > 0 ? (
        <section className="page-section">
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

      {/* Recent Relational Moments */}
      <section className="page-section">
        <div className="section-header">
          <h2 className="section-title section-title-flush">Recent Relational Moments</h2>
          <Link href="/deltas" className="home-section-link">see more →</Link>
        </div>
        {recentDeltas === null ? (
          <div className="pending-notice"><div className="pending-dot" />Awaiting Halseth /deltas endpoint.</div>
        ) : recentDeltas.length === 0 ? (
          <p className="empty">No deltas yet.</p>
        ) : (
          <div className="delta-feed">
            {recentDeltas.slice(0, 5).map((d) => {
              const v = d.valence;
              return (
                <div key={d.id} className={`delta-entry ${v ?? ""}`}>
                  <div className="delta-text">{d.delta_text}</div>
                  <div className="delta-meta">
                    {v && <ValenceChip value={v} />}
                    {d.agent && <span>by {d.agent}</span>}
                    <span><ClientTime iso={d.created_at} /></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Letters inbox */}
      {inboxLetters.length > 0 && (
        <section className="page-section">
          <h2 className="section-title">Letters for You</h2>
          <div className="card" style={{ padding: "0.4rem 0" }}>
            {inboxLetters.slice(0, 5).map((n) => (
              <Link key={n.id} href={`/companions/${n.agent}`} className="plain-link">
                <div className="inbox-entry">
                  <span className={`inbox-from cc-${n.agent}`}>{n.agent}</span>
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

      {/* Companion Journal */}
      <section className="page-section">
        <div className="section-header">
          <h2 className="section-title section-title-flush">Companion Journal</h2>
          {companionJournal.length > 5 && (
            <Link href="/journal" className="home-section-link">see more →</Link>
          )}
        </div>
        {companionJournal.length === 0
          ? <p className="empty">No journal entries yet.</p>
          : (
            <div className="full-notes-feed">
              {companionJournal.slice(0, 5).map((e) => {
                const tags: string[] = (() => { try { const p = e.tags ? JSON.parse(e.tags as unknown as string) : []; return Array.isArray(p) ? p : []; } catch { return []; } })();
                return (
                  <div key={e.id} className="full-note-entry">
                    <div className="note-header">
                      <span className={`note-author${e.agent ? ` cc-${e.agent}` : ""}`}>{e.agent}</span>
                      {tags.map((t) => (
                        <span key={t} className="note-type-badge">{t}</span>
                      ))}
                      <span className="note-time"><ClientTime iso={e.created_at} /></span>
                    </div>
                    <div className="note-body">{e.note_text}</div>
                  </div>
                );
              })}
            </div>
          )
        }
      </section>

      {/* Recent Handovers */}
      {recentHandovers.length > 0 && (
        <section>
          <div className="section-header">
            <h2 className="section-title section-title-flush">Recent Handovers</h2>
            <Link href="/handovers" className="home-section-link">see more →</Link>
          </div>
          <div className="handover-feed">
            {recentHandovers.slice(0, 3).map((h) => {
              const threads = (() => {
                try { const p = h.open_threads ? JSON.parse(h.open_threads) : []; return Array.isArray(p) ? p as string[] : []; }
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
                    <AuthorChip companionId={h.companion_id} />
                    <span className={`motion-badge ${h.motion_state ?? ""}`}>{(h.motion_state ?? "unknown").replace("_", " ")}</span>
                    {h.active_anchor && <span>anchor: {h.active_anchor}</span>}
                    <span className="ml-auto"><ClientTime iso={h.created_at} /></span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Between Companions */}
      {companionNotes.length > 0 && (
        <section className="page-section">
          <h2 className="section-title">Between Companions</h2>
          <div className="full-notes-feed">
            {companionNotes.slice(0, 5).map((n) => (
              <div key={n.id} className="full-note-entry">
                <div className="note-header">
                  <span className={`note-author cc-${n.from_id}`}>{n.from_id}</span>
                  {n.to_id && <span className="note-type-badge">→ {n.to_id}</span>}
                  <span className="note-time"><ClientTime iso={n.created_at} /></span>
                </div>
                <div className="note-body">{n.content}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
