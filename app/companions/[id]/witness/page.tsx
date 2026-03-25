export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchGaiaWitness } from "@/lib/halseth";
import { GaiaWitnessSection } from "../sections";

export function generateStaticParams() {
  return [{ id: "gaia" }];
}

export default async function CompanionWitnessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.toLowerCase();
  if (id !== "gaia") notFound();

  const witnessEntries = await fetchGaiaWitness(200);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/companions/gaia" className="home-section-link">
          ← Gaia
        </Link>
      </div>
      <h1 style={{ marginBottom: "1.5rem" }}>Gaia · Witness Log</h1>
      <GaiaWitnessSection entries={witnessEntries ?? []} />
    </div>
  );
}
