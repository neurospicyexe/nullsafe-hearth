"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const KINDS = ["show", "movie", "actor", "person", "book", "music", "game", "article", "other"];

// Add a fixation to the shelf (0094). The triad reacts to it in their own time.
export default function AddBox() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("other");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!title.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/shelf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), kind, note: note.trim() || null }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) { setError((out as { error?: string }).error ?? `failed (${res.status})`); return; }
      setTitle(""); setNote(""); setKind("other"); router.refresh();
    } catch { setError("network error"); }
    finally { setBusy(false); }
  }

  const inputStyle = { background: "rgba(255,255,255,0.03)", color: "inherit", border: "1px solid #333", borderRadius: 6, padding: "0.5rem", fontFamily: "inherit", fontSize: "0.95rem" } as const;

  return (
    <div style={{ marginBottom: "1.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="what are you into right now?" style={{ ...inputStyle, flex: "1 1 240px" }} />
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={inputStyle}>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="a note on why / what (optional)" style={inputStyle} />
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button type="button" onClick={add} disabled={busy || !title.trim()} className="thread-tag"
          style={{ cursor: busy || !title.trim() ? "default" : "pointer", border: "1px solid #f59e0b", color: "#f59e0b", background: "transparent", padding: "0.3rem 0.9rem", opacity: busy || !title.trim() ? 0.5 : 1 }}>
          {busy ? "adding…" : "add to shelf"}
        </button>
        {error && <span className="thread-tag" style={{ color: "#ef4444" }}>{error}</span>}
      </div>
    </div>
  );
}
