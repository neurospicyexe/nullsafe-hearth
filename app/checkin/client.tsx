"use client";

import { useState, useRef } from "react";

// ── UplinkForm ────────────────────────────────────────────────────────────────
// Posts spoon_count to /api/house and an optional mood note to /api/notes.
// Both endpoints already exist — no /api/routines needed.

export function UplinkFormClient({ initialSpoons }: { initialSpoons: number }) {
  const [spoons, setSpoons] = useState(initialSpoons);
  const [mood, setMood] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submit = async () => {
    setStatus("saving");
    setErrMsg("");

    try {
      // 1. Update spoon count on the house
      const houseRes = await fetch("/api/house", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spoon_count: spoons }),
      });

      if (!houseRes.ok) {
        const body = await houseRes.json().catch(() => ({}));
        throw new Error(body?.error ?? `House update failed: HTTP ${houseRes.status}`);
      }

      // 2. If there's a mood note, log it
      if (mood.trim()) {
        const noteRes = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: mood.trim(),
            note_type: "uplink",
          }),
        });

        if (!noteRes.ok) {
          const body = await noteRes.json().catch(() => ({}));
          throw new Error(body?.error ?? `Note failed: HTTP ${noteRes.status}`);
        }
      }

      setMood("");
      setStatus("ok");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Unknown error");
      setStatus("err");
    }
  };

  return (
    <div className="uplink-form">
      {status === "ok" && (
        <div className="form-success">Uplink sent. Spoons: {spoons}.</div>
      )}
      {status === "err" && (
        <div className="form-error">Failed: {errMsg}</div>
      )}

      <div className="form-field">
        <label className="form-label">Spoon count</label>
        <div className="slider-row">
          <input
            type="range"
            min={0}
            max={10}
            value={spoons}
            onChange={(e) => { setSpoons(Number(e.target.value)); if (status !== "idle") setStatus("idle"); }}
            className="form-input"
            style={{ padding: 0, cursor: "pointer" }}
          />
          <span className="kv-value" style={{ minWidth: "1.5rem", textAlign: "right" }}>{spoons}</span>
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Mood / note (optional)</label>
        <textarea
          className="form-textarea"
          rows={2}
          placeholder="How are you feeling right now?"
          value={mood}
          onChange={(e) => { setMood(e.target.value); if (status !== "idle") setStatus("idle"); }}
        />
      </div>

      <button
        className="submit-btn"
        onClick={submit}
        disabled={status === "saving"}
      >
        {status === "saving" ? "Sending…" : "Send Uplink"}
      </button>
    </div>
  );
}

// ── RoutineChecklistClient ────────────────────────────────────────────────────

const ROUTINES = ["meds", "water", "food", "movement"];

export function RoutineChecklistClient({
  completedToday,
}: {
  completedToday: string[];
}) {
  const [done, setDone] = useState<Set<string>>(new Set(completedToday));
  const [logging, setLogging] = useState<string | null>(null);

  const toggle = async (name: string) => {
    if (done.has(name)) return; // routines are append-only; can't un-check
    setLogging(name);

    try {
      await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routine_name: name }),
      });
      setDone((prev) => { const next = new Set(prev); next.add(name); return next; });
    } finally {
      setLogging(null);
    }
  };

  return (
    <div className="card">
      <div className="card-title">Today&rsquo;s Routines</div>
      <div className="routine-grid">
        {ROUTINES.map((r) => (
          <div key={r} className="routine-pip-row">
            <button
              className={`routine-pip${done.has(r) ? " done" : ""}${logging === r ? " loading" : ""}`}
              onClick={() => toggle(r)}
              disabled={done.has(r) || logging === r}
            >
              {done.has(r) ? "✓" : logging === r ? "…" : "○"}
            </button>
            <span className="kv-label">{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
