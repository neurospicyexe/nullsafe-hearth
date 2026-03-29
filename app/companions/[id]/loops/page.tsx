export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchLoops } from "@/lib/halseth";
import { COMPANION_CONFIG } from "../sections";
import { CloseLoopButton } from "./CloseButton";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function WeightBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div style={{
      height: "3px",
      background: "var(--border-subtle)",
      borderRadius: "2px",
      overflow: "hidden",
      width: "48px",
      flexShrink: 0,
    }}>
      <div style={{
        height: "100%",
        width: `${pct}%`,
        background: "var(--accent)",
        borderRadius: "2px",
      }} />
    </div>
  );
}

export default async function CompanionLoopsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.toLowerCase();
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  const loops = await fetchLoops(id).catch(() => []);
  const open = loops.filter((l) => !l.closed_at);
  const closed = loops.filter((l) => l.closed_at);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/companions/${id}`} className="home-section-link">
          ← {config.display}
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">{config.display} · Open Loops</h1>
        <p className="page-subtitle">unresolved threads carried between sessions · heaviest first</p>
      </div>

      {open.length === 0 && (
        <div className="pending-notice">
          <div className="pending-dot" />
          No open loops right now.
        </div>
      )}

      {open.length > 0 && (
        <div className="card" style={{ padding: "0.5rem 0" }}>
          {open.map((loop) => (
            <div key={loop.id} className="journal-row" style={{ alignItems: "center", gap: "0.75rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="journal-text">{loop.loop_text}</div>
                <span className="journal-time">{fmtTime(loop.opened_at)}</span>
              </div>
              <WeightBar value={loop.weight} />
              <CloseLoopButton loopId={loop.id} companionId={id} />
            </div>
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginTop: "2rem" }}>
            Closed ({closed.length})
          </h2>
          <div className="card" style={{ padding: "0.5rem 0", opacity: 0.6 }}>
            {closed.slice(0, 10).map((loop) => (
              <div key={loop.id} className="journal-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="journal-text" style={{ textDecoration: "line-through" }}>
                    {loop.loop_text}
                  </div>
                  <span className="journal-time">{fmtTime(loop.closed_at!)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
