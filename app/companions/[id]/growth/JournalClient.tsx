"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GrowthJournalEntry } from "@/lib/halseth";
import { fmtTime } from "../sections";

function colorBadge(color: string): React.CSSProperties {
  return { background: `${color}22`, color, border: `1px solid ${color}44` };
}

function ReviewBadge({ status }: { status?: "pending" | "accepted" | "declined" }) {
  if (!status || status === "pending") return null;
  const color = status === "accepted" ? "#22c55e" : "#ef4444";
  return <span className="badge" style={colorBadge(color)}>{status}</span>;
}

interface Props {
  entries: GrowthJournalEntry[];
  companionId: string;
  companionColor: string;
  /** Shown when there is nothing to list. In the queue view "nothing left to ratify" is a win, not a void. */
  emptyText?: string;
}

export default function JournalClient({ entries, companionId, companionColor, emptyText }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [localStatus, setLocalStatus] = useState<Record<string, "pending" | "accepted" | "declined">>({});
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAction(id: string, action: "accept" | "decline") {
    setBusy((p) => ({ ...p, [id]: true }));
    setActionError(null);
    try {
      // companion_id is REQUIRED (2026-07-27). Halseth's acceptJournalEntry /
      // declineJournalEntry run validateCompanion(body.companion_id) and 400 without it, and
      // setReviewStatus scopes its UPDATE by companion_id as an ownership guard. This call
      // sent no body at all, so every ratification from Hearth failed with "Action failed --
      // try again". It had never worked: the queue was three levels deep with no count, so
      // nobody reached the button, so nobody found it broken. `companionId` was already a
      // prop on this component the whole time.
      const res = await fetch(`/api/mind/growth/journal/${id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companion_id: companionId }),
      });
      if (res.ok) {
        setLocalStatus((p) => ({ ...p, [id]: action === "accept" ? "accepted" : "declined" }));
        router.refresh();
      } else {
        // Surface WHY. A bare "try again" on a deterministic 400 sends Raziel in circles.
        let detail = `${res.status}`;
        try {
          const j = await res.json() as { error?: string };
          if (j?.error) detail = `${res.status} ${j.error}`;
        } catch { /* non-JSON body -- status alone is still better than nothing */ }
        setActionError(`Could not ${action} that entry (${detail})`);
      }
    } catch {
      setActionError("Network error");
    } finally {
      setBusy((p) => ({ ...p, [id]: false }));
    }
  }

  if (entries.length === 0) {
    return <p className="empty">{emptyText ?? "No journal entries yet"}</p>;
  }

  return (
    <>
      {actionError && (
        <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", color: "#ef4444" }}>{actionError}</p>
      )}
      <div className="section-list">
        {entries.map((entry) => {
          const typeBadgeColor =
            entry.entry_type === "learning"   ? "#3b82f6" :
            entry.entry_type === "insight"    ? "#a855f7" :
            entry.entry_type === "connection" ? "#22c55e" :
            entry.entry_type === "question"   ? "#f59e0b" : "#6b7280";

          const sourceBadgeColor =
            entry.source === "autonomous"   ? "#6b7280" :
            entry.source === "conversation" ? "#f97316" :
            entry.source === "reflection"   ? "#14b8a6" : null;

          let tags: string[] = [];
          try {
            const parsed = JSON.parse(entry.tags_json);
            tags = Array.isArray(parsed) ? parsed : [];
          } catch { tags = []; }

          const status = localStatus[entry.id] ?? entry.review_status;
          const isPending = !status || status === "pending";
          const isBusy = busy[entry.id] ?? false;

          return (
            <div
              key={entry.id}
              className="section-row"
              style={{
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "0.4rem",
                borderLeft: `3px solid ${
                  status === "accepted" ? "#22c55e" :
                  status === "declined" ? "#ef444455" :
                  `${companionColor}44`
                }`,
              }}
            >
              {/* Badges row */}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                <span className="badge" style={colorBadge(typeBadgeColor)}>
                  {entry.entry_type}
                </span>
                {entry.source && sourceBadgeColor && (
                  <span className="badge" style={colorBadge(sourceBadgeColor)}>
                    {entry.source}
                  </span>
                )}
                <ReviewBadge status={status} />
              </div>

              {/* Content */}
              <p className="section-row-text" style={{ margin: 0, lineHeight: 1.5 }}>
                {entry.content}
              </p>

              {/* Tags */}
              {tags.length > 0 && (
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                  {tags.map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "0.72rem",
                        padding: "0.1rem 0.45rem",
                        background: "#ffffff0d",
                        border: "1px solid #ffffff18",
                        borderRadius: "3px",
                        color: "#94a3b8",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Bottom row: timestamp + ratification buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", width: "100%" }}>
                <span className="section-row-meta" style={{ fontSize: "0.78rem" }}>
                  {fmtTime(entry.created_at)}
                </span>

                {isPending && (
                  <div className="ratify-actions">
                    <button
                      className="ratify-btn ratify-accept"
                      disabled={isBusy}
                      onClick={() => handleAction(entry.id, "accept")}
                      style={{ color: companionColor, borderColor: `${companionColor}66` }}
                    >
                      {isBusy ? "…" : "accept"}
                    </button>
                    <button
                      className="ratify-btn ratify-decline"
                      disabled={isBusy}
                      onClick={() => handleAction(entry.id, "decline")}
                    >
                      {isBusy ? "…" : "decline"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
