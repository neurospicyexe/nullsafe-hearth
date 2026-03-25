export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchSomaFeelings } from "@/lib/halseth";
import { COMPANION_CONFIG } from "../sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function IntensityBar({ value }: { value: number }) {
  return (
    <div style={{
      height: "3px",
      background: "var(--border-subtle)",
      borderRadius: "2px",
      overflow: "hidden",
      width: "60px",
      flexShrink: 0,
    }}>
      <div style={{
        height: "100%",
        width: `${value}%`,
        background: "var(--accent)",
        borderRadius: "2px",
        transition: "width 0.3s var(--ease-out)",
      }} />
    </div>
  );
}

export default async function CompanionFeelingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.toLowerCase();
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  const feelings = await fetchSomaFeelings(id, 100).catch(() => []);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/companions/${id}`} className="home-section-link">
          ← {config.display}
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">{config.display} · SOMA Feelings</h1>
        <p className="page-subtitle">somatic emotional record — intensity and source</p>
      </div>

      {feelings.length === 0 && (
        <div className="pending-notice">
          <div className="pending-dot" />
          No SOMA feelings recorded yet.
        </div>
      )}

      <div className="card" style={{ padding: "0.5rem 0" }}>
        {feelings.map((f) => (
          <div key={f.id} className="journal-row" style={{ alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="journal-text">
                {f.emotion}{f.sub_emotion ? ` · ${f.sub_emotion}` : ""}
              </div>
              {f.source && (
                <span className="page-subtitle" style={{ fontSize: "0.78rem" }}>
                  {f.source}
                </span>
              )}
            </div>
            <IntensityBar value={f.intensity} />
            <span className="journal-time">{fmtTime(f.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
