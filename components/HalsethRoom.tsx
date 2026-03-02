"use client";

import { useState } from "react";

export type RoomConfig = {
  key: string;
  sym: string;
  name: string;
  desc: string;
  gradient: string;
  imageUrl?: string;
};

type Props = {
  rooms: RoomConfig[];
  initialRoom: string | null;
};

export default function HalsethRoom({ rooms, initialRoom }: Props) {
  const startKey = initialRoom ?? rooms[0]?.key ?? null;
  const [activeKey, setActiveKey] = useState<string | null>(startKey);
  const [saving, setSaving] = useState(false);

  const active = rooms.find((r) => r.key === activeKey) ?? rooms[0];

  async function switchRoom(key: string) {
    setActiveKey(key);
    setSaving(true);
    try {
      await fetch("/api/house", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_room: key }),
      });
    } catch {
      // silently fail — room is still shown client-side
    } finally {
      setSaving(false);
    }
  }

  if (!active) return <p className="empty">No rooms configured.</p>;

  return (
    <>
      {/* Room display */}
      <div className="room-display">
        {active.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={active.imageUrl} alt={active.name} className="room-image" />
        ) : (
          <div className="room-gradient" style={{ background: active.gradient }} />
        )}
        <div className="room-overlay">
          <p className="room-name">{active.name}</p>
          <p className="room-desc">{active.desc}</p>
        </div>
        {saving && (
          <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.7)" }}>
            saving…
          </div>
        )}
      </div>

      {/* Room grid */}
      <div className="room-grid">
        {rooms.map((r) => (
          <button
            key={r.key}
            className={`room-btn ${activeKey === r.key ? "active" : ""}`}
            onClick={() => switchRoom(r.key)}
          >
            <span className="room-btn-sym">{r.sym}</span>
            <span className="room-btn-name">{r.name}</span>
            <span className="room-btn-desc">{r.desc}</span>
          </button>
        ))}
      </div>
    </>
  );
}
