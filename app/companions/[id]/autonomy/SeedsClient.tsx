"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AutonomySeed } from "@/lib/halseth";

function fmtTime(s: string) {
  return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const SEED_TYPES = ["topic", "question", "reflection_prompt"] as const;
type SeedType = typeof SEED_TYPES[number];

function seedTypeColor(t: SeedType | string) {
  return t === "topic" ? "#3b82f6" : t === "question" ? "#f59e0b" : "#a855f7";
}

interface Props {
  companionId: string;
  companionColor: string;
  availableSeeds: AutonomySeed[];
  usedSeeds: AutonomySeed[];
  noSeeds: boolean;
}

export default function SeedsClient({ companionId, companionColor, availableSeeds, usedSeeds, noSeeds }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [seedType, setSeedType] = useState<SeedType>("topic");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [markingUsed, setMarkingUsed] = useState<Record<string, boolean>>({});

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/mind/autonomy/seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companion_id: companionId, content: content.trim(), seed_type: seedType }),
      });
      if (res.ok) {
        setContent("");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setAddError(data.error ?? "Failed to add seed");
      }
    } catch {
      setAddError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function handleMarkUsed(id: string) {
    setMarkingUsed((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/mind/autonomy/seeds/${id}`, { method: "PATCH" });
      if (res.ok) router.refresh();
    } finally {
      setMarkingUsed((p) => ({ ...p, [id]: false }));
    }
  }

  return (
    <>
      {/* Add seed form */}
      <form onSubmit={handleAdd} className="seed-add-form" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {SEED_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`ratify-btn${seedType === t ? " ratify-accept" : ""}`}
              style={seedType === t ? { color: companionColor, borderColor: `${companionColor}66` } : {}}
              onClick={() => setSeedType(t)}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <input
            className="seed-input"
            type="text"
            placeholder="New seed content…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={adding}
          />
          <button
            type="submit"
            className="ratify-btn ratify-accept"
            disabled={adding || !content.trim()}
            style={{ color: companionColor, borderColor: `${companionColor}66`, flexShrink: 0 }}
          >
            {adding ? "…" : "add"}
          </button>
        </div>
        {addError && (
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#ef4444" }}>{addError}</p>
        )}
      </form>

      {noSeeds && availableSeeds.length === 0 ? (
        <p className="empty">No seeds yet</p>
      ) : (
        <>
          <h3 style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500, margin: "0 0 0.5rem" }}>
            Available
          </h3>
          {availableSeeds.length === 0 ? (
            <p className="empty" style={{ marginBottom: "1rem" }}>No seeds available</p>
          ) : (
            <div className="section-list" style={{ marginBottom: "1rem" }}>
              {availableSeeds.map((seed) => {
                const c = seedTypeColor(seed.seed_type);
                return (
                  <div
                    key={seed.id}
                    className="section-row"
                    style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.35rem" }}
                  >
                    <span className="badge" style={{ background: `${c}22`, color: c, border: `1px solid ${c}44` }}>
                      {seed.seed_type.replace("_", " ")}
                    </span>
                    <p className="section-row-text" style={{ margin: 0 }}>{seed.content}</p>
                    <button
                      className="ratify-btn ratify-decline"
                      disabled={markingUsed[seed.id]}
                      onClick={() => handleMarkUsed(seed.id)}
                      style={{ fontSize: "0.74rem" }}
                    >
                      {markingUsed[seed.id] ? "…" : "mark used"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {usedSeeds.length > 0 && (
            <details style={{ marginTop: "0.5rem" }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  color: "#94a3b8",
                  fontWeight: 500,
                  userSelect: "none",
                  listStyle: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                {usedSeeds.length} used {usedSeeds.length === 1 ? "seed" : "seeds"}
              </summary>
              <div className="section-list" style={{ marginTop: "0.75rem" }}>
                {usedSeeds.map((seed) => {
                  const c = seedTypeColor(seed.seed_type);
                  return (
                    <div
                      key={seed.id}
                      className="section-row"
                      style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.35rem" }}
                    >
                      <span className="badge" style={{ background: `${c}22`, color: c, border: `1px solid ${c}44` }}>
                        {seed.seed_type.replace("_", " ")}
                      </span>
                      <p className="section-row-text" style={{ margin: 0, opacity: 0.6 }}>{seed.content}</p>
                      <span className="section-row-meta" style={{ fontSize: "0.78rem" }}>
                        used {fmtTime(seed.used_at!)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </>
      )}
    </>
  );
}
