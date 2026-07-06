"use client";

import { useState, useTransition } from "react";
import type { WmDream } from "@/lib/halseth";

const COMPANIONS = ["drevan", "cypher", "gaia"] as const;
type CompanionId = (typeof COMPANIONS)[number];

// Colors and symbols match COMPANION_CONFIG in sections.tsx
const COMPANION_DISPLAY: Record<CompanionId, { color: string; sym: string; label: string }> = {
  drevan: { color: "#6366f1", sym: "◈", label: "Drevan" },
  cypher: { color: "#e2e8f0", sym: "⟡", label: "Cypher" },
  gaia:   { color: "#4ade80", sym: "✦", label: "Gaia"   },
};

async function examineAction(companionId: string, dreamId: string): Promise<boolean> {
  const res = await fetch(`/api/mind/dream/${dreamId}/examine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companion_id: companionId }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { ok: boolean };
  return data.ok;
}

async function pinAction(
  companionId: string,
  dreamId: string,
  pinned: boolean,
): Promise<boolean> {
  const res = await fetch(`/api/mind/dream/${dreamId}/pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companion_id: companionId, do_not_auto_examine: pinned ? 1 : 0 }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { ok: boolean };
  return data.ok;
}

function DreamCard({
  dream,
  companionId,
  onExamined,
  onPinToggled,
}: {
  dream: WmDream;
  companionId: CompanionId;
  onExamined: (id: string) => void;
  onPinToggled: (id: string, pinned: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  // A failed examine/pin used to silently no-op -- the button re-enabled with no signal,
  // leaving Raziel unsure if it worked. Surface the failure inline. (2026-06-16 sweep.)
  const [error, setError] = useState<string | null>(null);
  const isPinned = dream.do_not_auto_examine === 1;
  const isExamined = !!dream.examined_at;
  const config = COMPANION_DISPLAY[companionId];

  const handleExamine = () => {
    setError(null);
    startTransition(async () => {
      const ok = await examineAction(companionId, dream.id);
      if (ok) onExamined(dream.id);
      else setError("Examine failed -- try again.");
    });
  };

  const handlePin = () => {
    setError(null);
    startTransition(async () => {
      const ok = await pinAction(companionId, dream.id, !isPinned);
      if (ok) onPinToggled(dream.id, !isPinned);
      else setError("Pin failed -- try again.");
    });
  };

  return (
    <div
      className="card"
      style={{
        border: isPinned ? `1px solid ${config.color}66` : "1px solid #1e293b",
        marginBottom: "0.75rem",
        opacity: isPending ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "0.5rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {dream.source && (
              <span className="badge" style={{ fontSize: "0.72rem", background: "#1e293b" }}>
                {dream.source}
              </span>
            )}
            {isPinned && (
              <span
                className="badge"
                style={{
                  fontSize: "0.72rem",
                  background: "#6366f122",
                  color: "#818cf8",
                  border: "1px solid #6366f144",
                }}
              >
                pinned
              </span>
            )}
            {isExamined && (
              <span
                className="badge"
                style={{
                  fontSize: "0.72rem",
                  background: "#10b98122",
                  color: "#34d399",
                  border: "1px solid #10b98144",
                }}
              >
                examined
              </span>
            )}
            <span style={{ fontSize: "0.72rem", color: "#475569" }}>
              {new Date(dream.created_at).toLocaleDateString()}
            </span>
          </div>
          <p
            style={{ margin: 0, fontSize: "0.875rem", color: "#cbd5e1", lineHeight: 1.6 }}
          >
            {dream.dream_text}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            flexShrink: 0,
          }}
        >
          <button
            onClick={handlePin}
            disabled={isPending}
            style={{
              padding: "0.3rem 0.75rem",
              fontSize: "0.78rem",
              background: isPinned ? "#6366f122" : "#1e293b",
              color: isPinned ? "#818cf8" : "#64748b",
              border: `1px solid ${isPinned ? "#6366f144" : "#334155"}`,
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            {isPinned ? "Unpin" : "Pin"}
          </button>
          {!isExamined && !isPinned && (
            <button
              onClick={handleExamine}
              disabled={isPending}
              style={{
                padding: "0.3rem 0.75rem",
                fontSize: "0.78rem",
                background: "#10b98122",
                color: "#34d399",
                border: "1px solid #10b98144",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Examine
            </button>
          )}
        </div>
      </div>
      {error && (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "#f87171" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default function DreamsClient({
  dreamsByCompanion,
}: {
  dreamsByCompanion: Record<CompanionId, WmDream[]>;
}) {
  const [dreams, setDreams] = useState(dreamsByCompanion);

  const handleExamined = (companionId: CompanionId, dreamId: string) => {
    setDreams((prev) => ({
      ...prev,
      [companionId]: prev[companionId].map((d) =>
        d.id === dreamId ? { ...d, examined_at: new Date().toISOString() } : d,
      ),
    }));
  };

  const handlePinToggled = (companionId: CompanionId, dreamId: string, pinned: boolean) => {
    setDreams((prev) => ({
      ...prev,
      [companionId]: prev[companionId].map((d) =>
        d.id === dreamId ? { ...d, do_not_auto_examine: pinned ? 1 : 0 } : d,
      ),
    }));
  };

  const allEmpty = COMPANIONS.every((id) => dreams[id].length === 0);

  if (allEmpty) {
    return (
      <div className="home-section-card">
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#94a3b8" }}>
          No dreams on record. The triad is carrying nothing new.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {COMPANIONS.map((companionId) => {
        const config = COMPANION_DISPLAY[companionId];
        const companionDreams = dreams[companionId];
        if (companionDreams.length === 0) return null;
        const unexaminedCount = companionDreams.filter((d) => !d.examined_at).length;
        return (
          <div key={companionId}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem",
              }}
            >
              <span style={{ color: config.color, fontWeight: 700 }}>
                {config.sym} {config.label}
              </span>
              <span className="badge" style={{ background: "#1e293b", fontSize: "0.75rem" }}>
                {companionDreams.length}
              </span>
              {unexaminedCount > 0 && (
                <span
                  className="badge"
                  style={{
                    background: "#6366f122",
                    color: "#818cf8",
                    border: "1px solid #6366f144",
                    fontSize: "0.72rem",
                  }}
                >
                  {unexaminedCount} unexamined
                </span>
              )}
            </div>
            {companionDreams.map((dream) => (
              <DreamCard
                key={dream.id}
                dream={dream}
                companionId={companionId}
                onExamined={(id) => handleExamined(companionId, id)}
                onPinToggled={(id, pinned) => handlePinToggled(companionId, id, pinned)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
