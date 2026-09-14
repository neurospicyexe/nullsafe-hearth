"use client";

import { useState } from "react";
import { confirmFact, retireFact, fixFact, type ActionResult } from "./actions";

// Row-level action bar: Confirm (open facts only) / Retire / Fix (inline supersede form).
// One flash line per row, cleared on the next action.
export default function FactActions({
  id,
  fact,
  category,
  status,
  accent,
}: {
  id: string;
  fact: string;
  category: string;
  status: "active" | "open";
  accent: string;
}) {
  const [busy, setBusy] = useState<null | "confirm" | "retire" | "fix">(null);
  const [flash, setFlash] = useState<ActionResult | null>(null);
  const [fixing, setFixing] = useState(false);
  const [draft, setDraft] = useState(fact);

  async function run(kind: "confirm" | "retire", fn: () => Promise<ActionResult>) {
    setBusy(kind);
    setFlash(null);
    const r = await fn();
    setFlash(r);
    setBusy(null);
  }

  async function submitFix() {
    if (!draft.trim()) {
      setFlash({ ok: false, message: "fact text can't be empty" });
      return;
    }
    setBusy("fix");
    setFlash(null);
    const r = await fixFact(id, draft, category);
    setFlash(r);
    setBusy(null);
    if (r.ok) setFixing(false);
  }

  return (
    <div style={{ marginTop: "0.6rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        {status === "open" && (
          <button
            type="button"
            onClick={() => run("confirm", () => confirmFact(id))}
            disabled={busy !== null}
            className="thread-tag"
            style={{ cursor: busy ? "wait" : "pointer", background: "transparent", border: `1px solid ${accent}`, color: accent }}
          >
            {busy === "confirm" ? "confirming…" : "confirm"}
          </button>
        )}
        <button
          type="button"
          onClick={() => run("retire", () => retireFact(id))}
          disabled={busy !== null}
          className="thread-tag"
          style={{ cursor: busy ? "wait" : "pointer", background: "transparent", border: "1px solid #ef4444", color: "#ef4444" }}
        >
          {busy === "retire" ? "retiring…" : "retire"}
        </button>
        <button
          type="button"
          onClick={() => { setFixing((v) => !v); setFlash(null); }}
          disabled={busy !== null}
          className="thread-tag"
          style={{ cursor: busy ? "wait" : "pointer", background: "transparent", border: "1px solid #6b7280", color: "#9ca3af" }}
        >
          {fixing ? "cancel" : "fix"}
        </button>
        {flash && (
          <span className="thread-tag" style={{ color: flash.ok ? "#4ade80" : "#ef4444", background: "transparent", border: "none" }}>
            {flash.message}
          </span>
        )}
      </div>

      {fixing && (
        <div style={{ marginTop: "0.5rem" }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            disabled={busy !== null}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "0.4rem",
              color: "inherit",
              padding: "0.5rem 0.6rem",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
          <div style={{ marginTop: "0.4rem" }}>
            <button
              type="button"
              onClick={submitFix}
              disabled={busy !== null}
              className="thread-tag"
              style={{ cursor: busy ? "wait" : "pointer", background: "transparent", border: `1px solid ${accent}`, color: accent }}
            >
              {busy === "fix" ? "saving…" : "save correction (supersedes this fact)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
