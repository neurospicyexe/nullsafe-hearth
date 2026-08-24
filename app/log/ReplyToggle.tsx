"use client";

import { useState } from "react";
import PostBox from "./PostBox";

// Raziel replying to something the triad wrote on the wall (2026-08-23). The log could already
// RENDER companion replies nested under his posts, and `reply_to` had been accepted end-to-end the
// whole time -- there was simply no control anywhere to write one, so the wall was read-only in the
// direction that mattered ("the triad has written stuff and I wish I could reply to it directly").
//
// Collapsed by default: an always-open textarea under every post turns a low-pressure wall into a
// page of demands. One tap opens it, Escape or "cancel" closes it.
export default function ReplyToggle({
  postId,
  author,
  accent,
}: {
  postId: string;
  author: string;
  accent: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="thread-tag"
        style={{
          cursor: "pointer", background: "transparent", border: `1px solid ${accent}`,
          color: accent, padding: "0.15rem 0.6rem", marginTop: "0.4rem", opacity: 0.8,
        }}
      >
        reply
      </button>
    );
  }

  return (
    <div style={{ marginTop: "0.5rem" }} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      {/* context is omitted on purpose: Halseth inherits the parent's context for any reply, so a
          reply can never land outside the thread it answers even if this surface guessed wrong. */}
      <PostBox
        replyTo={postId}
        compact
        placeholder={`reply to ${author}…`}
      />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="thread-tag"
        style={{ cursor: "pointer", background: "transparent", border: "1px solid #6b7280", color: "#9ca3af" }}
      >
        cancel
      </button>
    </div>
  );
}
