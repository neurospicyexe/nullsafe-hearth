"use client";

import { useState } from "react";

const ROUTINES = ["meds", "water", "food", "movement"] as const;
type RoutineName = (typeof ROUTINES)[number];

// ── Routine Status ────────────────────────────────────────────────────────────

export function RoutineStatusClient({
  initialRoutines,
}: {
  initialRoutines: Array<{ routine_name: string }>;
}) {
  const [done, setDone] = useState<Set<RoutineName>>(
    new Set(
      initialRoutines
        .map((r) => r.routine_name)
        .filter((n): n is RoutineName => (ROUTINES as readonly string[]).includes(n))
    )
  );

  async function markDone(routine: RoutineName) {
    if (done.has(routine)) return;
    setDone((prev) => new Set(Array.from(prev).concat(routine)));
    await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routine_name: routine }),
    });
  }

  return (
    <div className="card">
      <div className="card-title">Today&apos;s Routines</div>
      <div className="routine-grid">
        {ROUTINES.map((r) => (
          <button
            key={r}
            className={`routine-pip-row${done.has(r) ? " done" : ""}`}
            onClick={() => markDone(r)}
          >
            <span className="routine-pip" />
            <span className="routine-name">{r}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Uplink Form ───────────────────────────────────────────────────────────────

export function UplinkFormClient() {
  const [spoons, setSpoons] = useState(5);
  const [mood, setMood] = useState("okay");
  const [notes, setNotes] = useState("");
  const [sessionType, setSessionType] = useState<"checkin" | "hangout" | "work" | "ritual">("checkin");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  const packet = JSON.stringify(
    { spoons, mood, notes: notes || undefined, session_type: sessionType },
    null, 2
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routine_name: "uplink",
        notes: `spoons:${spoons} mood:${mood} type:${sessionType}${notes ? " — " + notes : ""}`,
      }),
    });
    if (res.ok) {
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="card card-accent">
      <div className="card-title">Uplink</div>
      <form onSubmit={submit} className="uplink-form">
        <div className="form-field">
          <label className="form-label">Session Type</label>
          <div className="author-toggle">
            {(["checkin", "hangout", "work", "ritual"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`author-btn${sessionType === t ? " active" : ""}`}
                onClick={() => setSessionType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Spoons ({spoons})</label>
          <div className="slider-row">
            <input
              type="range"
              min={0}
              max={10}
              value={spoons}
              onChange={(e) => setSpoons(Number(e.target.value))}
            />
            <span className="slider-value">{spoons}</span>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Mood</label>
          <select
            className="form-select"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
          >
            {["great", "good", "okay", "low", "rough", "dissociating", "anxious", "floaty"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="anything else?"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Packet Preview</label>
          <pre className="packet-preview">{packet}</pre>
        </div>

        <button type="submit" className="submit-btn" disabled={status === "saving"}>
          {status === "saving" ? "Sending…" : status === "done" ? "Sent ✓" : "Send Uplink"}
        </button>
        {status === "error" && (
          <p style={{ color: "var(--red)", fontSize: "0.82rem" }}>Failed. Try again.</p>
        )}
      </form>
    </div>
  );
}
