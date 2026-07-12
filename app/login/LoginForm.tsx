"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  // Same-origin only -- a bare "/" prefix without a second leading slash, so
  // "//evil.com" (browsers treat as protocol-relative) can't redirect off-site.
  const rawFrom = params.get("from") ?? "/";
  const from = rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: value }),
      });

      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Incorrect passphrase.");
        setLoading(false);
      }
    } catch {
      setError("An error occurred during login.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <label htmlFor="secret" style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
        Passphrase
      </label>
      <input
        id="secret"
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        autoComplete="current-password"
        style={{
          background: "var(--bg-color)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-main)",
          padding: "0.6rem 0.875rem",
          fontSize: "1rem",
          width: "100%",
        }}
      />
      {error && (
        <p style={{ color: "var(--red)", fontSize: "0.85rem", margin: 0 }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !value}
        style={{
          background: "var(--accent)",
          border: "none",
          borderRadius: "var(--radius-md)",
          color: "#fff",
          cursor: loading ? "default" : "pointer",
          fontSize: "0.9rem",
          fontWeight: 600,
          opacity: loading || !value ? 0.6 : 1,
          padding: "0.6rem 1.25rem",
        }}
      >
        {loading ? "…" : "Enter"}
      </button>
    </form>
  );
}
