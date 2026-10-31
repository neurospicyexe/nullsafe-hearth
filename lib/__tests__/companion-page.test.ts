import { describe, it, expect } from "vitest";
import {
  COMPANION_IDS,
  COMPANION_NAME,
  parseCompanionId,
  doorGroups,
  companionDoors,
  groupForSlug,
  rundownLines,
  traceValid,
} from "../companion-page";
import type { CompanionId, CompanionRundown } from "../halseth";

function rundown(over: Partial<CompanionRundown> = {}): CompanionRundown {
  return {
    companion_id: "cypher",
    last_real_thing: null,
    last_looked_at: "2026-10-30 10:00:00",
    since_basis: "last_looked",
    since: { journal: 0, letters: 0, book_notes: 0, sol: 0, autonomy: 0 },
    doors: { journal: 1, letters_unread: 2, growth: 3, feelings: 4, upto: 5, made: 6 },
    trace: { soma_float_1: [], soma_float_2: [], soma_float_3: [] },
    ...over,
  };
}

const BASE_SLUGS = [
  "journal", "notes", "sitting", "letters", "growth", "worldview", "loops", "blocks",
  "feelings", "relational", "deltas", "autonomy", "projects", "made", "all",
];

describe("parseCompanionId", () => {
  it("lowercases a member", () => {
    expect(parseCompanionId("Cypher")).toBe("cypher");
    expect(parseCompanionId("drevan")).toBe("drevan");
    expect(parseCompanionId("GAIA")).toBe("gaia");
  });
  it("rejects anything else", () => {
    for (const raw of ["blue", "", "__proto__", "constructor", "cypher "]) {
      expect(parseCompanionId(raw), raw).toBeNull();
    }
  });
  it("names every id", () => {
    expect(COMPANION_IDS).toEqual(["drevan", "cypher", "gaia"]);
    expect(COMPANION_NAME).toEqual({ drevan: "Drevan", cypher: "Cypher", gaia: "Gaia" });
  });
});

describe("doorGroups", () => {
  const slugs = (id: CompanionId) => doorGroups(id).flatMap((g) => g.routes.map((r) => r.slug));

  it("gives Gaia witness, Cypher audit, Drevan neither", () => {
    expect(slugs("gaia")).toContain("witness");
    expect(slugs("gaia")).not.toContain("audit");
    expect(slugs("cypher")).toContain("audit");
    expect(slugs("cypher")).not.toContain("witness");
    expect(slugs("drevan")).not.toContain("audit");
    expect(slugs("drevan")).not.toContain("witness");
  });

  it("keeps every old sub-route reachable (exact union per companion)", () => {
    const extra: Record<CompanionId, string[]> = { drevan: [], cypher: ["audit"], gaia: ["witness"] };
    for (const id of COMPANION_IDS) {
      expect([...slugs(id)].sort(), id).toEqual([...BASE_SLUGS, ...extra[id]].sort());
    }
  });

  it("uses the labels and order of the table", () => {
    expect(doorGroups("drevan").map((g) => [g.key, g.label])).toEqual([
      ["journal", "Journal"],
      ["letters", "Letters"],
      ["growth", "Growth"],
      ["feelings", "Feelings"],
      ["upto", "What I've been up to"],
      ["made", "Made"],
      ["all", "Everything else"],
    ]);
    const growth = doorGroups("cypher").find((g) => g.key === "growth")!;
    expect(growth.routes).toEqual([
      { slug: "growth", label: "Growth" },
      { slug: "worldview", label: "Worldview" },
      { slug: "loops", label: "Open loops" },
      { slug: "blocks", label: "Blocks" },
      { slug: "audit", label: "Audit" },
    ]);
    const journal = doorGroups("gaia").find((g) => g.key === "journal")!;
    expect(journal.routes.map((r) => r.label)).toEqual(["Journal", "Notes", "Sitting with", "Witness"]);
    const upto = doorGroups("gaia").find((g) => g.key === "upto")!;
    expect(upto.routes).toEqual([
      { slug: "autonomy", label: "Autonomous runs" },
      { slug: "projects", label: "Projects" },
    ]);
  });
});

describe("companionDoors", () => {
  it("returns the six doors with counts mapped", () => {
    expect(companionDoors("gaia", rundown())).toEqual([
      { href: "/companions/gaia/journal", label: "Journal", count: 1 },
      { href: "/companions/gaia/letters", label: "Letters", count: 2 },
      { href: "/companions/gaia/growth", label: "Growth", count: 3 },
      { href: "/companions/gaia/feelings", label: "Feelings", count: 4 },
      { href: "/companions/gaia/autonomy", label: "What I've been up to", count: 5 },
      { href: "/companions/gaia/made", label: "Made", count: 6 },
    ]);
  });
  it("has no count keys when the rundown is null", () => {
    const doors = companionDoors("drevan", null);
    expect(doors).toHaveLength(6);
    for (const d of doors) expect("count" in d, d.href).toBe(false);
  });
});

describe("groupForSlug", () => {
  it("finds the group holding a slug", () => {
    expect(groupForSlug("cypher", "worldview")?.key).toBe("growth");
    expect(groupForSlug("gaia", "witness")?.key).toBe("journal");
    expect(groupForSlug("drevan", "projects")?.key).toBe("upto");
    expect(groupForSlug("drevan", "all")?.key).toBe("all");
  });
  it("is null for the overview, unknown slugs, and another companion's extra", () => {
    expect(groupForSlug("cypher", "")).toBeNull();
    expect(groupForSlug("cypher", "nope")).toBeNull();
    expect(groupForSlug("drevan", "audit")).toBeNull();
    expect(groupForSlug("cypher", "witness")).toBeNull();
  });
});

describe("rundownLines", () => {
  const now = Date.parse("2026-10-30T12:00:00Z");

  it("says This week on a first visit", () => {
    const r = rundown({ since_basis: "week", last_looked_at: null, since: { journal: 2, letters: 0, book_notes: 0, sol: 0, autonomy: 0 } });
    expect(rundownLines(r, now)).toEqual({ heading: "This week", lines: ["2 journal entries"] });
  });

  it("says since you last looked with the age", () => {
    const r = rundown({ since: { journal: 1, letters: 1, book_notes: 1, sol: 1, autonomy: 1 } });
    expect(rundownLines(r, now)).toEqual({
      heading: "Since you last looked (2h)",
      lines: ["1 journal entry", "1 letter", "1 book note", "1 Sol visit", "1 autonomous run"],
    });
  });

  it("pluralises and skips zeros, in order", () => {
    const r = rundown({ since: { journal: 0, letters: 3, book_notes: 2, sol: 2, autonomy: 4 } });
    expect(rundownLines(r, now).lines).toEqual(["3 letters", "2 book notes", "2 Sol visits", "4 autonomous runs"]);
  });

  it("says Nothing new when everything is zero", () => {
    expect(rundownLines(rundown(), now).lines).toEqual(["Nothing new."]);
  });
});

describe("traceValid", () => {
  it("needs exactly 7 numbers", () => {
    expect(traceValid([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7])).toBe(true);
    expect(traceValid([0.1, 0.2, null, 0.4, 0.5, 0.6, 0.7])).toBe(false);
    expect(traceValid([0.1, 0.2, 0.3, 0.4, 0.5, 0.6])).toBe(false);
    expect(traceValid([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8])).toBe(false);
    expect(traceValid([])).toBe(false);
  });
});
