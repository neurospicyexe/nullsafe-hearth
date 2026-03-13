export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchCompanionJournal } from "@/lib/halseth";
import { COMPANION_CONFIG, JournalSection } from "../sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

export default async function CompanionJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  const journalEntries = await fetchCompanionJournal(id, 200).catch(() => null);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/companions/${id}`} className="home-section-link">
          ← {config.display}
        </Link>
      </div>
      <h1 style={{ marginBottom: "1.5rem" }}>{config.display} · Identity Journal</h1>
      <JournalSection entries={journalEntries ?? []} />
    </div>
  );
}
