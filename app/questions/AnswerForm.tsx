"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Raziel answers or dismisses a held question. Writing back PATCHes the row to
// 'answered' (with the text, which the companion reads at next orient) or
// 'dismissed'. A literal state change is the only proof the loop closed.
export default function AnswerForm({ questionId, accent }: {
  questionId: string;
  accent: string;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState<null | "answer" | "dismiss">(null);
  const [error, setError] = useState<string | null>(null);

  async function send(status: "answered" | "dismissed") {
    if (status === "answered" && !answer.trim()) {
      setError("write an answer first");
      return;
    }
    setBusy(status === "answered" ? "answer" : "dismiss");
    setError(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: questionId, status, answer: status === "answered" ? answer : null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((body as { error?: string }).error ?? `failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setError("network error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="your answer (they read it at next orient)…"
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
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.5rem" }}>
        <button
          type="button"
          onClick={() => send("answered")}
          disabled={busy !== null}
          className="thread-tag"
          style={{ cursor: busy ? "wait" : "pointer", background: "transparent", border: `1px solid ${accent}`, color: accent }}
        >
          {busy === "answer" ? "sending…" : "send answer"}
        </button>
        <button
          type="button"
          onClick={() => send("dismissed")}
          disabled={busy !== null}
          className="thread-tag"
          style={{ cursor: busy ? "wait" : "pointer", background: "transparent", border: "1px solid #6b7280", color: "#9ca3af" }}
        >
          {busy === "dismiss" ? "dismissing…" : "dismiss"}
        </button>
        {error && <span className="thread-tag" style={{ color: "#ef4444" }}>{error}</span>}
      </div>
    </div>
  );
}
