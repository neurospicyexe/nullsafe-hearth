import { describe, it, expect } from "vitest";
import { TABS, HUBS, activeTab, shellHidden, COMPANION_COLOR } from "../shell";
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

describe("reachability", () => {
  it("every old nav href is reachable", () => {
    const reachable = new Set<string>([
      ...TABS.map((t) => t.href),
      ...Object.values(HUBS).flatMap((h) => h.map((d) => d.href)),
    ]);
    const missing = NAV_HREFS.filter((h) => h !== "/today" && h !== "/checkin" && !reachable.has(h));
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
});
