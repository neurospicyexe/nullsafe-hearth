"use client";

import { useState } from "react";
import { type BridgeData } from "@/lib/halseth";

// ── Shared Goals ──────────────────────────────────────────────────────────────

export function SharedGoalsClient({ tasks }: { tasks: BridgeData["tasks"] }) {
  const [done, setDone] = useState<Set<string>>(
    new Set(tasks.filter((t) => t.status === "done").map((t) => t.id))
  );

  async function toggle(id: string) {
    const isDone = done.has(id);
    setDone((prev) => {
      const next = new Set(prev);
      isDone ? next.delete(id) : next.add(id);
      return next;
    });
    await fetch("/api/bridge/act", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "task_status", id, status: isDone ? "open" : "done" }),
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Shared Goals</div>
        <p className="empty">No shared tasks from partner.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">Shared Goals</div>
      <div className="task-list">
        {tasks.map((t) => (
          <div key={t.id} className="shared-item-row">
            <input
              type="checkbox"
              className="shared-checkbox"
              checked={done.has(t.id)}
              onChange={() => toggle(t.id)}
            />
            <span
              className="shared-item-title"
              style={{
                textDecoration: done.has(t.id) ? "line-through" : "none",
                opacity: done.has(t.id) ? 0.5 : 1,
              }}
            >
              {t.title}
            </span>
            <span className={`priority-badge ${t.priority}`}>{t.priority}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared Lists ──────────────────────────────────────────────────────────────

export function SharedListsClient({ lists }: { lists: BridgeData["lists"] }) {
  const [completed, setCompleted] = useState<Set<string>>(
    new Set(lists.filter((l) => l.completed).map((l) => l.id))
  );

  async function complete(id: string) {
    if (completed.has(id)) return;
    setCompleted((prev) => new Set(Array.from(prev).concat(id)));
    await fetch("/api/bridge/act", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_complete", id }),
    });
  }

  const grouped = lists.reduce<Record<string, BridgeData["lists"]>>((acc, item) => {
    (acc[item.list_name] ??= []).push(item);
    return acc;
  }, {});

  if (lists.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Shared Lists</div>
        <p className="empty">No shared list items from partner.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">Shared Lists</div>
      {Object.entries(grouped).map(([listName, items]) => (
        <div key={listName} style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>
            {listName}
          </div>
          {items.map((item) => (
            <div key={item.id} className="shared-item-row">
              <input
                type="checkbox"
                className="shared-checkbox"
                checked={completed.has(item.id)}
                onChange={() => complete(item.id)}
                disabled={completed.has(item.id)}
              />
              <span
                className="shared-item-title"
                style={{
                  textDecoration: completed.has(item.id) ? "line-through" : "none",
                  opacity: completed.has(item.id) ? 0.5 : 1,
                }}
              >
                {item.item_text}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Bridge Status ─────────────────────────────────────────────────────────────

type SharingState = { tasks: boolean; events: boolean; lists: boolean };

export function BridgeStatusClient({ sharing }: { sharing: SharingState }) {
  const [state, setState] = useState(sharing);
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(category: "tasks" | "events" | "lists") {
    const enabled = !state[category];
    setState((prev) => ({ ...prev, [category]: enabled }));
    setSaving(category);
    await fetch("/api/bridge/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, enabled }),
    });
    setSaving(null);
  }

  return (
    <div className="card">
      <div className="card-title">Your Sharing</div>
      <div className="task-list">
        {(["tasks", "events", "lists"] as const).map((cat) => (
          <div key={cat} className="task-row">
            <span className="task-title" style={{ textTransform: "capitalize" }}>{cat}</span>
            <button
              onClick={() => toggle(cat)}
              disabled={saving === cat}
              style={{
                background: state[cat] ? "rgba(107,191,130,0.15)" : "var(--surface2)",
                border: `1px solid ${state[cat] ? "var(--green)" : "var(--border)"}`,
                color: state[cat] ? "var(--green)" : "var(--muted)",
                borderRadius: "5px",
                fontSize: "0.72rem",
                fontWeight: 600,
                padding: "0.15rem 0.6rem",
                cursor: saving === cat ? "not-allowed" : "pointer",
                opacity: saving === cat ? 0.6 : 1,
              }}
            >
              {state[cat] ? "on" : "off"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
