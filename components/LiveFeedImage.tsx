"use client";

import { useState } from "react";

export default function LiveFeedImage({ src, currentRoom }: { src: string; currentRoom: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic" }}>
          Awaiting feed for {currentRoom}...
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Current view of ${currentRoom}`}
      style={{
        width: "100%", height: "100%", position: "absolute", inset: 0, objectFit: "cover",
        background: "var(--surface-base)", border: "none"
      }}
      onError={() => setError(true)}
    />
  );
}
