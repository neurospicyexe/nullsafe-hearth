"use client";

// Tend a creature from its card (2026-07-02) — feed/play/talk/give without leaving Hearth.

import { useState } from "react";
import { useRouter } from "next/navigation";

const ACTIONS = ["feed", "play", "talk", "give"] as const;

export default function TendButtons({ creatureId }: { creatureId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function tend(action: (typeof ACTIONS)[number]) {
    setBusy(action);
    setFlash(null);
    const res = await fetch(`/api/creatures/${encodeURIComponent(creatureId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) { setFlash("failed"); return; }
    setFlash(`${action} ✓`);
    setTimeout(() => setFlash(null), 2000);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
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
  );
}
