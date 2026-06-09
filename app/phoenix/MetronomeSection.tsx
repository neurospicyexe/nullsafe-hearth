"use client";

import { useState } from "react";
import type { MetronomeAction } from "@/lib/halseth";

type CompanionId = "drevan" | "cypher" | "gaia";

const COMPANION_DISPLAY: Record<CompanionId, { sym: string; label: string; color: string }> = {
  drevan: { sym: "◈", label: "Drevan", color: "var(--accent)" },
  cypher: { sym: "⬡", label: "Cypher", color: "#e2e8f0" },
  gaia:   { sym: "◉", label: "Gaia",   color: "#4ade80" },
};

const COMPANION_IDS = Object.keys(COMPANION_DISPLAY) as CompanionId[];

const ACTION_TYPES = [
  "post_heartbeat",
  "write_inter_companion",
  "write_journal",
  "write_feeling",
  "check_in_on_raziel",
  "ask_question",
  "offer_presence",
  "send_reminder",
  "share_observation",
  "nothing",
] as const;

const ACTION_LABELS: Record<string, string> = {
  post_heartbeat:        "heartbeat",
  write_inter_companion: "inter-companion",
  write_journal:         "journal",
  write_feeling:         "feeling",
  check_in_on_raziel:    "check in",
  ask_question:          "ask question",
  offer_presence:        "offer presence",
  send_reminder:         "reminder",
  share_observation:     "observation",
  nothing:               "nothing",
};

const inputStyle: React.CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "4px",
  padding: "0.25rem 0.5rem",
  color: "#e2e8f0",
  fontSize: "0.8rem",
  width: "100%",
  boxSizing: "border-box",
};

const halfInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: "calc(50% - 0.2rem)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  color: "#64748b",
  marginBottom: "0.1rem",
  display: "block",
};

function ConditionBadges({ action }: { action: MetronomeAction }) {
  const badges: { label: string; title: string }[] = [];

  if (action.silence_min_hours !== null || action.silence_max_hours !== null) {
    const min = action.silence_min_hours;
    const max = action.silence_max_hours;
    const label = min !== null && max !== null
      ? `${min}h–${max}h silence`
      : min !== null
        ? `${min}h+ silence`
        : `<${max!}h silence`;
    badges.push({ label, title: "silence window condition" });
  }

  if (action.max_per_day !== null) {
    badges.push({ label: `${action.max_per_day}x/day`, title: "max fires per day" });
  }

  if (action.cooldown_hours !== null) {
    badges.push({ label: `${action.cooldown_hours}h cooldown`, title: "cooldown between fires" });
  }

  if (action.requires_signal) {
    const lookback = action.signal_lookback_hours != null ? ` (${action.signal_lookback_hours}h)` : "";
    badges.push({ label: `signal: ${action.requires_signal}${lookback}`, title: "requires this signal in recent messages" });
  }

  if (action.last_fired_at) {
    const d = new Date(action.last_fired_at);
    const hoursAgo = ((Date.now() - d.getTime()) / 3_600_000).toFixed(1);
    badges.push({ label: `fired ${hoursAgo}h ago`, title: `last fired: ${d.toISOString()}` });
  }

  if (badges.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem", marginTop: "0.15rem" }}>
      {badges.map((b) => (
        <span
          key={b.label}
          title={b.title}
          style={{
            fontSize: "0.6rem",
            padding: "0.1rem 0.3rem",
            background: "#1e293b",
            color: "#64748b",
            border: "1px solid #334155",
            borderRadius: "3px",
            whiteSpace: "nowrap",
          }}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

function AddForm({
  companionId,
  onAdded,
  onCancel,
}: {
  companionId: CompanionId;
  onAdded: (action: MetronomeAction) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [actionType, setActionType] = useState("post_heartbeat");
  const [target, setTarget] = useState("");
  const [prompt, setPrompt] = useState("");
  const [quietHours, setQuietHours] = useState(false);
  // condition fields
  const [silenceMin, setSilenceMin] = useState("");
  const [silenceMax, setSilenceMax] = useState("");
  const [maxPerDay, setMaxPerDay] = useState("");
  const [cooldown, setCooldown] = useState("");
  const [requiresSignal, setRequiresSignal] = useState("");
  const [signalLookback, setSignalLookback] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseOptFloat(v: string): number | null {
    const n = parseFloat(v);
    return v.trim() !== "" && !isNaN(n) ? n : null;
  }
  function parseOptInt(v: string): number | null {
    const n = parseInt(v, 10);
    return v.trim() !== "" && !isNaN(n) ? n : null;
  }

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/metronome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companion_id: companionId,
          name: name.trim(),
          action_type: actionType,
          target: target.trim() || null,
          prompt: prompt.trim() || null,
          quiet_hours_allowed: quietHours ? 1 : 0,
          status: "on",
          silence_min_hours: parseOptFloat(silenceMin),
          silence_max_hours: parseOptFloat(silenceMax),
          max_per_day: parseOptInt(maxPerDay),
          cooldown_hours: parseOptFloat(cooldown),
          requires_signal: requiresSignal.trim() || null,
          signal_lookback_hours: parseOptFloat(signalLookback),
        }),
      });
      if (!res.ok) { setError("failed to add"); return; }
      const data = await res.json() as MetronomeAction;
      onAdded(data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        marginTop: "0.25rem",
        padding: "0.5rem",
        background: "#0f172a",
        borderRadius: "4px",
        border: "1px solid #334155",
      }}
    >
      <input
        placeholder="Action name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />
      <select
        value={actionType}
        onChange={(e) => setActionType(e.target.value)}
        style={inputStyle}
      >
        {ACTION_TYPES.map((t) => (
          <option key={t} value={t}>
            {ACTION_LABELS[t]}
          </option>
        ))}
      </select>
      {actionType === "write_inter_companion" && (
        <input
          placeholder="Target companion"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          style={inputStyle}
        />
      )}
      <textarea
        placeholder="Custom prompt (optional)"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        style={{ ...inputStyle, resize: "vertical" }}
      />

      <div
        style={{
          borderTop: "1px solid #1e293b",
          paddingTop: "0.4rem",
          marginTop: "0.1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
        }}
      >
        <span style={{ ...labelStyle, color: "#475569", fontSize: "0.68rem" }}>
          conditions (all optional)
        </span>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>silence min (h)</label>
            <input
              type="number"
              placeholder="e.g. 2"
              min="0"
              step="0.5"
              value={silenceMin}
              onChange={(e) => setSilenceMin(e.target.value)}
              style={halfInputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>silence max (h)</label>
            <input
              type="number"
              placeholder="e.g. 12"
              min="0"
              step="0.5"
              value={silenceMax}
              onChange={(e) => setSilenceMax(e.target.value)}
              style={halfInputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>max per day</label>
            <input
              type="number"
              placeholder="e.g. 1"
              min="1"
              step="1"
              value={maxPerDay}
              onChange={(e) => setMaxPerDay(e.target.value)}
              style={halfInputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>cooldown (h)</label>
            <input
              type="number"
              placeholder="e.g. 8"
              min="0"
              step="0.5"
              value={cooldown}
              onChange={(e) => setCooldown(e.target.value)}
              style={halfInputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>requires signal</label>
            <input
              placeholder="e.g. hyperfocus"
              value={requiresSignal}
              onChange={(e) => setRequiresSignal(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>lookback (h)</label>
            <input
              type="number"
              placeholder="2"
              min="0.5"
              step="0.5"
              value={signalLookback}
              onChange={(e) => setSignalLookback(e.target.value)}
              style={halfInputStyle}
            />
          </div>
        </div>
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.75rem",
          color: "#94a3b8",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={quietHours}
          onChange={(e) => setQuietHours(e.target.checked)}
        />
        allowed during quiet hours
      </label>
      {error && (
        <span style={{ fontSize: "0.75rem", color: "#ef4444" }}>{error}</span>
      )}
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button
          onClick={submit}
          disabled={saving || !name.trim()}
          style={{
            padding: "0.25rem 0.6rem",
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontSize: "0.78rem",
            cursor: saving || !name.trim() ? "not-allowed" : "pointer",
            opacity: saving || !name.trim() ? 0.5 : 1,
          }}
        >
          {saving ? "adding…" : "add"}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "0.25rem 0.6rem",
            background: "transparent",
            color: "#64748b",
            border: "1px solid #334155",
            borderRadius: "4px",
            fontSize: "0.78rem",
            cursor: "pointer",
          }}
        >
          cancel
        </button>
      </div>
    </div>
  );
}

function CompanionPalette({
  id,
  initialActions,
}: {
  id: CompanionId;
  initialActions: MetronomeAction[];
}) {
  const [actions, setActions] = useState(initialActions);
  const [showAdd, setShowAdd] = useState(false);
  const { sym, label, color } = COMPANION_DISPLAY[id];

  async function toggle(action: MetronomeAction) {
    const newStatus = action.status === "on" ? "off" : "on";
    const res = await fetch(`/api/metronome/${action.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companion_id: action.companion_id, status: newStatus }),
    });
    if (res.ok) {
      setActions((prev) =>
        prev.map((a) => (a.id === action.id ? { ...a, status: newStatus } : a)),
      );
    }
  }

  async function remove(action: MetronomeAction) {
    const res = await fetch(
      `/api/metronome/${action.id}?companion_id=${encodeURIComponent(action.companion_id)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setActions((prev) => prev.filter((a) => a.id !== action.id));
    }
  }

  function onAdded(action: MetronomeAction) {
    setActions((prev) => [...prev, action]);
    setShowAdd(false);
  }

  const activeCount = actions.filter((a) => a.status === "on").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.1rem",
        }}
      >
        <span style={{ color, fontWeight: 600, fontSize: "0.85rem" }}>
          {sym} {label}
        </span>
        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
          {activeCount}/{actions.length} on
        </span>
      </div>

      {actions.length === 0 ? (
        <p className="empty" style={{ margin: 0, fontSize: "0.8rem" }}>
          No actions configured
        </p>
      ) : (
        actions.map((action) => (
          <div
            key={action.id}
            className="section-row"
            style={{ gap: "0.3rem", flexWrap: "wrap", alignItems: "flex-start" }}
          >
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: action.status === "on" ? "#e2e8f0" : "#475569",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                }}
                title={action.prompt ?? undefined}
              >
                {action.name}
              </span>
              <ConditionBadges action={action} />
            </div>
            <span
              className="badge"
              style={{
                background: "#6366f122",
                color: "#818cf8",
                border: "1px solid #6366f144",
                fontSize: "0.65rem",
                flexShrink: 0,
                whiteSpace: "nowrap",
                alignSelf: "center",
              }}
            >
              {ACTION_LABELS[action.action_type] ?? action.action_type}
            </span>
            <button
              onClick={() => toggle(action)}
              title={action.status === "on" ? "disable" : "enable"}
              style={{
                padding: "0.1rem 0.35rem",
                fontSize: "0.65rem",
                background:
                  action.status === "on" ? "#22c55e18" : "#64748b18",
                color: action.status === "on" ? "#22c55e" : "#64748b",
                border: `1px solid ${action.status === "on" ? "#22c55e44" : "#64748b44"}`,
                borderRadius: "3px",
                cursor: "pointer",
                flexShrink: 0,
                alignSelf: "center",
              }}
            >
              {action.status}
            </button>
            <button
              onClick={() => remove(action)}
              title="delete"
              style={{
                padding: "0.1rem 0.3rem",
                fontSize: "0.65rem",
                background: "#ef444410",
                color: "#ef4444",
                border: "1px solid #ef444430",
                borderRadius: "3px",
                cursor: "pointer",
                flexShrink: 0,
                alignSelf: "center",
              }}
            >
              ×
            </button>
          </div>
        ))
      )}

      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            marginTop: "0.15rem",
            padding: "0.15rem 0.4rem",
            fontSize: "0.72rem",
            background: "transparent",
            color: "#475569",
            border: "1px solid #1e293b",
            borderRadius: "3px",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          + add action
        </button>
      ) : (
        <AddForm
          companionId={id}
          onAdded={onAdded}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

export function MetronomeSection({
  actionsMap,
}: {
  actionsMap: Record<CompanionId, MetronomeAction[]>;
}) {
  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <span
        className="home-section-title"
        style={{ display: "block", marginBottom: "0.75rem" }}
      >
        Metronome Palette
        <span
          style={{
            marginLeft: "0.5rem",
            color: "#475569",
            fontWeight: 400,
            fontSize: "0.78rem",
          }}
        >
          actions companions pick from when the heartbeat cron fires
        </span>
      </span>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {COMPANION_IDS.map((id) => (
          <CompanionPalette
            key={id}
            id={id}
            initialActions={actionsMap[id]}
          />
        ))}
      </div>
    </div>
  );
}
