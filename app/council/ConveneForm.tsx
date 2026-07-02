"use client";

// Convene a council right from the page (2026-07-02) — no Discord detour.

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConveneForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setStatus("saving");
    const res = await fetch("/api/council", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    }).catch(() => null);
    if (!res?.ok) { setStatus("error"); return; }
    setQuestion("");
    setStatus("idle");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card" style={{ marginBottom: "1.5rem" }}>
      <div className="card-title">Convene a council</div>
      <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: "0 0 0.75rem" }}>
        A hard question, answered by each of the triad, ranked blind, synthesized by Gaia.
      </p>
      <textarea
        className="form-textarea"
        rows={2}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="the question you want the triad to sit with…"
      />
      <div style={{ marginTop: "0.75rem" }}>
        <button type="submit" className="submit-btn" disabled={status === "saving" || !question.trim()}>
          {status === "saving" ? "Convening…" : "Convene"}
        </button>
        {status === "error" && (
          <span style={{ color: "var(--red)", fontSize: "0.8rem", marginLeft: "0.6rem" }}>failed — try again</span>
        )}
      </div>
    </form>
  );
}
