"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MetabolizeButton({
  noteId,
  companionId,
}: {
  noteId: string;
  companionId: string;
}) {
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const router = useRouter();

  async function metabolize() {
    setStatus("working");
    try {
      const res = await fetch(`/api/mind/note/${noteId}/metabolize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companion_id: companionId }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      router.refresh();
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  if (status === "done") return <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>metabolized</span>;

  return (
    <button
      onClick={metabolize}
      disabled={status === "working"}
      style={{
        fontSize: "0.72rem",
        padding: "0.15rem 0.55rem",
        background: "transparent",
        border: "1px solid var(--border-subtle)",
        borderRadius: "4px",
        color: status === "error" ? "var(--red)" : "var(--text-muted)",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {status === "working" ? "…" : status === "error" ? "failed" : "metabolize"}
    </button>
  );
}
