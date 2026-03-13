export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchCompanionDeltas } from "@/lib/halseth";
import { COMPANION_CONFIG, DeltasSection } from "../sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

export default async function CompanionDeltasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.toLowerCase();
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  const deltaEntries = await fetchCompanionDeltas(id, 200);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/companions/${id}`} className="home-section-link">
          ← {config.display}
        </Link>
      </div>
      <h1 style={{ marginBottom: "1.5rem" }}>{config.display} · Relational Deltas</h1>
      <DeltasSection deltas={deltaEntries} />
    </div>
  );
}
