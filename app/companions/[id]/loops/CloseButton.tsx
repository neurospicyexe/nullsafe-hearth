"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CloseLoopButton({
  loopId,
  companionId,
}: {
  loopId: string;
  companionId: string;
}) {
  const [status, setStatus] = useState<"idle" | "closing" | "done" | "error">("idle");
  const router = useRouter();

  async function close() {
    setStatus("closing");
    try {
      const res = await fetch(`/api/mind/loop/${loopId}/close`, {
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

  if (status === "done") return <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>closed</span>;

  return (
    <button
      onClick={close}
      disabled={status === "closing"}
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
      {status === "closing" ? "…" : status === "error" ? "failed" : "close"}
    </button>
  );
}
