export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import { parseCompanionId } from "@/lib/companion-page";
import { fetchCompanionJournal } from "@/lib/halseth";
import { COMPANION_CONFIG, JournalSection } from "../sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

export default async function CompanionJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseCompanionId(rawId);
  if (!id) notFound();
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  // Substantive lane only: the overview's Journal door counts it, so the page lists the same set
  // (Discord speech transcripts and clerk rows stay reachable from /all and search).
  const journalEntries = await fetchCompanionJournal(id, 200, { substantive: true }).catch(() => null);

  return (
    <div>
      <h1 style={{ marginBottom: "1.5rem" }}>{config.display} · Identity Journal</h1>
      <JournalSection entries={journalEntries ?? []} />
    </div>
  );
}
