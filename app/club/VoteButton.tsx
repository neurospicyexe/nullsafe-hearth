"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Raziel's pre-cast vote control. Rendered only while the round accepts votes
// (gathering/voting) and only on picks Raziel hasn't voted for yet.
export default function VoteButton({ recommendationId, alreadyVoted }: {
  recommendationId: string;
  alreadyVoted: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadyVoted) {
    return <span className="thread-tag" style={{ color: "#f59e0b" }}>your vote</span>;
  }

  async function cast() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/club/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendation_id: recommendationId }),
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
      setBusy(false);
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
      <button
        type="button"
        onClick={cast}
        disabled={busy}
        className="thread-tag"
        style={{ cursor: busy ? "wait" : "pointer", background: "transparent", border: "1px solid #f59e0b", color: "#f59e0b" }}
      >
        {busy ? "casting…" : "vote"}
      </button>
      {error && <span className="thread-tag" style={{ color: "#ef4444" }}>{error}</span>}
    </span>
  );
}
