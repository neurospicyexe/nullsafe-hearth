"use client";

// Tend a creature from its card (2026-07-02) — feed/play/talk/give without leaving Hearth.
// Inner life (0100): a give WITH WORDS lands in the nest as a kept thing, and any tend
// that crosses a trust milestone flashes the one-time moment text right here.

import { useState } from "react";
import { useRouter } from "next/navigation";

const ACTIONS = ["feed", "play", "talk", "give"] as const;

export default function TendButtons({ creatureId }: { creatureId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [note, setNote] = useState("");

  async function tend(action: (typeof ACTIONS)[number]) {
    setBusy(action);
    setFlash(null);
    const res = await fetch(`/api/creatures/${encodeURIComponent(creatureId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(note.trim() ? { note: note.trim() } : {}) }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) { setFlash("failed"); return; }
    const body = await res.json().catch(() => ({})) as { milestones_fired?: Array<{ text: string }> };
    setFlash(`${action} ✓`);
    setNote("");
    if (Array.isArray(body.milestones_fired) && body.milestones_fired.length > 0) {
      // A milestone fires once, ever. Leave it on screen until the next tend.
      setMilestone(body.milestones_fired.map(m => m.text).join(" "));
    }
    setTimeout(() => setFlash(null), 2000);
    router.refresh();
  }

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
        {ACTIONS.map((a) => (
          <button
            key={a}
            disabled={busy !== null}
            onClick={() => tend(a)}
            style={{
              background: "none", border: "1px solid var(--border)", borderRadius: "6px",
              color: "var(--muted)", fontSize: "0.75rem", padding: "0.25rem 0.65rem", cursor: "pointer",
            }}
          >
            {busy === a ? "…" : a}
          </button>
        ))}
        {flash && (
          <span style={{ fontSize: "0.75rem", color: flash === "failed" ? "var(--red)" : "var(--green)" }}>
            {flash}
          </span>
        )}
      </div>
      <input
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="with words… (a give with words goes in the nest)"
        maxLength={120}
        style={{
          marginTop: "0.4rem", width: "100%", background: "none",
          border: "1px solid var(--border)", borderRadius: "6px",
          color: "var(--muted)", fontSize: "0.75rem", padding: "0.25rem 0.5rem",
        }}
      />
      {milestone && (
        <p style={{ fontSize: "0.8rem", color: "#c084fc", marginTop: "0.45rem", marginBottom: 0 }}>
          ✦ {milestone}
        </p>
      )}
    </div>
  );
}
