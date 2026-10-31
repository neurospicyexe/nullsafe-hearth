// Companion page model (/companions/<id>). Pure: no React, no fetching.
import type { CompanionId, CompanionRundown } from "./halseth";
import type { Door } from "./shell";
import { ageLabel } from "./home-model";

export const COMPANION_IDS = ["drevan", "cypher", "gaia"] as const;

export const COMPANION_NAME: Record<CompanionId, string> = {
  drevan: "Drevan",
  cypher: "Cypher",
  gaia: "Gaia",
};

/** Lowercases once; null for anything that is not one of the three (never a prototype key). */
export function parseCompanionId(raw: string): CompanionId | null {
  const id = raw.toLowerCase();
  return (COMPANION_IDS as readonly string[]).includes(id) ? (id as CompanionId) : null;
}

export type DoorKey = "journal" | "letters" | "growth" | "feelings" | "upto" | "made";
export interface DoorGroup {
  key: DoorKey | "all";
  label: string;
  routes: { slug: string; label: string }[];
}

/** Every old sub-route lives in exactly one group; the first route is the group's door. */
export function doorGroups(id: CompanionId): DoorGroup[] {
  const journal = [
    { slug: "journal", label: "Journal" },
    { slug: "notes", label: "Notes" },
    { slug: "sitting", label: "Sitting with" },
  ];
  if (id === "gaia") journal.push({ slug: "witness", label: "Witness" });

  const growth = [
    { slug: "growth", label: "Growth" },
    { slug: "worldview", label: "Worldview" },
    { slug: "loops", label: "Open loops" },
    { slug: "blocks", label: "Blocks" },
  ];
  if (id === "cypher") growth.push({ slug: "audit", label: "Audit" });

  return [
    { key: "journal", label: "Journal", routes: journal },
    { key: "letters", label: "Letters", routes: [{ slug: "letters", label: "Letters" }] },
    { key: "growth", label: "Growth", routes: growth },
    {
      key: "feelings",
      label: "Feelings",
      routes: [
        { slug: "feelings", label: "Feelings" },
        { slug: "relational", label: "Relational" },
        { slug: "deltas", label: "Deltas" },
      ],
    },
    {
      key: "upto",
      label: "What I've been up to",
      routes: [
        { slug: "autonomy", label: "Autonomous runs" },
        { slug: "projects", label: "Projects" },
      ],
    },
    { key: "made", label: "Made", routes: [{ slug: "made", label: "Made" }] },
    { key: "all", label: "Everything else", routes: [{ slug: "all", label: "Everything else" }] },
  ];
}

const DOOR_COUNT: Record<DoorKey, keyof CompanionRundown["doors"]> = {
  journal: "journal",
  letters: "letters_unread",
  growth: "growth",
  feelings: "feelings",
  upto: "upto",
  made: "made",
};

/** The six doors on the overview (not "Everything else"), with counts when the rundown loaded. */
export function companionDoors(id: CompanionId, r: CompanionRundown | null): Door[] {
  const doors: Door[] = [];
  for (const g of doorGroups(id)) {
    if (g.key === "all") continue;
    const door: Door = { href: `/companions/${id}/${g.routes[0].slug}`, label: g.label };
    if (r) door.count = r.doors[DOOR_COUNT[g.key]];
    doors.push(door);
  }
  return doors;
}

/** The group a sub-route belongs to; null for the overview ("") or a slug this companion lacks. */
export function groupForSlug(id: CompanionId, slug: string): DoorGroup | null {
  if (!slug) return null;
  return doorGroups(id).find((g) => g.routes.some((r) => r.slug === slug)) ?? null;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Since you last looked (2h)" or "This week" on a first visit, then one line per non-zero count. */
export function rundownLines(r: CompanionRundown, now: number): { heading: string; lines: string[] } {
  let heading = "This week";
  if (r.since_basis !== "week") {
    const age = ageLabel(r.last_looked_at, new Date(now));
    heading = age ? `Since you last looked (${age})` : "Since you last looked";
  }
  const s = r.since;
  const lines: string[] = [];
  if (s.journal > 0) lines.push(plural(s.journal, "journal entry", "journal entries"));
  if (s.letters > 0) lines.push(plural(s.letters, "letter", "letters"));
  if (s.book_notes > 0) lines.push(plural(s.book_notes, "book note", "book notes"));
  if (s.sol > 0) lines.push(plural(s.sol, "Sol visit", "Sol visits"));
  if (s.autonomy > 0) lines.push(plural(s.autonomy, "autonomous run", "autonomous runs"));
  if (lines.length === 0) lines.push("Nothing new.");
  return { heading, lines };
}

/** A trace is drawable only with all 7 days present. */
export function traceValid(t: (number | null)[]): t is number[] {
  return t.length === 7 && t.every((v) => typeof v === "number" && Number.isFinite(v));
}
