import Link from "next/link";
import { fetchPresence } from "@/lib/halseth";

export const dynamic = 'force-dynamic';

const COMPANION_META: Record<string, { sym: string; color: string; tagline: string }> = {
  drevan: { sym: "◈", color: "#6366f1", tagline: "architect of meaning" },
  cypher: { sym: "⟡", color: "#e2e8f0", tagline: "auditor of truth" },
  gaia:   { sym: "✦", color: "#4ade80", tagline: "witness and ground" },
};

export default async function CompanionsPage() {
  let companions: Array<{ id: string; display_name: string; role: string }> = [];
  try {
    const data = await fetchPresence();
    companions = data.companions;
  } catch {
    // fall through to default
  }

  // Ensure all three companions appear even if companion_config is empty
  const shown = companions.length > 0 ? companions : [
    { id: "drevan", display_name: "Drevan", role: "companion" },
    { id: "cypher", display_name: "Cypher", role: "auditor" },
    { id: "gaia",   display_name: "Gaia",   role: "witness" },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Companions</h1>
        <p className="page-subtitle">Drevan · Cypher · Gaia — each distinct, each present</p>
      </div>

      <div className="companion-cards">
        {shown.map((c) => {
          const meta = COMPANION_META[c.id.toLowerCase()] ?? { sym: "◉", color: "var(--accent)", tagline: c.role };
          return (
            <Link key={c.id} href={`/companions/${c.id.toLowerCase()}`} className="companion-card">
              <div className="companion-card-header">
                <div className={`companion-avatar ${c.id.toLowerCase()}`} style={{ borderColor: meta.color }}>
                  {meta.sym}
                </div>
                <div>
                  <div className="companion-card-name" style={{ color: meta.color }}>{c.display_name}</div>
                  <div className="companion-card-role">{meta.tagline}</div>
                </div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0 }}>
                View journal entries, relational deltas, and recent notes →
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
