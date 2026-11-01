// Pages as search targets: the four tabs, the hub doors and every Under the hood door. Pure, no React.
import { HOOD_SECTIONS, HUBS, TABS } from "./shell";

export type PageEntry = {
  href: string;
  label: string;
  hint?: string;
  /** The hub the page lives in, shown beside the result. Tabs themselves have none. */
  hub?: string;
};

const HUB_NAMES = { needs: "Needs you", together: "Together", archive: "Archive" } as const;

function buildIndex(): PageEntry[] {
  const all: PageEntry[] = [
    ...TABS.map((t) => ({ href: t.href, label: t.label })),
    { href: "/hood", label: "Under the hood", hint: "Everything behind the four tabs" },
    ...(["needs", "together", "archive"] as const).flatMap((k) =>
      HUBS[k].map((d) => ({ href: d.href, label: d.label, hint: d.hint, hub: HUB_NAMES[k] })),
    ),
    ...HOOD_SECTIONS.flatMap((s) => s.doors.map((d) => ({ href: d.href, label: d.label, hint: d.hint, hub: "Under the hood" }))),
  ];
  // First entry wins (its hub label stays), but it borrows a later duplicate's hint when it has none.
  const byHref = new Map<string, PageEntry>();
  for (const p of all) {
    const kept = byHref.get(p.href);
    if (!kept) byHref.set(p.href, { ...p });
    else if (!kept.hint && p.hint) kept.hint = p.hint;
  }
  return [...byHref.values()];
}

export const PAGE_INDEX: PageEntry[] = buildIndex();

/** Case-insensitive match on label, then hint. Label-prefix first, then label contains, then hint. */
export function matchPages(query: string, limit = 6): PageEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const ranked: { p: PageEntry; rank: number }[] = [];
  for (const p of PAGE_INDEX) {
    const label = p.label.toLowerCase();
    const rank = label.startsWith(q) ? 0 : label.includes(q) ? 1 : p.hint?.toLowerCase().includes(q) ? 2 : -1;
    if (rank >= 0) ranked.push({ p, rank });
  }
  // Array.prototype.sort is stable, so equal ranks keep index order.
  return ranked.sort((a, b) => a.rank - b.rank).slice(0, limit).map((r) => r.p);
}
