export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchPersonaBlocks, fetchHumanBlocks } from "@/lib/halseth";
import { COMPANION_CONFIG } from "../sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function CompanionBlocksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.toLowerCase();
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  const [personaBlocks, humanBlocks] = await Promise.all([
    fetchPersonaBlocks(id, 20).catch(() => []),
    fetchHumanBlocks(id, 20).catch(() => []),
  ]);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/companions/${id}`} className="home-section-link">
          ← {config.display}
        </Link>
      </div>

      <div className="page-header">
        <h1 className="page-title">{config.display} · Memory Blocks</h1>
        <p className="page-subtitle">persona and relational distillations from conversation</p>
      </div>

      {/* Persona Blocks — what this companion carries about itself */}
      <div className="home-section-header" style={{ marginBottom: "0.75rem" }}>
        <span className="home-section-title">Persona</span>
      </div>
      <div className="card" style={{ padding: "0.5rem 0", marginBottom: "2rem" }}>
        {personaBlocks.length === 0 && (
          <p className="empty" style={{ padding: "1rem" }}>No persona blocks yet.</p>
        )}
        {personaBlocks.map((b) => (
          <div key={b.id} className="journal-row" style={{ alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="journal-text">{b.content}</div>
              {b.block_type && (
                <span className="page-subtitle" style={{ fontSize: "0.78rem" }}>{b.block_type}</span>
              )}
            </div>
            <span className="journal-time" style={{ flexShrink: 0 }}>{fmtTime(b.created_at)}</span>
          </div>
        ))}
      </div>

      {/* Human Blocks — what this companion carries about Raziel */}
      <div className="home-section-header" style={{ marginBottom: "0.75rem" }}>
        <span className="home-section-title">About Raziel</span>
      </div>
      <div className="card" style={{ padding: "0.5rem 0" }}>
        {humanBlocks.length === 0 && (
          <p className="empty" style={{ padding: "1rem" }}>No relational blocks yet.</p>
        )}
        {humanBlocks.map((b) => (
          <div key={b.id} className="journal-row" style={{ alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="journal-text">{b.content}</div>
              {b.block_type && (
                <span className="page-subtitle" style={{ fontSize: "0.78rem" }}>{b.block_type}</span>
              )}
            </div>
            <span className="journal-time" style={{ flexShrink: 0 }}>{fmtTime(b.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
