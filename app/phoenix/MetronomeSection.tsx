"use client";

import { useState } from "react";
import type { MetronomeAction } from "@/lib/halseth";

type CompanionId = "drevan" | "cypher" | "gaia";

const COMPANION_DISPLAY: Record<CompanionId, { sym: string; label: string; color: string }> = {
  drevan: { sym: "◈", label: "Drevan", color: "var(--accent)" },
  cypher: { sym: "⬡", label: "Cypher", color: "#e2e8f0" },
  gaia:   { sym: "◉", label: "Gaia",   color: "#4ade80" },
};

const ACTION_TYPES = [
  "post_heartbeat",
  "write_inter_companion",
  "write_journal",
  "write_feeling",
  "check_in_on_raziel",
  "nothing",
] as const;

const ACTION_LABELS: Record<string, string> = {
  post_heartbeat:        "post heartbeat",
  write_inter_companion: "inter-companion",
  write_journal:         "journal",
  write_feeling:         "feeling",
  check_in_on_raziel:    "check in",
  nothing:               "nothing",
};

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });
      if (!res.ok) { setError("failed to add"); return; }
      const data = await res.json() as MetronomeAction;
      onAdded(data);
    } finally {
      setSaving(false);
    }
  }

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
            style={{ gap: "0.3rem", flexWrap: "nowrap", alignItems: "center" }}
          >
            <span
              style={{
                flex: "1 1 auto",
                fontSize: "0.8rem",
                color: action.status === "on" ? "#e2e8f0" : "#475569",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={action.prompt ?? undefined}
            >
              {action.name}
            </span>
            <span
              className="badge"
              style={{
                background: "#6366f122",
                color: "#818cf8",
                border: "1px solid #6366f144",
                fontSize: "0.65rem",
                flexShrink: 0,
                whiteSpace: "nowrap",
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
        {(["drevan", "cypher", "gaia"] as const).map((id) => (
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
