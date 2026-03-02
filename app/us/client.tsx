"use client";

import { useState, useEffect, useCallback } from "react";
import type { BridgeData } from "@/lib/halseth";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BridgeStatusCard({
  sharing,
  onToggle,
}: {
  sharing: BridgeData["sharing"];
  onToggle: (category: "tasks" | "events" | "lists", enabled: boolean) => void;
}) {
  return (
    <div className="card">
      <div className="card-title">Bridge Sharing</div>
      <div className="kv-grid">
        {(["tasks", "events", "lists"] as const).map((cat) => (
          <>
            <span key={`${cat}-l`} className="kv-label">{cat}</span>
            <span key={`${cat}-v`} className="kv-value">
              <button
                className={`pill ${sharing[cat] ? "open" : "closed"}`}
                style={{ cursor: "pointer", border: "none", background: "transparent" }}
                onClick={() => onToggle(cat, !sharing[cat])}
              >
                {sharing[cat] ? "sharing" : "private"}
              </button>
            </span>
          </>
        ))}
      </div>
    </div>
  );
}

function SharedTasksCard({
  tasks,
  onAct,
}: {
  tasks: BridgeData["tasks"];
  onAct: (id: string, status: "open" | "in_progress" | "done") => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <div className="card">
      <div className="card-title">Partner Tasks</div>
      <div className="task-list">
        {tasks.map((t) => (
          <div key={t.id} className="shared-item-row">
            <input
              type="checkbox"
              className="shared-checkbox"
              checked={t.status === "done"}
              onChange={(e) => onAct(t.id, e.target.checked ? "done" : "open")}
            />
            <span className={`task-title${t.status === "done" ? " done" : ""}`}>{t.title}</span>
            <span className={`priority-badge ${t.priority}`}>{t.priority}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SharedEventsCard({ events }: { events: BridgeData["events"] }) {
  if (events.length === 0) return null;
  return (
    <div className="card">
      <div className="card-title">Partner Events</div>
      <div className="task-list">
        {events.map((e) => (
          <div key={e.id} className="task-row">
            <span className="task-title">{e.title}</span>
            <span className="task-due">{formatTime(e.start_time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SharedListsCard({
  lists,
  onComplete,
}: {
  lists: BridgeData["lists"];
  onComplete: (id: string) => void;
}) {
  if (lists.length === 0) return null;

  // Group by list_name
  const grouped = lists.reduce<Record<string, BridgeData["lists"]>>((acc, item) => {
    (acc[item.list_name] ??= []).push(item);
    return acc;
  }, {});

  return (
    <>
      {Object.entries(grouped).map(([listName, items]) => (
        <div key={listName} className="card">
          <div className="card-title">{listName}</div>
          <div className="task-list">
            {items.map((item) => (
              <div key={item.id} className="shared-item-row">
                <input
                  type="checkbox"
                  className="shared-checkbox"
                  checked={item.completed}
                  disabled={item.completed}
                  onChange={() => onComplete(item.id)}
                />
                <span className={`task-title${item.completed ? " done" : ""}`}>{item.item_text}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// ── Main client component ────────────────────────────────────────────────────

export default function UsClient({ initial }: { initial: BridgeData }) {
  const [data, setData] = useState<BridgeData>(initial);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/bridge");
    if (res.ok) setData(await res.json());
  }, []);

  const toggleSharing = async (category: "tasks" | "events" | "lists", enabled: boolean) => {
    setBusy(true);
    await fetch("/api/bridge/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, enabled }),
    });
    await refresh();
    setBusy(false);
  };

  const actOnTask = async (id: string, status: "open" | "in_progress" | "done") => {
    setBusy(true);
    await fetch("/api/bridge/act", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "task_status", id, status }),
    });
    await refresh();
    setBusy(false);
  };

  const completeListItem = async (id: string) => {
    setBusy(true);
    await fetch("/api/bridge/act", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_complete", id }),
    });
    await refresh();
    setBusy(false);
  };

  if (busy) {
    return (
      <div className="page">
        <p className="empty" style={{ textAlign: "center", paddingTop: "3rem" }}>Syncing…</p>
      </div>
    );
  }

  const hasAnything = data.tasks.length > 0 || data.events.length > 0 || data.lists.length > 0;

  return (
    <>
      <BridgeStatusCard sharing={data.sharing} onToggle={toggleSharing} />

      {!hasAnything && (
        <div className="card">
          <p className="empty">No shared items from partner yet.</p>
        </div>
      )}

      <SharedTasksCard tasks={data.tasks} onAct={actOnTask} />
      <SharedEventsCard events={data.events} />
      <SharedListsCard lists={data.lists} onComplete={completeListItem} />
    </>
  );
}
