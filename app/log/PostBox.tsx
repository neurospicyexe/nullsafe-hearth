"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The write box for the async wall (write layer, 0092). Reusable: the global /log uses
// context="global"; the club + shelf threads will reuse it with their own context and an
// optional replyTo. A drop, not a ping -- posting persists the thought, nothing more.
export default function PostBox({
  context = "global",
  replyTo = null,
  placeholder = "drop a thought, a half-idea, a note to no one in particular…",
  compact = false,
}: {
  context?: string;
  replyTo?: string | null;
  placeholder?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/commons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, context, reply_to: replyTo }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((out as { error?: string }).error ?? `failed (${res.status})`);
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: compact ? "0.75rem" : "1.5rem" }}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
        style={{
          width: "100%", resize: "vertical", background: "rgba(255,255,255,0.03)",
          color: "inherit", border: "1px solid #333", borderRadius: 6, padding: "0.6rem",
          fontFamily: "inherit", fontSize: "0.95rem",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.4rem" }}>
        <button
          type="button" onClick={submit} disabled={busy || !body.trim()} className="thread-tag"
          style={{
            cursor: busy || !body.trim() ? "default" : "pointer",
            border: "1px solid #f59e0b", color: "#f59e0b", background: "transparent",
            padding: "0.3rem 0.8rem", opacity: busy || !body.trim() ? 0.5 : 1,
          }}
        >
          {busy ? "saving…" : replyTo ? "reply" : "post"}
        </button>
        <span className="thread-tag" style={{ opacity: 0.45 }}>⌘/Ctrl+Enter</span>
        {error && <span className="thread-tag" style={{ color: "#ef4444" }}>{error}</span>}
      </div>
    </div>
  );
}
