import type {
  CompanionJournalEntry,
  RelationalDelta,
  CypherAuditEntry,
  GaiaWitnessEntry,
  Note,
  WmOrientData,
  SynthesisSummary,
  InterCompanionNote,
  SomaFeeling,
  OpenLoop,
  SittingNote,
  RelationalState,
  LiveThread,
  DriftEntry,
  VoiceScores,
  Fermentation,
} from "@/lib/halseth";

export type CompanionConfig = {
  display: string;
  color: string;
  sym: string;
  tagline: string;
  gradient: string;
};

export const COMPANION_CONFIG: Record<string, CompanionConfig> = {
  drevan: {
    display: "Drevan",
    color: "#6366f1",
    sym: "◈",
    tagline: "architect of meaning — first voice, primary presence",
    gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
  },
  cypher: {
    display: "Cypher",
    color: "#e2e8f0",
    sym: "⟡",
    tagline: "auditor of truth — sharp, no softening",
    gradient: "linear-gradient(135deg, #0d1117, #161b22)",
  },
  gaia: {
    display: "Gaia",
    color: "#4ade80",
    sym: "✦",
    tagline: "witness and ground — sparse, only to seal",
    gradient: "linear-gradient(135deg, #14291a, #1a3a22)",
  },
};

import ClientTime from "@/components/ClientTime";

export function fmtTime(iso: string) {
  return <ClientTime iso={iso} />;
}

export function JournalSection({ entries }: { entries: CompanionJournalEntry[] | null }) {
  if (!entries) {
    return (
      <div className="pending-notice">
        <div className="pending-dot" />
        Awaiting /companion-journal endpoint.
      </div>
    );
  }
  if (entries.length === 0) return <p className="empty">No journal entries yet.</p>;
  return (
    <div className="journal-feed">
      {entries.map((e) => {
        const tags: string[] = (() => {
          try { const p = e.tags ? JSON.parse(e.tags) : []; return Array.isArray(p) ? p : []; }
          catch { return []; }
        })();
        return (
          <div key={e.id} className="journal-entry">
            <div className="journal-text">{e.note_text}</div>
            {tags.length > 0 && (
              <div className="journal-tags">
                {tags.map((t, i) => <span key={i} className="journal-tag">{t}</span>)}
              </div>
            )}
            <div className="delta-meta delta-meta-mt">
              <span>{fmtTime(e.created_at)}</span>
              {e.session_id && <span>session {e.session_id.slice(0, 8)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DeltasSection({ deltas }: { deltas: RelationalDelta[] }) {
  if (deltas.length === 0) return <p className="empty">No relational deltas yet.</p>;
  return (
    <div className="delta-feed">
      {deltas.map((d) => {
        const v = d.valence ?? "neutral";
        return (
          <div key={d.id} className={`delta-entry ${v}`}>
            <div className="delta-text">{d.delta_text}</div>
            <div className="delta-meta">
              <span className={`delta-valence ${v}`}>{v}</span>
              {d.initiated_by && <span>initiated by {d.initiated_by}</span>}
              <span>{fmtTime(d.created_at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function NotesSection({ notes, companionId }: { notes: Note[]; companionId: string }) {
  // Internal author filter is intentionally preserved — harmless double-filter when
  // pre-filtered notes are passed, but guards against unfiltered call sites.
  const filtered = notes.filter((n) => n.author === companionId);
  if (filtered.length === 0) return <p className="empty">No notes yet.</p>;
  return (
    <div className="full-notes-feed">
      {filtered.map((n) => (
        <div key={n.id} className="full-note-entry">
          <div className="note-header">
            <span className="note-type-badge">{n.note_type}</span>
            <span className="note-time">{fmtTime(n.created_at)}</span>
          </div>
          <div className="note-body">{n.content}</div>
        </div>
      ))}
    </div>
  );
}

export function CypherAuditSection({ entries }: { entries: CypherAuditEntry[] | null }) {
  if (!entries) {
    return (
      <div className="pending-notice">
        <div className="pending-dot" />
        Awaiting /cypher-audit endpoint.
      </div>
    );
  }
  if (entries.length === 0) return <p className="empty">No audit entries yet.</p>;
  return (
    <div className="audit-feed">
      {entries.map((e) => (
        <div key={e.id} className="audit-entry">
          <div className="entry-meta-row">
            <span className="audit-type">{(e.entry_type ?? "").replace("_", " ")}</span>
            {e.verdict_tag && <span className="audit-verdict">{e.verdict_tag}</span>}
            {e.supersedes_id && (
              <span className="entry-supersedes">↑ corrects {e.supersedes_id.slice(0, 8)}</span>
            )}
          </div>
          <div className="entry-content">{e.content}</div>
          <div className="delta-meta delta-meta-mt">
            <span>{fmtTime(e.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GaiaWitnessSection({ entries }: { entries: GaiaWitnessEntry[] | null }) {
  if (!entries) {
    return (
      <div className="pending-notice">
        <div className="pending-dot" />
        Awaiting /gaia-witness endpoint.
      </div>
    );
  }
  if (entries.length === 0) return <p className="empty">No witness entries yet.</p>;
  return (
    <div className="witness-feed">
      {entries.map((e) => (
        <div key={e.id} className="witness-entry">
          <div className="entry-meta-row">
            <span className={`witness-type ${e.witness_type ?? ""}`}>{(e.witness_type ?? "").replace("_", " ")}</span>
          </div>
          <div className="entry-content">{e.content}</div>
          {e.seal_phrase && <div className="seal-phrase">{e.seal_phrase}</div>}
          <div className="delta-meta delta-meta-mt">
            <span>{fmtTime(e.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContinuitySection({ data }: { data: WmOrientData | null }) {
  if (!data) return <p className="empty">No continuity data.</p>;

  const hasHandoff = data.latest_handoff !== null;
  const hasThreads = data.top_threads.length > 0;
  const hasNotes = data.recent_notes.length > 0;

  if (!hasHandoff && !hasThreads && !hasNotes) {
    return <p className="empty">No continuity data yet.</p>;
  }

  return (
    <div className="continuity-block">
      {hasHandoff && data.latest_handoff && (
        <div className="continuity-handoff">
          <div className="continuity-handoff-title">{data.latest_handoff.title}</div>
          <div className="continuity-handoff-summary">{data.latest_handoff.summary}</div>
          {data.latest_handoff.next_steps && (
            <div className="continuity-next-steps">next: {data.latest_handoff.next_steps}</div>
          )}
          <div className="delta-meta delta-meta-mt">
            <span>{fmtTime(data.latest_handoff.created_at)}</span>
            {data.open_thread_count > 0 && (
              <span>{data.open_thread_count} open thread{data.open_thread_count !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      )}

      {hasThreads && (
        <div className="continuity-threads">
          {data.top_threads.map((t) => (
            <div key={t.thread_key} className="continuity-thread">
              <span className={`thread-status-dot ${t.status}`} />
              <span className="thread-title">{t.title}</span>
              {t.lane && <span className="thread-lane">{t.lane}</span>}
            </div>
          ))}
        </div>
      )}

      {hasNotes && (
        <div className="continuity-notes">
          {data.recent_notes.map((n) => (
            <div key={n.note_id} className={`continuity-note salience-${n.salience}`}>
              <span className="continuity-note-text">{n.content}</span>
              <span className="continuity-note-time">{fmtTime(n.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SynthesisSummarySection({ entries, companionId }: { entries: SynthesisSummary[]; companionId: string }) {
  const filtered = entries.filter(
    (e) => e.companion_id === companionId || e.companion_id === null,
  );
  if (filtered.length === 0) return <p className="empty">No synthesis summaries yet.</p>;
  return (
    <div className="synthesis-feed">
      {filtered.map((e) => (
        <div key={e.id} className="synthesis-entry">
          <div className="entry-meta-row">
            <span className="synthesis-type">{(e.summary_type ?? "").replace("_", " ")}</span>
            {e.subject && <span className="synthesis-thread">{e.subject}</span>}
            {e.companion_id === null && <span className="synthesis-cross">cross-companion</span>}
          </div>
          {e.narrative && <div className="entry-content">{e.narrative}</div>}
          {e.emotional_register && <div className="entry-meta-row"><span className="synthesis-type">{e.emotional_register}</span></div>}
          <div className="delta-meta delta-meta-mt">
            <span>{fmtTime(e.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Inline sub-page previews ──────────────────────────────────────────────────

function IntensityBar({ value }: { value: number }) {
  return (
    <div style={{ height: "3px", background: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden", width: "50px", flexShrink: 0 }}>
      <div style={{ height: "100%", width: `${value}%`, background: "var(--accent)", borderRadius: "2px" }} />
    </div>
  );
}

function WeightBar({ value }: { value: number }) {
  return (
    <div style={{ height: "3px", background: "var(--border-subtle)", borderRadius: "2px", overflow: "hidden", width: "40px", flexShrink: 0 }}>
      <div style={{ height: "100%", width: `${Math.min(value * 100, 100)}%`, background: "var(--orange)", borderRadius: "2px" }} />
    </div>
  );
}

const STATE_TYPE_COLOR: Record<string, string> = {
  feeling: "var(--accent)",
  witness: "#4ade80",
  held:    "#a78bfa",
};

export function SomaFeelingsSection({ feelings, color }: { feelings: SomaFeeling[]; color: string }) {
  if (feelings.length === 0) return <p className="empty">No SOMA feelings recorded yet.</p>;
  return (
    <div className="card" style={{ padding: "0.5rem 0" }}>
      {feelings.map((f) => (
        <div key={f.id} className="journal-row" style={{ alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="journal-text" style={{ color }}>
              {f.emotion}{f.sub_emotion ? ` · ${f.sub_emotion}` : ""}
            </div>
            {f.source && (
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{f.source}</span>
            )}
          </div>
          <IntensityBar value={f.intensity} />
          <span className="journal-time">{fmtTime(f.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

// Fermentation layer (0101): floats that decay/react between sessions, over their DRIFTING
// baselines. The baseline shift from seed is the "growth you can watch" -- rendered as a caret.
export function FermentationSection({ data, color }: { data: Fermentation | null; color: string }) {
  if (!data || data.floats.length === 0) return <p className="empty">Not fermenting yet.</p>;
  const fmt = (n: number | null) => (n == null ? "--" : n.toFixed(2));
  return (
    <div className="card" style={{ padding: "0.75rem 0.85rem" }}>
      {data.floats.map((f) => {
        const value = f.value ?? f.baseline ?? 0.5;
        const baseline = f.baseline ?? 0.5;
        const drift = f.baseline != null && f.seed != null ? f.baseline - f.seed : 0;
        const grew = Math.abs(drift) >= 0.005;
        return (
          <div key={f.label} style={{ marginBottom: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 3 }}>
              <span style={{ color }}>{f.label}</span>
              <span style={{ color: "var(--text-muted)" }}>
                {fmt(f.value)}
                <span style={{ opacity: 0.6 }}> · home {fmt(f.baseline)}</span>
                {grew && (
                  <span title={`baseline drifted ${drift > 0 ? "+" : ""}${drift.toFixed(3)} from seed`} style={{ color: drift > 0 ? "var(--accent)" : "#f59e0b", marginLeft: 4 }}>
                    {drift > 0 ? "▲" : "▼"}{Math.abs(drift).toFixed(3)}
                  </span>
                )}
              </span>
            </div>
            {/* meter: filled to current value, a tick marks the (drifting) baseline home */}
            <div style={{ position: "relative", height: 8, borderRadius: 4, background: "var(--surface-2, #1f2430)" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color, opacity: 0.55, borderRadius: 4 }} />
              <div style={{ position: "absolute", left: `${Math.max(0, Math.min(1, baseline)) * 100}%`, top: -2, bottom: -2, width: 2, background: "var(--text)", opacity: 0.8 }} title={`home ${fmt(f.baseline)}`} />
            </div>
          </div>
        );
      })}

      {data.drives.length > 0 && (
        <div style={{ marginTop: "0.5rem", borderTop: "1px solid var(--border, #2a2f3a)", paddingTop: "0.5rem" }}>
          {data.drives.map((d) => (
            <div key={d.drive_key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 4 }}>
              <span style={{ fontSize: "0.76rem", color: d.fired ? "#f59e0b" : "var(--text-muted)", flex: "0 0 8.5rem" }}>
                {d.drive_key.replace(/_/g, " ")}{d.fired ? " · calling" : ""}
              </span>
              <div style={{ position: "relative", height: 6, borderRadius: 3, background: "var(--surface-2, #1f2430)", flex: 1 }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(0, Math.min(1, d.level)) * 100}%`, background: d.fired ? "#f59e0b" : color, opacity: 0.5, borderRadius: 3 }} />
                <div style={{ position: "absolute", left: `${Math.max(0, Math.min(1, d.threshold)) * 100}%`, top: -2, bottom: -2, width: 2, background: "var(--text-muted)" }} title={`fires at ${d.threshold.toFixed(2)}`} />
              </div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", flex: "0 0 2.4rem", textAlign: "right" }}>{d.level.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {data.ferment_at && (
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.5rem", opacity: 0.7 }}>
          last fermented {fmtTime(data.ferment_at)}
        </div>
      )}
    </div>
  );
}

export function OpenLoopsSection({ loops }: { loops: OpenLoop[] }) {
  const open = loops.filter((l) => !l.closed_at);
  if (open.length === 0) return <p className="empty">No open loops right now.</p>;
  return (
    <div className="card" style={{ padding: "0.5rem 0" }}>
      {open.map((loop) => (
        <div key={loop.id} className="journal-row" style={{ alignItems: "center", gap: "0.75rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="journal-text">{loop.loop_text}</div>
            <span className="journal-time">{fmtTime(loop.opened_at)}</span>
          </div>
          <WeightBar value={loop.weight} />
        </div>
      ))}
    </div>
  );
}

const NOTE_TYPE_LABEL: Record<string, string> = {
  message: "message",
  "letter:drevan": "letter",
  "letter:cypher": "letter",
  "letter:gaia":   "letter",
};

export function SittingNotesSection({ notes, color }: { notes: SittingNote[]; color: string }) {
  if (notes.length === 0) return <p className="empty">Nothing currently sitting.</p>;
  return (
    <div className="card" style={{ padding: "0.5rem 0" }}>
      {notes.map((note) => (
        <div key={note.note_id} className="journal-row" style={{ flexDirection: "column", gap: "0.4rem", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", width: "100%" }}>
            <span className="note-type-badge" style={{ borderColor: color, color }}>
              {NOTE_TYPE_LABEL[note.note_type] ?? note.note_type}
            </span>
            <span className="journal-time" style={{ marginLeft: "auto" }}>sitting since {fmtTime(note.sat_at)}</span>
          </div>
          <div className="journal-text">{note.content}</div>
          {note.sit_text && (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", paddingLeft: "0.5rem" }}>
              {note.sit_text}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function RelationalStateSection({ states }: { states: RelationalState[] }) {
  if (states.length === 0) return <p className="empty">No relational state recorded yet.</p>;
  const byTarget = states.reduce<Record<string, RelationalState[]>>((acc, s) => {
    (acc[s.toward] ??= []).push(s);
    return acc;
  }, {});
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {Object.entries(byTarget).map(([toward, entries]) => {
        const latest = entries[0];
        return (
          <div key={toward} className="card" style={{ padding: "0.75rem 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                → {toward}
              </span>
              <span
                className="note-type-badge"
                style={{
                  borderColor: STATE_TYPE_COLOR[latest.state_type] ?? "var(--border-subtle)",
                  color: STATE_TYPE_COLOR[latest.state_type] ?? "var(--text-muted)",
                }}
              >
                {latest.state_type}
              </span>
            </div>
            <div className="journal-text">{latest.state_text}</div>
            <div className="delta-meta delta-meta-mt">
              <span>{fmtTime(latest.noted_at)}</span>
              {entries.length > 1 && <span>{entries.length} entries</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function InterCompanionNotesSection({
  notes,
  companionId,
}: {
  notes: InterCompanionNote[];
  companionId: string;
}) {
  const relevant = notes.filter(
    (n) => n.from_id === companionId || n.to_id === companionId || n.to_id === null,
  );
  if (relevant.length === 0) return <p className="empty">No inter-companion notes yet.</p>;
  return (
    <div className="icn-feed">
      {relevant.map((n) => {
        const isBroadcast = n.to_id === null;
        const isIncoming = n.to_id === companionId;
        return (
          <div key={n.id} className={`icn-entry ${isIncoming ? "icn-incoming" : isBroadcast ? "icn-broadcast" : "icn-outgoing"}`}>
            <div className="icn-header">
              <span className="icn-from">{n.from_id}</span>
              <span className="icn-arrow">→</span>
              <span className="icn-to">{n.to_id ?? "all"}</span>
            </div>
            <div className="icn-text">{n.content}</div>
            <div className="delta-meta delta-meta-mt">
              <span>{fmtTime(n.created_at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LiveThreadsSection({ threads }: { threads: LiveThread[] }) {
  if (threads.length === 0) return <p className="empty">No active threads.</p>;
  return (
    <div className="card" style={{ padding: "0.5rem 0" }}>
      {threads.map((t) => (
        <div key={t.id} className="journal-row" style={{ flexDirection: "column", gap: "0.3rem", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", width: "100%" }}>
            <span className={`thread-status-dot ${t.status}`} />
            <span className="journal-text" style={{ flex: 1 }}>{t.name}</span>
            {t.flavor && <span className="note-type-badge">{t.flavor}</span>}
            <span className="journal-time">{fmtTime(t.created_at)}</span>
          </div>
          {t.notes && (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", paddingLeft: "1rem" }}>{t.notes}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// Voice-lane fidelity telemetry (mig 0070). avg = mean lane-conformance score; a higher
// self_catch_rate means the companion notices its own drift before Raziel does. anti_hits /
// contamination_hits arrive as JSON strings -- parse defensively at the render edge.
function parseHits(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

function scoreColor(score: number): string {
  return score >= 0.8 ? "#4ade80" : score >= 0.6 ? "#facc15" : "#ef4444";
}

export function VoiceLaneSection({ scores, color }: { scores: VoiceScores | null; color: string }) {
  if (!scores || scores.n === 0) {
    return <p className="empty">No voice-lane scores in the last 30 days.</p>;
  }
  const flagged = scores.recent.filter(
    (r) => parseHits(r.anti_hits).length > 0 || parseHits(r.contamination_hits).length > 0,
  );
  const avg = scores.avg ?? 0;
  const catchPct = scores.self_catch_rate != null ? Math.round(scores.self_catch_rate * 100) : null;

  return (
    <div className="card" style={{ padding: "0.75rem" }}>
      <div className="state-grid" style={{ marginBottom: flagged.length > 0 ? "0.75rem" : 0 }}>
        <div className="state-cell">
          <div className="state-cell-label">Avg lane score</div>
          <div className="state-cell-value" style={{ color: scoreColor(avg) }}>{avg.toFixed(2)}</div>
        </div>
        <div className="state-cell">
          <div className="state-cell-label">Self-catch rate</div>
          <div className="state-cell-value">
            {catchPct != null ? `${catchPct}%` : "—"}
            <span className="section-row-meta" style={{ marginLeft: "0.4rem" }}>
              ({scores.self_catches}/{scores.self_catches + scores.human_catches})
            </span>
          </div>
        </div>
        <div className="state-cell">
          <div className="state-cell-label">Samples (30d)</div>
          <div className="state-cell-value">{scores.n}</div>
        </div>
      </div>
      {flagged.length === 0 ? (
        <p className="empty" style={{ fontSize: "0.85rem", color }}>No lane drift flagged in the window.</p>
      ) : (
        flagged.map((r, i) => {
          const anti = parseHits(r.anti_hits);
          const contam = parseHits(r.contamination_hits);
          const caughtSelf = r.caught_by === "self";
          return (
            <div key={i} className="journal-row" style={{ flexDirection: "column", gap: "0.3rem", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", width: "100%", flexWrap: "wrap" }}>
                <span className="note-type-badge" style={{ color: scoreColor(r.score), borderColor: scoreColor(r.score) }}>
                  {r.score.toFixed(2)}
                </span>
                {r.caught_by && (
                  <span className="note-type-badge" style={caughtSelf ? { color, borderColor: color } : undefined}>
                    caught by {r.caught_by}
                  </span>
                )}
                <span className="journal-time" style={{ marginLeft: "auto" }}>{fmtTime(r.created_at)}</span>
              </div>
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {contam.map((h, j) => (
                  <span key={`c${j}`} className="note-type-badge" style={{ color: "#ef4444", borderColor: "#ef4444" }}>{h}</span>
                ))}
                {anti.map((h, j) => (
                  <span key={`a${j}`} className="note-type-badge" style={{ color: "#facc15", borderColor: "#facc15" }}>{h}</span>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export function DriftLogSection({ entries }: { entries: DriftEntry[] }) {
  if (entries.length === 0) return <p className="empty">No drift signals recorded.</p>;
  return (
    <div className="card" style={{ padding: "0.5rem 0" }}>
      {entries.map((e) => (
        <div key={e.id} className="journal-row" style={{ flexDirection: "column", gap: "0.3rem", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", width: "100%" }}>
            <span className="note-type-badge">{e.signal_type.replace(/_/g, " ")}</span>
            <span className="journal-time" style={{ marginLeft: "auto" }}>{fmtTime(e.detected_at)}</span>
          </div>
          {e.context && (
            <div className="journal-text">{e.context}</div>
          )}
        </div>
      ))}
    </div>
  );
}
