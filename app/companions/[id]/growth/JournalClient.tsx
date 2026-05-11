"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GrowthJournalEntry } from "@/lib/halseth";

function fmtTime(s: string) {
  return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ReviewBadge({ status }: { status?: "pending" | "accepted" | "declined" }) {
  if (!status || status === "pending") return null;
  const color = status === "accepted" ? "#22c55e" : "#ef4444";
  return (
    <span
      className="badge"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {status}
    </span>
  );
}

interface Props {
  entries: GrowthJournalEntry[];
  companionId: string;
  companionColor: string;
  hasMore: boolean;
}

export default function JournalClient({ entries, companionId, companionColor, hasMore }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [localStatus, setLocalStatus] = useState<Record<string, "pending" | "accepted" | "declined">>({});

  async function handleAction(id: string, action: "accept" | "decline") {
    setBusy((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/mind/growth/journal/${id}/${action}`, { method: "PATCH" });
      if (res.ok) {
        setLocalStatus((p) => ({ ...p, [id]: action === "accept" ? "accepted" : "declined" }));
        router.refresh();
      }
    } finally {
      setBusy((p) => ({ ...p, [id]: false }));
    }
  }

  if (entries.length === 0) {
    return <p className="empty">No journal entries yet</p>;
  }

  return (
    <>
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
                <span
                  className="badge"
                  style={{
                    background: `${typeBadgeColor}22`,
                    color: typeBadgeColor,
                    border: `1px solid ${typeBadgeColor}44`,
                  }}
                >
                  {entry.entry_type}
                </span>
                {entry.source && sourceBadgeColor && (
                  <span
                    className="badge"
                    style={{
                      background: `${sourceBadgeColor}22`,
                      color: sourceBadgeColor,
                      border: `1px solid ${sourceBadgeColor}44`,
                    }}
                  >
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

      {hasMore && (
        <p className="section-row-meta" style={{ marginTop: "0.75rem", fontSize: "0.82rem" }}>
          More entries available — view the full list
        </p>
      )}
    </>
  );
}
