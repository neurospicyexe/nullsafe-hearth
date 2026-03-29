export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchRelationalHistory } from "@/lib/halseth";
import { COMPANION_CONFIG } from "../sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATE_TYPE_COLOR: Record<string, string> = {
  feeling: "var(--accent)",
  witness: "#4ade80",
  held:    "#a78bfa",
};

function WeightDot({ value }: { value: number }) {
  const size = 6 + Math.round(value * 8);
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      background: "var(--border)",
      flexShrink: 0,
      alignSelf: "center",
    }} />
  );
}

export default async function CompanionRelationalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.toLowerCase();
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  const states = await fetchRelationalHistory(id, 50).catch(() => []);

  // Group by 'toward' target for display
  const byTarget = states.reduce<Record<string, RelationalState[]>>((acc, s) => {
    (acc[s.toward] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/companions/${id}`} className="home-section-link">
          ← {config.display}
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">{config.display} · Relational State</h1>
        <p className="page-subtitle">what {config.display} is holding toward each relationship</p>
      </div>

      {states.length === 0 && (
        <div className="pending-notice">
          <div className="pending-dot" />
          No relational state recorded yet.
        </div>
      )}

      {Object.entries(byTarget).map(([toward, entries]) => {
        const latest = entries[0];
        return (
          <section key={toward} className="page-section">
            <div className="section-header">
              <h2 className="section-title section-title-flush" style={{ color: config.color }}>
                → {toward}
              </h2>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            <div className="card" style={{ padding: "0.5rem 0" }}>
              {entries.map((s, i) => (
                <div
                  key={s.id}
                  className="journal-row"
                  style={{
                    alignItems: "flex-start",
                    gap: "0.6rem",
                    opacity: i === 0 ? 1 : 0.65,
                  }}
                >
                  <WeightDot value={s.weight} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="journal-text">{s.state_text}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem", flexShrink: 0 }}>
                    <span
                      className="note-type-badge"
                      style={{
                        borderColor: STATE_TYPE_COLOR[s.state_type] ?? "var(--border-subtle)",
                        color: STATE_TYPE_COLOR[s.state_type] ?? "var(--text-muted)",
                      }}
                    >
                      {s.state_type}
                    </span>
                    <span className="journal-time">{fmtTime(s.noted_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
