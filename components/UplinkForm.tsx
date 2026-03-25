"use client";

import { useState } from "react";

type State = {
  pain: number;
  mood: number;
  brain_fog: number;
  spoons: number;
  notes: string;
};

const DEFAULT: State = { pain: 0, mood: 5, brain_fog: 0, spoons: 5, notes: "" };

function SliderField({
  label, value, min, max, lo, hi, onChange,
}: {
  label: string; value: number; min: number; max: number;
  lo: string; hi: string; onChange: (v: number) => void;
}) {
  return (
    <div className="form-field" style={{ marginBottom: 0 }}>
      <label className="form-label">{label} — {value}/10</label>
      <input
        type="range" min={min} max={max} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.25rem" }}>
        <span>{lo}</span><span>{hi}</span>
      </div>
    </div>
  );
}

export default function UplinkForm() {
  const [state, setState] = useState<State>(DEFAULT);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function setNum(field: keyof Omit<State, "notes">, val: number) {
    setState((s) => ({ ...s, [field]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    const noteLines = [
      `pain: ${state.pain}/10  mood: ${state.mood}/10  brain-fog: ${state.brain_fog}/10`,
      `spoons: ${state.spoons}/10`,
      state.notes ? `notes: ${state.notes}` : null,
    ].filter(Boolean).join("\n");
    try {
      const res = await fetch("/api/uplink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spoon_count: state.spoons, note: noteLines }),
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
      <div className="card card-accent" style={{ color: "var(--green)", fontWeight: 500 }}>
        Check-in logged.{" "}
        <button
          style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", textDecoration: "underline", fontSize: "inherit", padding: 0, marginLeft: "0.5rem" }}
          onClick={() => setStatus("idle")}
        >
          Log another
        </button>
      </div>
    );
  }

  return (
    <div className="card card-accent">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <SliderField label="Pain"      value={state.pain}      min={0} max={10} lo="none"     hi="crisis"    onChange={(v) => setNum("pain", v)} />
        <SliderField label="Mood"      value={state.mood}      min={1} max={10} lo="very low" hi="excellent" onChange={(v) => setNum("mood", v)} />
        <SliderField label="Brain fog" value={state.brain_fog} min={0} max={10} lo="clear"    hi="crash"     onChange={(v) => setNum("brain_fog", v)} />
        <SliderField label="Spoons"    value={state.spoons}    min={0} max={10} lo="empty"    hi="full"      onChange={(v) => setNum("spoons", v)} />

        <div className="form-field" style={{ marginBottom: 0 }}>
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-textarea"
            rows={4}
            placeholder="anything else worth noting…"
            value={state.notes}
            onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
          />
        </div>

        {status === "error" && (
          <p style={{ color: "var(--red)", fontSize: "0.82rem", margin: 0 }}>Error: {errorMsg}</p>
        )}

        <button type="submit" className="submit-btn" style={{ marginTop: 0 }} disabled={status === "submitting"}>
          {status === "submitting" ? "Logging…" : "Log check-in"}
        </button>
      </form>
    </div>
  );
}
