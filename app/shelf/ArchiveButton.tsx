"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Archive a shelf item (0094) -- drops it from the active shelf without deleting history.
export default function ArchiveButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function archive() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/shelf", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "archived" }),
      });
      if (res.ok) router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <button type="button" onClick={archive} disabled={busy} className="thread-tag"
      style={{ cursor: busy ? "wait" : "pointer", background: "transparent", border: "1px solid #555", color: "#888", fontSize: "0.8rem" }}>
      {busy ? "…" : "archive"}
    </button>
  );
}
