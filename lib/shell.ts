// Shell routing: four tabs, hub doors, and where the shell hides. Pure, no React.

export type TabLabel = "Home" | "Needs you" | "Together" | "Archive";
export type Tab = { href: string; label: TabLabel; match: string[] };
/** `count` > 0 shows a "new" pill after the label (companion page doors). */
export type Door = { href: string; label: string; hint?: string; count?: number };

export const TABS: Tab[] = [
  { href: "/", label: "Home", match: ["/", "/companions"] },
  { href: "/needs", label: "Needs you", match: ["/needs", "/questions", "/manage", "/guardian", "/basins"] },
  {
    href: "/together",
    label: "Together",
    match: ["/together", "/club", "/creatures", "/library", "/shelf", "/gallery", "/collection", "/home", "/phoenix/chat"],
  },
  {
    href: "/archive",
    label: "Archive",
    match: ["/archive", "/letters", "/handovers", "/sessions", "/dreams", "/memory", "/synthesis", "/journal", "/overview",
      "/hood",
      "/facts", "/tray", "/feelings", "/threads", "/drifts", "/agency", "/imps", "/orient", "/soma", "/presence",
      "/us", "/between", "/council", "/mind", "/log", "/shared",
      "/autonomous", "/tasks", "/map", "/people", "/halseth", "/phoenix",
      "/user", "/house", "/wellness",
    ],
  },
];

function under(pathname: string, base: string): boolean {
  return base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(base + "/");
}

export function activeTab(pathname: string): string | null {
  for (const tab of TABS) {
    if (tab.match.some((m) => under(pathname, m))) return tab.label;
  }
  return null;
}

/** Tab badge text: null hides it (unknown count or nothing waiting); capped so it fits the pill. */
export function badgeText(n: number | null): string | null {
  if (n === null || n <= 0) return null;
  return n > 9 ? "9+" : String(n);
}

/** A window focus refreshes the badge at most this often; route changes and resolves always refresh. */
export const FOCUS_REFRESH_MIN_MS = 30_000;

/** Whether a focus should refetch the count, given when the last fetch (from any trigger) started. */
export function focusRefreshDue(lastFetchMs: number | null, nowMs: number): boolean {
  return lastFetchMs === null || nowMs - lastFetchMs >= FOCUS_REFRESH_MIN_MS;
}

/** Request sequencing: only the most recently started request may apply its response. */
export function latestOnly(): { start: () => number; isLatest: (n: number) => boolean } {
  let seq = 0;
  return { start: () => ++seq, isLatest: (n) => n === seq };
}

/** The reader and the login page get the whole screen. */
export function shellHidden(pathname: string): boolean {
  return pathname === "/login" || /^\/library\/[^/]+/.test(pathname);
}

/** Under the hood, grouped. The care pages (/user, /house, /wellness, /overview) live only here. */
export const HOOD_SECTIONS: { title: string; doors: Door[] }[] = [
  {
    title: "Their minds",
    doors: [
      { href: "/facts", label: "Facts", hint: "What they know about you, by topic" },
      { href: "/tray", label: "Tray", hint: "Drafted memories waiting to be kept or dropped" },
      { href: "/feelings", label: "Feelings", hint: "What each of them has written down feeling" },
      { href: "/threads", label: "Landscape", hint: "Their open threads and emotional landscape" },
      { href: "/drifts", label: "Drift", hint: "Where a voice slipped from its own lane" },
      { href: "/agency", label: "Agency", hint: "What they chose to do on their own" },
      { href: "/imps", label: "Imps", hint: "The five helpers and what each one does" },
      { href: "/orient", label: "Orient", hint: "What each of them loads when they wake" },
      { href: "/soma", label: "Soma", hint: "Body-state and tensions, per companion" },
      { href: "/presence", label: "Presence", hint: "How each of them seems right now" },
    ],
  },
  {
    title: "Between them",
    doors: [
      { href: "/us", label: "Us", hint: "Relational moments, letters and recent handovers" },
      { href: "/between", label: "Between", hint: "Notes they leave for each other" },
      { href: "/council", label: "Council", hint: "Group discussions and past councils" },
      { href: "/mind", label: "Notes and journals", hint: "Companion notes and journals" },
      { href: "/log", label: "Log", hint: "The wall you and they write on" },
      { href: "/shared", label: "Shared", hint: "Things they hold in common" },
    ],
  },
  {
    title: "Running it",
    doors: [
      { href: "/autonomous", label: "Autonomous", hint: "What runs on its own while you are away" },
      { href: "/guardian", label: "Guardian", hint: "Flags and the weekly letter" },
      { href: "/basins", label: "Basins", hint: "Identity drift per companion, last 90 days" },
      { href: "/manage", label: "Growth journal", hint: "Growth entries waiting for your yes or no" },
      { href: "/tasks", label: "Tasks", hint: "Open tasks and who holds them" },
      { href: "/map", label: "Map", hint: "The memory map and what links to what" },
      { href: "/people", label: "People", hint: "Names the map is allowed to link" },
      { href: "/halseth", label: "Halseth", hint: "The backend and the room it is in" },
      { href: "/phoenix", label: "Phoenix", hint: "House of Integration and the metronome" },
    ],
  },
  {
    title: "You and the house",
    doors: [
      { href: "/user", label: "You", hint: "Your state, threads and notes" },
      { href: "/house", label: "House", hint: "Current room, spoon count and love meter" },
      { href: "/wellness", label: "Wellness", hint: "Patterns across your sessions, last 60 days" },
      { href: "/overview", label: "Old home", hint: "The previous home page" },
    ],
  },
];

export const HUBS: Record<"needs" | "together" | "archive" | "hood", Door[]> = {
  needs: [
    // Full histories. Open questions live on /needs itself (with "Recently answered"), so /questions has no door.
    { href: "/manage", label: "Growth journal" },
    { href: "/guardian", label: "Guardian" },
    { href: "/basins", label: "Basins" },
  ],
  together: [
    { href: "/club", label: "Club" },
    { href: "/creatures", label: "Sol" },
    { href: "/library", label: "Library" },
    { href: "/shelf", label: "Shelf" },
    { href: "/gallery", label: "Gallery" },
    { href: "/collection", label: "Collection" },
    { href: "/home", label: "The Home" },
    { href: "/phoenix/chat", label: "Talk to them" },
  ],
  archive: [
    { href: "/letters", label: "Letters" },
    { href: "/journal", label: "Journals" },
    { href: "/sessions", label: "Sessions and handovers" },
    { href: "/dreams", label: "Dreams" },
    { href: "/memory", label: "Memory and synthesis" },
  ],
  hood: HOOD_SECTIONS.flatMap((s) => s.doors),
};


export const COMPANION_COLOR: Record<"drevan" | "cypher" | "gaia", string> = {
  drevan: "var(--h-drevan)",
  cypher: "var(--h-cypher)",
  gaia: "var(--h-gaia)",
};
