import { describe, it, expect } from "vitest";
import { TABS, HUBS, activeTab, shellHidden, badgeText, COMPANION_COLOR, focusRefreshDue, FOCUS_REFRESH_MIN_MS, latestOnly } from "../shell";
import nextConfig from "../../next.config";

/** Frozen copy of every href the retired sidebar Nav carried; each must stay reachable from the new tabs and hubs. */
const NAV_HREFS: readonly string[] = Object.freeze([
  "/",
  "/halseth",
  "/today",
  "/checkin",
  "/soma",
  "/wellness",
  "/us",
  "/log",
  "/between",
  "/phoenix/chat",
  "/presence",
  "/orient",
  "/feelings",
  "/questions",
  "/home",
  "/autonomous",
  "/agency",
  "/drifts",
  "/basins",
  "/guardian",
  "/council",
  "/map",
  "/people",
  "/club",
  "/shelf",
  "/library",
  "/gallery",
  "/creatures",
  "/collection",
  "/imps",
  "/handovers",
  "/sessions",
  "/dreams",
  "/memory",
  "/synthesis",
  "/facts",
  "/tray",
  "/manage",
  "/shared",
  "/tasks",
  "/house",
  "/phoenix",
]);

describe("activeTab", () => {
  it("maps routes to tabs", () => {
    expect(activeTab("/")).toBe("Home");
    expect(activeTab("/needs")).toBe("Needs you");
    expect(activeTab("/club")).toBe("Together");
    expect(activeTab("/handovers")).toBe("Archive");
    expect(activeTab("/companions/cypher")).toBe("Home");
  });
  it("returns null for routes owned by no tab", () => {
    expect(activeTab("/soma")).toBeNull();
  });
  it("matches on a segment boundary", () => {
    expect(activeTab("/clubhouse")).toBeNull();
    expect(activeTab("/club/round-1")).toBe("Together");
  });
});

describe("shellHidden", () => {
  it("hides only on the reader and login", () => {
    expect(shellHidden("/library/abc")).toBe(true);
    expect(shellHidden("/library")).toBe(false);
    expect(shellHidden("/login")).toBe(true);
    expect(shellHidden("/")).toBe(false);
  });
});

describe("needs hub", () => {
  it("keeps the full-history doors and drops /questions", () => {
    expect(HUBS.needs).toEqual([
      { href: "/manage", label: "Growth journal" },
      { href: "/guardian", label: "Guardian" },
      { href: "/basins", label: "Basins" },
    ]);
  });
});

describe("reachability", () => {
  it("every old nav href is reachable", () => {
    const reachable = new Set<string>([
      ...TABS.map((t) => t.href),
      ...Object.values(HUBS).flatMap((h) => h.map((d) => d.href)),
    ]);
    // /questions is absorbed into /needs (open questions + "Recently answered" live there).
    // /handovers is absorbed into /sessions (redirect below).
    const absorbed = new Set(["/today", "/checkin", "/questions", "/handovers"]);
    // /synthesis is linked from the Memory page, not a door; app/memory/page.test.tsx pins that link.
    const linkedFromPages = new Set(["/synthesis"]);
    const missing = NAV_HREFS.filter((h) => !absorbed.has(h) && !linkedFromPages.has(h) && !reachable.has(h));
    expect(missing).toEqual([]);
  });
  it("companion colors are css vars", () => {
    expect(COMPANION_COLOR.drevan).toBe("var(--h-drevan)");
  });
});

describe("redirects", () => {
  it("forwards /today and /checkin home, temporarily", async () => {
    const redirects = await nextConfig.redirects!();
    for (const source of ["/today", "/checkin"]) {
      const r = redirects.find((x) => x.source === source);
      expect(r, source).toBeDefined();
      expect(r!.destination).toBe("/");
      expect((r as { permanent?: boolean }).permanent).toBe(false);
    }
  });

  it("forwards /questions to /needs, temporarily", async () => {
    const redirects = await nextConfig.redirects!();
    const r = redirects.find((x) => x.source === "/questions");
    expect(r).toBeDefined();
    expect(r!.destination).toBe("/needs");
    expect((r as { permanent?: boolean }).permanent).toBe(false);
  });
});

describe("archive hub", () => {
  it("has exactly the five doors in order", () => {
    expect(HUBS.archive.map((d) => [d.href, d.label])).toEqual([
      ["/letters", "Letters"],
      ["/journal", "Journals"],
      ["/sessions", "Sessions and handovers"],
      ["/dreams", "Dreams"],
      ["/memory", "Memory and synthesis"],
    ]);
  });
  it("drops the retired doors", () => {
    const hrefs = HUBS.archive.map((d) => d.href);
    for (const h of ["/handovers", "/synthesis", "/overview", "/hood"]) expect(hrefs).not.toContain(h);
  });
  it("keeps Old home under the hood", () => {
    expect(HUBS.hood).toContainEqual({ href: "/overview", label: "Old home" });
  });
});

describe("handovers redirect", () => {
  it("forwards /handovers to /sessions, temporarily", async () => {
    const redirects = await nextConfig.redirects!();
    const r = redirects.find((x) => x.source === "/handovers");
    expect(r).toBeDefined();
    expect(r!.destination).toBe("/sessions");
    expect((r as { permanent?: boolean }).permanent).toBe(false);
  });
});

describe("badgeText", () => {
  it("hides when unknown or zero", () => {
    expect(badgeText(null)).toBeNull();
    expect(badgeText(0)).toBeNull();
  });
  it("shows the count, capped at 9+", () => {
    expect(badgeText(3)).toBe("3");
    expect(badgeText(9)).toBe("9");
    expect(badgeText(10)).toBe("9+");
  });
});

describe("focusRefreshDue", () => {
  it("refreshes when nothing has been fetched yet", () => {
    expect(focusRefreshDue(null, 1_000)).toBe(true);
  });
  it("skips a focus within 30 seconds of the last fetch", () => {
    expect(focusRefreshDue(100_000, 100_000 + 29_999)).toBe(false);
  });
  it("refreshes once 30 seconds have passed", () => {
    expect(focusRefreshDue(100_000, 130_000)).toBe(true);
    expect(FOCUS_REFRESH_MIN_MS).toBe(30_000);
  });
});

describe("latestOnly", () => {
  it("only the most recently started request may apply its response", () => {
    const seq = latestOnly();
    const a = seq.start();
    const b = seq.start();
    expect(seq.isLatest(a)).toBe(false);
    expect(seq.isLatest(b)).toBe(true);
    const c = seq.start();
    expect(seq.isLatest(b)).toBe(false);
    expect(seq.isLatest(c)).toBe(true);
  });
});
