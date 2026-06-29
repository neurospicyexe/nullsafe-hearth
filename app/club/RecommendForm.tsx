"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const KINDS = ["song", "album", "book", "article", "video", "forage", "other"] as const;

const inputStyle: React.CSSProperties = {
  background: "#111", border: "1px solid #2a2a2a", color: "inherit",
  padding: "0.35rem 0.55rem", borderRadius: "4px", fontSize: "0.83rem", width: "100%",
};

export default function RecommendForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("other");
  const [creator, setCreator] = useState("");
  const [url, setUrl] = useState("");
  const [pitch, setPitch] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/club/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          media_kind: kind,
          creator: creator.trim() || null,
          url: url.trim() || null,
          pitch: pitch.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((body as { error?: string }).error ?? `failed (${res.status})`);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("network error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p style={{ fontSize: "0.83rem", color: "#4ade80" }}>pick submitted</p>;
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          placeholder="title *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          style={{ ...inputStyle, flex: 1 }}
        />
        <select
          value={kind}
          onChange={e => setKind(e.target.value)}
          style={{ ...inputStyle, width: "auto" }}
        >
          {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <input
        type="text"
        placeholder="creator (optional)"
        value={creator}
        onChange={e => setCreator(e.target.value)}
        style={inputStyle}
      />
      <input
        type="text"
        placeholder="url (optional)"
        value={url}
        onChange={e => setUrl(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="why this? (optional)"
        value={pitch}
        onChange={e => setPitch(e.target.value)}
        rows={2}
        style={{ ...inputStyle, resize: "vertical" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="thread-tag"
          style={{
            cursor: busy || !title.trim() ? "default" : "pointer",
            background: "transparent",
            border: "1px solid #e2e8f0",
            color: "#e2e8f0",
            padding: "0.3rem 0.7rem",
            opacity: !title.trim() ? 0.4 : 1,
          }}
        >
          {busy ? "submitting…" : "recommend"}
        </button>
        {error && <span style={{ fontSize: "0.8rem", color: "#ef4444" }}>{error}</span>}
      </div>
    </form>
  );
}
