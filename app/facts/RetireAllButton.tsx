"use client";

import { useState } from "react";
import { retireOlderThan30Days, type ActionResult } from "./actions";

export default function RetireAllButton() {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<ActionResult | null>(null);

  async function run() {
    setBusy(true);
    setFlash(null);
    const r = await retireOlderThan30Days();
    setFlash(r);
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="thread-tag"
        style={{ cursor: busy ? "wait" : "pointer", background: "transparent", border: "1px solid #ef4444", color: "#ef4444", padding: "0.35rem 0.8rem", fontSize: "0.8rem" }}
      >
        {busy ? "retiring…" : "Retire all older than 30 days"}
      </button>
      {flash && (
        <span className="section-row-meta" style={{ color: flash.ok ? "#4ade80" : "#ef4444" }}>
          {flash.message}
        </span>
      )}
    </div>
  );
}
