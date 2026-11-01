import type { InboxItem, Note } from "./halseth";

export type LetterRow = {
  key: string;
  dir: "in" | "out";
  companion: string;
  at: string;
  text: string;
  read: boolean | null;
  href: string | null;
};

function companionOf(noteType: string): string {
  return typeof noteType === "string" && noteType.startsWith("letter:") ? noteType.slice("letter:".length) : "";
}

// Journal rows are "YYYY-MM-DD HH:MM:SS" (UTC, no zone); notes are ISO with Z. Parse both.
function ms(at: string): number {
  const iso = /[zZ]$|[+-]\d\d:?\d\d$/.test(at) ? at.replace(" ", "T") : `${at.replace(" ", "T")}Z`;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

// Both directions in one list, newest first, one row per direction and id.
export function mergeLetters(incoming: InboxItem[], outgoing: Note[]): LetterRow[] {
  const seen = new Set<string>();
  const rows: LetterRow[] = [];
  for (const it of incoming) {
    const key = `in:${it.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ key, dir: "in", companion: it.agent, at: it.created_at, text: it.preview, read: it.read, href: `/letters/${it.id}` });
  }
  for (const n of outgoing) {
    const key = `out:${n.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ key, dir: "out", companion: companionOf(n.note_type), at: n.created_at, text: n.content, read: null, href: null });
  }
  return rows.sort((a, b) => ms(b.at) - ms(a.at));
}

export function directionLabel(row: LetterRow, whoName: string): string {
  return row.dir === "in" ? `from ${whoName}` : `to ${whoName}`;
}
