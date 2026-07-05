"use client";

import { useState, useTransition } from "react";

export default function SpoonCounter({ initial }: { initial: number }) {
  const [count, setCount] = useState(Math.min(10, Math.max(0, initial)));
  const [saveFailed, setSaveFailed] = useState(false);
  const [, startTransition] = useTransition();

  const update = (next: number) => {
    const clamped = Math.min(10, Math.max(0, next));
    const previous = count;
    setCount(clamped);
    setSaveFailed(false);
    startTransition(async () => {
      // Optimistic UI, honest persistence: revert and say so if the write
      // didn't land -- spoons feed the reach-out gate, a silently lost value
      // starves it.
      try {
        const res = await fetch("/api/house", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spoon_count: clamped }),
        });
        if (!res.ok) throw new Error(String(res.status));
      } catch {
        setCount(previous);
        setSaveFailed(true);
      }
    });
  };

  return (
    <div className="spoon-counter">
      {saveFailed && <span className="spoon-save-hint" role="status">didn&apos;t save — tap again</span>}
      <button className="spoon-btn" onClick={() => update(count - 1)} aria-label="remove spoon">−</button>
      <div className="spoon-pips" aria-label={`${count} of 10 spoons`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`spoon-pip ${i < count ? "filled" : ""}`}
            onClick={() => update(i + 1)}
          />
        ))}
      </div>
      <button className="spoon-btn" onClick={() => update(count + 1)} aria-label="add spoon">+</button>
    </div>
  );
}
