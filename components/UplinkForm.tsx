"use client";

import { useState } from "react";

const MEDS = [
  { id: "am_meds",    label: "AM meds" },
  { id: "pm_meds",    label: "PM meds" },
  { id: "prn",        label: "PRN" },
  { id: "vitamins",   label: "Vitamins" },
];

const PAIN_LABELS = ["0 — none", "2 — mild", "4 — moderate", "6 — bad", "8 — severe", "10 — crisis"];
const MOOD_LABELS = ["1 — very low", "3 — low", "5 — neutral", "7 — good", "9 — great", "10 — excellent"];
const BRAIN_FOG_LABELS = ["0 — clear", "2 — slight", "4 — moderate", "6 — heavy", "8 — severe", "10 — crash"];
const SPOON_LABELS = Array.from({ length: 11 }, (_, i) => `${i}`);

type State = {
  meds: Record<string, boolean>;
  pain: number;
  mood: number;
  brain_fog: number;
  spoons: number;
  notes: string;
};

const DEFAULT: State = {
  meds: Object.fromEntries(MEDS.map((m) => [m.id, false])),
  pain: 0,
  mood: 5,
  brain_fog: 0,
  spoons: 5,
  notes: "",
};

export default function UplinkForm() {
  const [state, setState] = useState<State>(DEFAULT);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function setNum(field: keyof Pick<State, "pain" | "mood" | "brain_fog" | "spoons">, val: number) {
    setState((s) => ({ ...s, [field]: val }));
  }

  function setMed(id: string, checked: boolean) {
    setState((s) => ({ ...s, meds: { ...s.meds, [id]: checked } }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");

    const taken = MEDS.filter((m) => state.meds[m.id]).map((m) => m.label);
    const noteLines = [
      `uplink check-in`,
      `meds: ${taken.length > 0 ? taken.join(", ") : "none logged"}`,
      `pain: ${state.pain}/10  mood: ${state.mood}/10  brain-fog: ${state.brain_fog}/10`,
      `spoons: ${state.spoons}/10`,
      state.notes ? `notes: ${state.notes}` : null,
    ].filter(Boolean).join("\n");

    try {
      const res = await fetch("/api/uplink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spoon_count: state.spoons,
          note: noteLines,
        }),
      });

      if (!res.ok) throw new Error(`${res.status}`);
      setStatus("done");
      setState(DEFAULT);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "unknown error");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="uplink-success">
        Check-in logged.{" "}
        <button
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textDecoration: "underline", fontSize: "inherit", padding: 0 }}
          onClick={() => setStatus("idle")}
        >
          Log another
        </button>
      </div>
    );
  }

  return (
    <form className="uplink-form" onSubmit={submit}>

      {/* Meds */}
      <div className="uplink-section">
        <label className="uplink-label">Medications taken</label>
        <div className="meds-grid">
          {MEDS.map((m) => (
            <label key={m.id} className="med-check">
              <input
                type="checkbox"
                checked={state.meds[m.id]}
                onChange={(e) => setMed(m.id, e.target.checked)}
              />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      {/* Pain */}
      <div className="uplink-section">
        <label className="uplink-label">Pain — {state.pain}/10</label>
        <input
          type="range" min={0} max={10} step={1}
          value={state.pain}
          onChange={(e) => setNum("pain", Number(e.target.value))}
          className="uplink-slider"
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.2rem" }}>
          <span>none</span><span>crisis</span>
        </div>
      </div>

      {/* Mood */}
      <div className="uplink-section">
        <label className="uplink-label">Mood — {state.mood}/10</label>
        <input
          type="range" min={1} max={10} step={1}
          value={state.mood}
          onChange={(e) => setNum("mood", Number(e.target.value))}
          className="uplink-slider"
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.2rem" }}>
          <span>very low</span><span>excellent</span>
        </div>
      </div>

      {/* Brain fog */}
      <div className="uplink-section">
        <label className="uplink-label">Brain fog — {state.brain_fog}/10</label>
        <input
          type="range" min={0} max={10} step={1}
          value={state.brain_fog}
          onChange={(e) => setNum("brain_fog", Number(e.target.value))}
          className="uplink-slider"
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.2rem" }}>
          <span>clear</span><span>crash</span>
        </div>
      </div>

      {/* Spoons */}
      <div className="uplink-section">
        <label className="uplink-label">Spoons available — {state.spoons}/10</label>
        <input
          type="range" min={0} max={10} step={1}
          value={state.spoons}
          onChange={(e) => setNum("spoons", Number(e.target.value))}
          className="uplink-slider"
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.2rem" }}>
          <span>empty</span><span>full</span>
        </div>
      </div>

      {/* Free notes */}
      <div className="uplink-section">
        <label className="uplink-label">Notes (optional)</label>
        <textarea
          className="uplink-textarea"
          placeholder="anything else worth noting…"
          value={state.notes}
          onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
        />
      </div>

      {status === "error" && (
        <p style={{ color: "var(--red)", fontSize: "0.82rem" }}>Error: {errorMsg}</p>
      )}

      <button type="submit" className="uplink-submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Logging…" : "Log check-in"}
      </button>
    </form>
  );
}
