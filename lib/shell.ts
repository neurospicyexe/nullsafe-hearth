// Shell routing: four tabs, hub doors, and where the shell hides. Pure, no React.

export type TabLabel = "Home" | "Needs you" | "Together" | "Archive";
export type Tab = { href: string; label: TabLabel; match: string[] };
export type Door = { href: string; label: string; hint?: string };

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
    match: ["/archive", "/letters", "/handovers", "/sessions", "/dreams", "/memory", "/synthesis", "/journal", "/overview", "/hood"],
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

/** The reader and the login page get the whole screen. */
export function shellHidden(pathname: string): boolean {
  return pathname === "/login" || /^\/library\/[^/]+/.test(pathname);
}

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
    { href: "/handovers", label: "Handovers" },
    { href: "/sessions", label: "Sessions" },
    { href: "/dreams", label: "Dreams" },
    { href: "/memory", label: "Memory" },
    { href: "/synthesis", label: "Synthesis" },
    { href: "/journal", label: "Journal" },
    { href: "/overview", label: "Old home" },
    { href: "/hood", label: "Under the hood" },
  ],
  hood: [
    { href: "/halseth", label: "Halseth" },
    { href: "/soma", label: "Soma" },
    { href: "/wellness", label: "Wellness" },
    { href: "/us", label: "Us" },
    { href: "/log", label: "Log" },
    { href: "/between", label: "Between" },
    { href: "/presence", label: "Presence" },
    { href: "/orient", label: "Orient" },
    { href: "/feelings", label: "Feelings" },
    { href: "/autonomous", label: "Autonomous" },
    { href: "/agency", label: "Agency" },
    { href: "/drifts", label: "Drift lane" },
    { href: "/council", label: "Council" },
    { href: "/map", label: "Map" },
    { href: "/people", label: "People" },
    { href: "/imps", label: "Imps" },
    { href: "/facts", label: "Facts" },
    { href: "/tray", label: "Tray" },
    { href: "/manage", label: "Manage" },
    { href: "/shared", label: "Shared" },
    { href: "/tasks", label: "Tasks" },
    { href: "/house", label: "House" },
    { href: "/phoenix", label: "Phoenix" },
  ],
};

export const COMPANION_COLOR: Record<"drevan" | "cypher" | "gaia", string> = {
  drevan: "var(--h-drevan)",
  cypher: "var(--h-cypher)",
  gaia: "var(--h-gaia)",
};
