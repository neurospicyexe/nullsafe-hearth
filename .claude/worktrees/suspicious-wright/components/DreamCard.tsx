"use client";

import { useState } from "react";
import type { PresenceData } from "@/lib/halseth";

type Dream = PresenceData["recent_dreams"][number];

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function DreamFeed({ dreams }: { dreams: Dream[] }) {
  if (dreams.length === 0) return null;
  return (
    <div className="dream-feed">
      {[...dreams].reverse().map((d) => (
        <div key={d.id} className="dream-entry">
          <div className="dream-text">{d.content}</div>
          <div className="dream-meta">{formatTime(d.created_at)}</div>
        </div>
      ))}
    </div>
  );
}

function DreamForm() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: "companion", content: content.trim(), note_type: "dream" }),
      });
      if (!res.ok) throw new Error();
      setContent("");
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <form className="note-form" onSubmit={submit}>
      <textarea
        className="note-textarea"
        placeholder="log a dream..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        disabled={status === "sending"}
      />
      <button
        type="submit"
        className="note-submit"
        disabled={status === "sending" || !content.trim()}
      >
        {status === "sending" ? "saving…" : status === "sent" ? "saved ✓" : status === "error" ? "error — try again" : "log dream"}
      </button>
    </form>
  );
}

export default function DreamCard({ dreams }: { dreams: Dream[] }) {
  return (
    <div className="card dream-card">
      <div className="card-title">Dreams</div>
      <DreamFeed dreams={dreams} />
      <DreamForm />
    </div>
  );
}
