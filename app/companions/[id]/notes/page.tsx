export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchNotes } from "@/lib/halseth";
import { COMPANION_CONFIG, NotesSection } from "../sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

export default async function CompanionNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.toLowerCase();
  const config = COMPANION_CONFIG[id];
  if (!config) notFound();

  const allNotes = await fetchNotes(200);
  const filteredNotes = allNotes.filter(
    (n) => n.author === id && n.note_type !== `letter:${id}`,
  );

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/companions/${id}`} className="home-section-link">
          ← {config.display}
        </Link>
      </div>
      <h1 style={{ marginBottom: "1.5rem" }}>{config.display} · Notes</h1>
      <NotesSection notes={filteredNotes} companionId={id} />
    </div>
  );
}
