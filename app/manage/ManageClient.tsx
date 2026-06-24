"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MetronomeAction, AutonomySeed, GrowthJournalEntry } from "@/lib/halseth";

export type CompanionBundle = {
  id: string;
  actions: MetronomeAction[];
  seeds: AutonomySeed[];
  journal: GrowthJournalEntry[];
};

const COMPANION_COLOR: Record<string, string> = {
  cypher: "#e2e8f0",
  drevan: "#6366f1",
  gaia: "#4ade80",
};
const COMPANION_LABEL: Record<string, string> = { cypher: "Cypher", drevan: "Drevan", gaia: "Gaia" };

const ACTION_TYPES = [
  "post_heartbeat", "write_inter_companion", "write_journal", "write_feeling",
  "check_in_on_raziel", "nothing", "ask_question", "offer_presence",
  "send_reminder", "share_observation", "name_pattern", "write_note_to_raziel",
] as const;

const SEED_TYPES = ["topic", "question", "reflection_prompt"] as const;

type Tab = "metronome" | "seeds" | "journal";

export default function ManageClient({ bundles }: { bundles: CompanionBundle[] }) {
  const router = useRouter();
  const [companion, setCompanion] = useState(bundles[0]?.id ?? "cypher");
  const [tab, setTab] = useState<Tab>("metronome");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const bundle = bundles.find((b) => b.id === companion) ?? bundles[0];
  const color = COMPANION_COLOR[companion] ?? "#e2e8f0";

  // Single mutation path: call a proxy, surface errors, refresh server data on success.
  async function mut(url: string, method: string, body?: unknown): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method,
        ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: (data as { error?: string }).error ?? `failed (${res.status})` });
        return false;
      }
      setMsg({ kind: "ok", text: "done" });
      router.refresh();
      return true;
    } catch {
      setMsg({ kind: "err", text: "network error" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-companion={companion}>
      {/* Companion selector */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {bundles.map((b) => {
          const active = b.id === companion;
          const c = COMPANION_COLOR[b.id];
          return (
            <button
              key={b.id}
              onClick={() => { setCompanion(b.id); setMsg(null); }}
              className="manage-pill"
              style={{
                borderColor: active ? c : "var(--border)",
                color: active ? c : "var(--text-muted)",
                background: active ? `${c}1a` : "transparent",
              }}
            >
              {COMPANION_LABEL[b.id] ?? b.id}
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="manage-tabs">
        {(["metronome", "seeds", "journal"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setMsg(null); }}
            className={`manage-tab ${tab === t ? "active" : ""}`}
            style={tab === t ? { borderColor: color, color } : undefined}
          >
            {t === "metronome" ? "Metronome" : t === "seeds" ? "Seeds" : "Journal"}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`manage-msg ${msg.kind}`} role="status">{msg.text}</div>
      )}

      <div style={{ marginTop: "1rem" }}>
        {tab === "metronome" && <MetronomeTab bundle={bundle} color={color} busy={busy} mut={mut} />}
        {tab === "seeds" && <SeedsTab bundle={bundle} color={color} busy={busy} mut={mut} />}
        {tab === "journal" && <JournalTab bundle={bundle} color={color} busy={busy} mut={mut} />}
      </div>
    </div>
  );
}

type MutFn = (url: string, method: string, body?: unknown) => Promise<boolean>;

// ── Metronome ─────────────────────────────────────────────────────────────────

function MetronomeTab({ bundle, color, busy, mut }: { bundle: CompanionBundle; color: string; busy: boolean; mut: MutFn }) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <section>
      <div className="section-header">
        <h2 className="section-title section-title-flush">Heartbeat Actions ({bundle.actions.length})</h2>
        <button className="home-section-link" onClick={() => setAdding((v) => !v)}>{adding ? "cancel" : "+ add"}</button>
      </div>

      {adding && (
        <ActionForm
          companion={bundle.id}
          busy={busy}
          onDone={() => setAdding(false)}
          mut={mut}
        />
      )}

      {bundle.actions.length === 0 ? (
        <p className="empty">No metronome actions. Add one above.</p>
      ) : (
        <div className="section-list">
          {bundle.actions.map((a) => (
            <div key={a.id} className="card" style={{ padding: "0.6rem 0.75rem" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <span className="note-type-badge" style={{ color, borderColor: color }}>{a.action_type.replace(/_/g, " ")}</span>
                <strong style={{ fontSize: "0.92rem" }}>{a.name}</strong>
                <span className="badge" style={badgeStyle(a.status === "on" ? "#4ade80" : "#6b7280")}>{a.status}</span>
                {a.quiet_hours_allowed ? <span className="section-row-meta">quiet-ok</span> : null}
                {a.max_per_day != null ? <span className="section-row-meta">≤{a.max_per_day}/day</span> : null}
                <span style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
                  <button className="manage-btn" disabled={busy}
                    onClick={() => mut(`/api/metronome/${a.id}`, "PATCH", { companion_id: bundle.id, status: a.status === "on" ? "off" : "on" })}>
                    {a.status === "on" ? "turn off" : "turn on"}
                  </button>
                  <button className="manage-btn" disabled={busy} onClick={() => setEditId(editId === a.id ? null : a.id)}>edit</button>
                  <button className="manage-btn danger" disabled={busy}
                    onClick={() => { if (confirm(`Delete action "${a.name}"?`)) mut(`/api/metronome/${a.id}?companion_id=${bundle.id}`, "DELETE"); }}>
                    delete
                  </button>
                </span>
              </div>
              {a.prompt && editId !== a.id && <div className="journal-text" style={{ marginTop: "0.4rem" }}>{a.prompt}</div>}
              {editId === a.id && (
                <ActionForm
                  companion={bundle.id}
                  busy={busy}
                  existing={a}
                  onDone={() => setEditId(null)}
                  mut={mut}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ActionForm({
  companion, busy, existing, onDone, mut,
}: { companion: string; busy: boolean; existing?: MetronomeAction; onDone: () => void; mut: MutFn }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [actionType, setActionType] = useState<string>(existing?.action_type ?? "post_heartbeat");
  const [prompt, setPrompt] = useState(existing?.prompt ?? "");
  const [quiet, setQuiet] = useState(!!existing?.quiet_hours_allowed);
  const [maxPerDay, setMaxPerDay] = useState(existing?.max_per_day != null ? String(existing.max_per_day) : "");

  async function submit() {
    if (!name.trim()) return;
    const max = maxPerDay.trim() === "" ? null : Math.max(0, parseInt(maxPerDay, 10) || 0);
    const body = {
      companion_id: companion,
      name: name.trim(),
      action_type: actionType,
      prompt: prompt.trim() || undefined,
      quiet_hours_allowed: quiet ? 1 : 0,
      max_per_day: max,
    };
    const ok = existing
      ? await mut(`/api/metronome/${existing.id}`, "PATCH", body)
      : await mut(`/api/metronome`, "POST", body);
    if (ok) onDone();
  }

  return (
    <div className="manage-form">
      <input className="manage-input" placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
      <select className="manage-input" value={actionType} onChange={(e) => setActionType(e.target.value)}>
        {ACTION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
      </select>
      <textarea className="manage-input" placeholder="prompt (optional)" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <label className="manage-check">
        <input type="checkbox" checked={quiet} onChange={(e) => setQuiet(e.target.checked)} /> allow during quiet hours
      </label>
      <input className="manage-input" type="number" min={0} placeholder="max per day (blank = unlimited)" value={maxPerDay} onChange={(e) => setMaxPerDay(e.target.value)} />
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="manage-btn primary" disabled={busy || !name.trim()} onClick={submit}>{existing ? "save" : "create"}</button>
        <button className="manage-btn" disabled={busy} onClick={onDone}>cancel</button>
      </div>
    </div>
  );
}

// ── Seeds ─────────────────────────────────────────────────────────────────────

function SeedsTab({ bundle, color, busy, mut }: { bundle: CompanionBundle; color: string; busy: boolean; mut: MutFn }) {
  const [content, setContent] = useState("");
  const [seedType, setSeedType] = useState<string>("topic");

  async function add() {
    if (!content.trim()) return;
    const ok = await mut(`/api/mind/autonomy/seeds`, "POST", { companion_id: bundle.id, content: content.trim(), seed_type: seedType });
    if (ok) setContent("");
  }

  return (
    <section>
      <div className="manage-form">
        <textarea className="manage-input" placeholder="new seed — a topic, question, or reflection prompt" rows={2} value={content} onChange={(e) => setContent(e.target.value)} />
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select className="manage-input" style={{ flex: "0 0 auto" }} value={seedType} onChange={(e) => setSeedType(e.target.value)}>
            {SEED_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <button className="manage-btn primary" disabled={busy || !content.trim()} onClick={add}>add seed</button>
        </div>
      </div>

      {bundle.seeds.length === 0 ? (
        <p className="empty">No seeds.</p>
      ) : (
        <div className="section-list">
          {bundle.seeds.map((s) => {
            const used = s.used_at != null;
            return (
              <div key={s.id} className="card" style={{ padding: "0.55rem 0.75rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  <span className="note-type-badge" style={{ color, borderColor: color }}>{s.seed_type.replace(/_/g, " ")}</span>
                  <span className="section-row-meta">p{s.priority}</span>
                  <span className="badge" style={badgeStyle(used ? "#6b7280" : "#4ade80")}>{used ? "used" : "active"}</span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
                    {used && (
                      <button className="manage-btn" disabled={busy}
                        onClick={() => mut(`/api/mind/autonomy/seeds/${s.id}`, "PATCH", { action: "reenable" })}>
                        re-enable
                      </button>
                    )}
                    <button className="manage-btn danger" disabled={busy}
                      onClick={() => { if (confirm("Delete this seed?")) mut(`/api/mind/autonomy/seeds/${s.id}`, "DELETE"); }}>
                      delete
                    </button>
                  </span>
                </div>
                <div className="journal-text" style={{ marginTop: "0.35rem" }}>{s.content}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Journal ───────────────────────────────────────────────────────────────────

function JournalTab({ bundle, color, busy, mut }: { bundle: CompanionBundle; color: string; busy: boolean; mut: MutFn }) {
  if (bundle.journal.length === 0) return <p className="empty">No journal entries.</p>;
  return (
    <section className="section-list">
      {bundle.journal.map((e) => {
        const status = e.review_status ?? "pending";
        const statusColor = status === "accepted" ? "#4ade80" : status === "declined" ? "#ef4444" : "#facc15";
        const canon = status === "accepted";
        return (
          <div key={e.id} className="card" style={{ padding: "0.6rem 0.75rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <span className="note-type-badge" style={{ color, borderColor: color }}>{e.entry_type}</span>
              {e.source && <span className="section-row-meta">{e.source}</span>}
              <span className="badge" style={badgeStyle(statusColor)}>{canon ? "canon" : status}</span>
              <span className="journal-time" style={{ marginLeft: "auto" }}>{new Date(e.created_at).toLocaleDateString()}</span>
            </div>
            <div className="journal-text" style={{ marginTop: "0.4rem" }}>{e.content}</div>
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
              {status === "pending" && (
                <>
                  <button className="manage-btn" disabled={busy}
                    onClick={() => mut(`/api/mind/growth/journal/${e.id}/accept`, "PATCH", { companion_id: bundle.id })}>accept</button>
                  <button className="manage-btn" disabled={busy}
                    onClick={() => mut(`/api/mind/growth/journal/${e.id}/decline`, "PATCH", { companion_id: bundle.id })}>decline</button>
                </>
              )}
              {canon ? (
                <span className="section-row-meta" style={{ alignSelf: "center" }}>accepted canon — supersede, don&apos;t delete</span>
              ) : (
                <button className="manage-btn danger" disabled={busy}
                  onClick={() => { if (confirm("Permanently delete this entry?")) mut(`/api/mind/growth/journal/${e.id}?companion_id=${bundle.id}`, "DELETE"); }}>
                  delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function badgeStyle(c: string): React.CSSProperties {
  return { background: `${c}22`, color: c, border: `1px solid ${c}44` };
}
