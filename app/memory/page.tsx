export const dynamic = "force-dynamic";

import {
  fetchAllCompanionNotes,
  fetchSomaFeelings,
  fetchTensions,
  fetchSittingNotes,
} from "@/lib/halseth";
import MemoryBrowserClient, { type MemoryEntry } from "./MemoryBrowserClient";

export default async function MemoryPage() {
  const [notes, feelings, tensions, sitsC, sitsD, sitsG] =
    await Promise.allSettled([
      fetchAllCompanionNotes(150),
      fetchSomaFeelings(undefined, 150),
      fetchTensions(undefined, 60),
      fetchSittingNotes("cypher"),
      fetchSittingNotes("drevan"),
      fetchSittingNotes("gaia"),
    ]);

  const entries: MemoryEntry[] = [];

  if (notes.status === "fulfilled") {
    for (const n of notes.value) {
      // tags comes from D1 as raw JSON text, not a parsed array
      let parsedTags: string[] | undefined;
      if (Array.isArray(n.tags)) {
        parsedTags = n.tags;
      } else if (typeof n.tags === "string" && n.tags) {
        try { parsedTags = JSON.parse(n.tags); } catch { /* ignore */ }
      }
      entries.push({
        id:         n.id,
        type:       "companion_note",
        companion:  n.agent,
        content:    n.note_text,
        tags:       Array.isArray(parsedTags) ? parsedTags : undefined,
        created_at: n.created_at,
      });
    }
  }

  if (feelings.status === "fulfilled") {
    for (const f of feelings.value) {
      const parts = [f.emotion, f.sub_emotion, f.intensity != null ? `${f.intensity}%` : null]
        .filter(Boolean)
        .join(" · ");
      entries.push({
        id:         f.id,
        type:       "feeling",
        companion:  f.companion_id,
        content:    parts,
        created_at: f.created_at,
      });
    }
  }

  if (tensions.status === "fulfilled") {
    for (const t of tensions.value) {
      entries.push({
        id:         t.id,
        type:       "tension",
        companion:  t.companion_id,
        content:    t.tension_text,
        created_at: t.first_noted_at,
      });
    }
  }

  for (const [result, agentId] of [
    [sitsC, "cypher"],
    [sitsD, "drevan"],
    [sitsG, "gaia"],
  ] as const) {
    if (result.status === "fulfilled") {
      for (const s of result.value) {
        entries.push({
          id:         s.note_id,
          type:       "sit",
          companion:  agentId,
          content:    s.sit_text ?? s.content,
          created_at: s.sat_at,
        });
      }
    }
  }

  entries.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return <MemoryBrowserClient entries={entries} />;
}
