"use client";

// The ONE state-logging surface (2026-07-02 AuDHD overhaul).
// Replaces the three stacked check-in forms (routine pips / UplinkForm / BiometricForm)
// that captured overlapping state into three shapes. Two write paths remain:
//   events  → POST /api/routines   (append row per tap — meds AM+PM, water x5, all fine)
//   state   → POST /api/biometrics (append snapshot — log as many times a day as the day needs)
// Nothing here overwrites. Every log is a new timestamped row.

import { useState } from "react";

type RoutineRow = { routine_name: string; logged_at: string; notes: string | null };
type Snapshot = {
  recorded_at: string;
  mood?: string | null;
  spoons?: number | null;
  pain?: number | null;
  energy?: number | null;
  focus?: number | null;
  notes?: string | null;
};

const EVENT_CHIPS = ["meds", "water", "food", "movement"] as const;

const MOODS = ["great", "good", "okay", "low", "rough", "dissociating", "anxious", "floaty"];

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "midday";
  return "evening";
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Slider ────────────────────────────────────────────────────────────────────

function Slider({ label, max, value, onSet }: {
  label: string; max: number; value: number | null; onSet: (v: number | null) => void;
}) {
  return (
    <div className="form-field">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label className="form-label" style={{ marginBottom: 0 }}>{label}</label>
        {value !== null && (
          <button
            type="button"
            onClick={() => onSet(null)}
            style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "0.7rem", cursor: "pointer" }}
          >
            skip
          </button>
        )}
      </div>
      <div className="slider-row">
        <input
          type="range"
          min={0}
          max={max}
          value={value ?? 0}
          onChange={(e) => onSet(Number(e.target.value))}
        />
        <span className="slider-value" style={{ opacity: value === null ? 0.35 : 1 }}>
          {value ?? "–"}
        </span>
      </div>
    </div>
  );
}

// ── Event chips: tap = one appended row, always re-tappable ──────────────────

function EventChips({ initial }: { initial: RoutineRow[] }) {
  const [logged, setLogged] = useState<RoutineRow[]>(initial);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function logEvent(name: string, note?: string) {
    setBusy(name);
    setError(null);
    const noteText = note ?? timeOfDay();
    const res = await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routine_name: name, owner: "raziel", notes: noteText }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      setError(`couldn't log ${name} — try again`);
      return;
    }
    setLogged((prev) => [
      { routine_name: name, logged_at: new Date().toISOString(), notes: noteText },
      ...prev,
    ]);
  }

  const countsFor = (name: string) => logged.filter((r) => r.routine_name === name);

  return (
    <div className="card">
      <div className="card-title">
        Log an event
        <span className="pill" style={{ marginLeft: "auto", background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
          {logged.length} today
        </span>
      </div>
      <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: "0 0 0.75rem" }}>
        Tap as many times a day as it happens — morning meds and night meds are two taps.
      </p>
      <div className="routine-grid">
        {EVENT_CHIPS.map((name) => {
          const rows = countsFor(name);
          return (
            <button
              key={name}
              className={`routine-pip-row${rows.length > 0 ? " done" : ""}`}
              onClick={() => logEvent(name)}
              disabled={busy === name}
            >
              <span className="routine-pip" />
              <span className="routine-name">
                {name}
                {rows.length > 0 && (
                  <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.75rem" }}>
                    {" "}×{rows.length} · {rows.slice(0, 3).map((r) => hhmm(r.logged_at)).join(", ")}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = custom.trim();
          if (!name) return;
          setCustom("");
          void logEvent(name.toLowerCase());
        }}
        style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}
      >
        <input
          className="form-input"
          style={{ flex: 1 }}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="anything else — shower, stretch, snack…"
        />
        <button type="submit" className="submit-btn" style={{ whiteSpace: "nowrap" }} disabled={!custom.trim()}>
          log
        </button>
      </form>
      {error && <p style={{ color: "var(--red)", fontSize: "0.8rem", marginTop: "0.5rem" }}>{error}</p>}
    </div>
  );
}

// ── State snapshot: mood + spoons + pain/energy/focus, appended per submit ───

function StateSnapshot({ initialToday }: { initialToday: Snapshot[] }) {
  const [today, setToday] = useState<Snapshot[]>(initialToday);
  const [mood, setMood] = useState<string>("");
  const [customMood, setCustomMood] = useState("");
  const [spoons, setSpoons] = useState<number | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  // Collapsible hardware section (rarely hand-entered; kept out of the main flow)
  const [hrv, setHrv] = useState("");
  const [rhr, setRhr] = useState("");
  const [sleepH, setSleepH] = useState("");
  const [sleepQ, setSleepQ] = useState(""); // worker only accepts poor|fair|good|excellent
  const [steps, setSteps] = useState("");
  const [stress, setStress] = useState("");

  const effectiveMood = customMood.trim() || mood;
  const hasAnything =
    effectiveMood || spoons !== null || pain !== null || energy !== null ||
    focus !== null || notes.trim() || hrv || rhr || sleepH || sleepQ || steps || stress;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasAnything) return;
    setStatus("saving");
    const asNum = (s: string) => {
      const n = Number(s.trim());
      return s.trim() === "" || !Number.isFinite(n) ? null : n;
    };
    const body = {
      mood: effectiveMood || null,
      spoons, pain, energy, focus,
      notes: notes.trim() || null,
      hrv_resting: asNum(hrv),
      resting_hr: asNum(rhr),
      sleep_hours: asNum(sleepH),
      sleep_quality: sleepQ.trim() || null,
      steps: asNum(steps),
      stress_score: asNum(stress),
    };
    const res = await fetch("/api/biometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) {
      setStatus("error");
      return;
    }
    setToday((prev) => [
      { recorded_at: new Date().toISOString(), mood: body.mood, spoons, pain, energy, focus, notes: body.notes },
      ...prev,
    ]);
    // Reset the note but keep sliders where they were — the next log is usually a delta.
    setNotes("");
    setStatus("done");
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div className="card card-accent">
      <div className="card-title">
        How it is right now
        {today.length > 0 && (
          <span className="pill" style={{ marginLeft: "auto", background: "var(--surface2)", color: "var(--muted)", border: "1px solid var(--border)" }}>
            logged ×{today.length} today
          </span>
        )}
      </div>
      <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: "0 0 1rem" }}>
        Every submit is a new snapshot — log again whenever the state shifts. Skip anything; only what you set is saved.
      </p>

      <form onSubmit={submit} className="uplink-form">
        <div className="form-field">
          <label className="form-label">Mood</label>
          <div className="author-toggle" style={{ flexWrap: "wrap" }}>
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                className={`author-btn${mood === m && !customMood ? " active" : ""}`}
                onClick={() => { setMood(mood === m ? "" : m); setCustomMood(""); }}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            className="form-input"
            style={{ marginTop: "0.5rem" }}
            value={customMood}
            onChange={(e) => setCustomMood(e.target.value)}
            placeholder="…or your own word for it"
          />
        </div>

        <Slider label="Spoons" max={12} value={spoons} onSet={setSpoons} />
        <Slider label="Pain" max={10} value={pain} onSet={setPain} />
        <Slider label="Energy" max={10} value={energy} onSet={setEnergy} />
        <Slider label="Focus" max={10} value={focus} onSet={setFocus} />

        <div className="form-field">
          <label className="form-label">Note (optional)</label>
          <textarea
            className="form-textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="body state, mental state, what changed…"
          />
        </div>

        <details style={{ marginBottom: "1rem" }}>
          <summary style={{ cursor: "pointer", fontSize: "0.78rem", color: "var(--muted)" }}>
            hardware numbers (HRV, sleep, steps…)
          </summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem", marginTop: "0.75rem" }}>
            {([
              ["HRV (resting)", hrv, setHrv], ["Resting HR", rhr, setRhr],
              ["Sleep hours", sleepH, setSleepH],
              ["Steps", steps, setSteps], ["Stress score", stress, setStress],
            ] as Array<[string, string, (v: string) => void]>).map(([label, val, set]) => (
              <div key={label} className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.7rem" }}>{label}</label>
                <input className="form-input" value={val} onChange={(e) => set(e.target.value)} inputMode="decimal" />
              </div>
            ))}
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "0.7rem" }}>Sleep quality</label>
              <select className="form-select" value={sleepQ} onChange={(e) => setSleepQ(e.target.value)}>
                <option value="">—</option>
                {["poor", "fair", "good", "excellent"].map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
          </div>
        </details>

        <button type="submit" className="submit-btn" disabled={status === "saving" || !hasAnything}>
          {status === "saving" ? "Saving…" : status === "done" ? "Logged ✓" : "Log state"}
        </button>
        {status === "error" && (
          <p style={{ color: "var(--red)", fontSize: "0.82rem", marginTop: "0.5rem" }}>Failed to save — try again.</p>
        )}
      </form>

      {today.length > 0 && (
        <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.4rem" }}>today so far</div>
          {today.slice(0, 6).map((s, i) => (
            <div key={i} style={{ fontSize: "0.8rem", color: "var(--muted)", padding: "0.15rem 0" }}>
              <span style={{ color: "var(--text-main)" }}>{hhmm(s.recorded_at)}</span>
              {s.mood ? ` · ${s.mood}` : ""}
              {s.spoons !== null && s.spoons !== undefined ? ` · ${s.spoons} spoons` : ""}
              {s.pain !== null && s.pain !== undefined ? ` · pain ${s.pain}` : ""}
              {s.energy !== null && s.energy !== undefined ? ` · energy ${s.energy}` : ""}
              {s.focus !== null && s.focus !== undefined ? ` · focus ${s.focus}` : ""}
              {s.notes ? ` — ${s.notes.slice(0, 60)}` : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── The surface ───────────────────────────────────────────────────────────────

export default function StateLogger({
  todayRoutines,
  todaySnapshots,
}: {
  todayRoutines: RoutineRow[];
  todaySnapshots: Snapshot[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <EventChips initial={todayRoutines} />
      <StateSnapshot initialToday={todaySnapshots} />
    </div>
  );
}
