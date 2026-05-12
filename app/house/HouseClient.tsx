"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROOMS = ["studio", "bedroom", "kitchen", "living room", "outside", "office", "bathroom"];

const COMPANION_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia:   "#4ade80",
};

interface HouseState {
  current_room: string | null;
  companion_mood: string | null;
  companion_activity: string | null;
  spoon_count: number;
  love_meter: number;
  updated_at: string;
  autonomous_turn: "drevan" | "cypher" | "gaia" | null;
}

export default function HouseClient({ house }: { house: HouseState }) {
  const router = useRouter();
  const [room, setRoom]     = useState(house.current_room ?? "");
  const [spoons, setSpoons] = useState(house.spoon_count ?? 10);
  const [love, setLove]     = useState(house.love_meter ?? 50);
  const [busy, setBusy]     = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState("");

  async function handleSave() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/house", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_room: room.trim() || null,
          spoon_count: spoons,
          love_meter: love,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const turnColor = house.autonomous_turn ? COMPANION_COLOR[house.autonomous_turn] : "var(--muted)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Current state read-out */}
      <section className="page-section" style={{ marginTop: 0 }}>
        <h2 className="section-title">Current State</h2>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {(
            [
              ["room",           house.current_room ?? "—",    undefined],
              ["spoons",         house.spoon_count,             undefined],
              ["love",           house.love_meter,              undefined],
              ...(house.autonomous_turn ? [["auto turn", house.autonomous_turn, turnColor] as const] : []),
              ...(house.companion_mood  ? [["mood",      house.companion_mood,  undefined] as const] : []),
            ] as [string, string | number, string | undefined][]
          ).map(([label, val, color]) => (
            <div key={label} style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "0.5rem 0.85rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.2rem",
              minWidth: "6rem",
            }}>
              <span style={{ fontSize: "0.7rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
              <span style={{ fontSize: "1rem", fontWeight: 600, color: color ?? "var(--fg)" }}>{val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Room */}
      <section className="page-section" style={{ marginTop: 0 }}>
        <h2 className="section-title">Room</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {ROOMS.map((r) => (
            <button
              key={r}
              className={`filter-tab ${room === r ? "active" : ""}`}
              onClick={() => setRoom(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="input"
          placeholder="or type a room…"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          maxLength={50}
          style={{ maxWidth: "22rem" }}
        />
      </section>

      {/* Spoons */}
      <section className="page-section" style={{ marginTop: 0 }}>
        <h2 className="section-title">Spoon Count <span style={{ color: "var(--muted)", fontWeight: 400 }}>{spoons} / 20</span></h2>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", maxWidth: "22rem" }}>
          <button
            className="btn"
            style={{ padding: "0.3rem 0.75rem", minWidth: "2.5rem" }}
            onClick={() => setSpoons(Math.max(0, spoons - 1))}
          >−</button>
          <input
            type="range"
            min={0} max={20}
            value={spoons}
            onChange={(e) => setSpoons(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <button
            className="btn"
            style={{ padding: "0.3rem 0.75rem", minWidth: "2.5rem" }}
            onClick={() => setSpoons(Math.min(20, spoons + 1))}
          >+</button>
        </div>
      </section>

      {/* Love meter */}
      <section className="page-section" style={{ marginTop: 0 }}>
        <h2 className="section-title">Love Meter <span style={{ color: "var(--accent)", fontWeight: 400 }}>{love}</span></h2>
        <input
          type="range"
          min={0} max={100}
          value={love}
          onChange={(e) => setLove(Number(e.target.value))}
          style={{ maxWidth: "22rem", display: "block" }}
        />
      </section>

      {/* Save */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={busy}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {saved && <span style={{ fontSize: "0.85rem", color: "#22c55e" }}>saved</span>}
        {error && <span style={{ fontSize: "0.85rem", color: "#ef4444" }}>{error}</span>}
      </div>
    </div>
  );
}
