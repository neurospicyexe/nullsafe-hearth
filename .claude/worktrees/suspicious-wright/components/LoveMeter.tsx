"use client";

import { useState, useTransition } from "react";

export default function LoveMeter({ initial }: { initial: number }) {
  const [value, setValue] = useState(Math.min(100, Math.max(0, initial)));
  const [, startTransition] = useTransition();

  const update = (next: number) => {
    const clamped = Math.min(100, Math.max(0, next));
    setValue(clamped);
    startTransition(async () => {
      await fetch("/api/house", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ love_meter: clamped }),
      });
    });
  };

  return (
    <div className="love-meter-wrap">
      <button className="love-btn" onClick={() => update(value - 5)} aria-label="decrease">−</button>
      <div
        className="love-bar-track"
        title={`${value}/100`}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
          update(pct);
        }}
      >
        <div className="love-bar-fill" style={{ width: `${value}%` }} />
      </div>
      <button className="love-btn" onClick={() => update(value + 5)} aria-label="increase">+</button>
      <span className="love-label">♥ {value}</span>
    </div>
  );
}
