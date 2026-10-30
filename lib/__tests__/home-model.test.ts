import { describe, it, expect } from "vitest";
import { buildWhoIsHome, buildLeftForYou, currentBook, ageLabel, greeting } from "../home-model";
import type { SomaData, InboxResponse, Book } from "../halseth";

const now = new Date("2026-10-29T20:00:00Z");

function row(over: Record<string, unknown> = {}) {
  return {
    companion_id: "drevan",
    soma_float_1: 0.5, soma_float_2: 0.25, soma_float_3: 0.75,
    float_1_label: "heat", float_2_label: "reach", float_3_label: "weight",
    compound_state: null, current_mood: null,
    surface_emotion: null, surface_intensity: null,
    undercurrent_emotion: null, undercurrent_intensity: null,
    heat: null, reach: null, weight: null,
    mood_set_at: "2026-10-29 19:00:00",
    updated_at: "2026-10-29 19:58:00",
    ...over,
  };
}
function soma(d: Record<string, unknown> | null, c: Record<string, unknown> | null = null, g: Record<string, unknown> | null = null): SomaData {
  return { drevan: d, cypher: c, gaia: g, fetched_at: "x" } as unknown as SomaData;
}

describe("buildWhoIsHome", () => {
  it("handles null soma", () => {
    const rows = buildWhoIsHome(null, now);
    expect(rows.map((r) => r.name)).toEqual(["Drevan", "Cypher", "Gaia"]);
    expect(rows.every((r) => r.bars.length === 0 && r.status === null && r.seenLabel === "")).toBe(true);
  });
  it("status prefers current_mood then compound_state", () => {
    const rows = buildWhoIsHome(soma(row({ current_mood: "warm", compound_state: "steady" }), row({ compound_state: "steady" })), now);
    expect(rows[0].status).toBe("warm");
    expect(rows[1].status).toBe("steady");
    expect(rows[2].status).toBeNull();
  });
  it("statusStale when mood_set_at > 24h", () => {
    const rows = buildWhoIsHome(
      soma(row({ current_mood: "warm", mood_set_at: "2026-10-28 18:00:00" }), row({ current_mood: "calm" })),
      now,
    );
    expect(rows[0].statusStale).toBe(true);
    expect(rows[1].statusStale).toBe(false);
  });
  it("bars clamp and use row labels", () => {
    const rows = buildWhoIsHome(soma(row({ soma_float_1: 1.4, soma_float_2: -1, float_1_label: "fire" })), now);
    expect(rows[0].bars[0]).toEqual({ label: "fire", pct: 100 });
    expect(rows[0].bars[1].pct).toBe(0);
    expect(rows[0].bars[2]).toEqual({ label: "weight", pct: 75 });
  });
  it("omits bars whose float is null", () => {
    const rows = buildWhoIsHome(soma(row({ soma_float_2: null })), now);
    expect(rows[0].bars.map((b) => b.label)).toEqual(["heat", "weight"]);
  });
  it("seenLabel from seen_at (the companion's own last act)", () => {
    expect(buildWhoIsHome(soma(row({ seen_at: "2026-10-29T19:59:30.000Z" })), now)[0].seenLabel).toBe("now");
    expect(buildWhoIsHome(soma(row({ seen_at: "2026-10-29T19:56:00.000Z" })), now)[0].seenLabel).toBe("4m");
    expect(buildWhoIsHome(soma(row({ seen_at: "2026-10-29T18:00:00.000Z" })), now)[0].seenLabel).toBe("2h");
    expect(buildWhoIsHome(soma(row({ seen_at: "2026-10-27T20:00:00.000Z" })), now)[0].seenLabel).toBe("2d");
  });
  it("seenLabel never falls back to updated_at (the ferment cron moves it hourly)", () => {
    expect(buildWhoIsHome(soma(row({ updated_at: "2026-10-29 19:59:30" })), now)[0].seenLabel).toBe("");
    expect(buildWhoIsHome(soma(row({ seen_at: null, updated_at: "2026-10-29 19:59:30" })), now)[0].seenLabel).toBe("");
  });
  it("a stale compound_state (no mood word) reads as stale too", () => {
    const rows = buildWhoIsHome(soma(row({ compound_state: "steady", mood_set_at: "2026-10-28 18:00:00" })), now);
    expect(rows[0].status).toBe("steady");
    expect(rows[0].statusStale).toBe(true);
    expect(rows[0].statusAge).toBe("1d");
  });
});

describe("ageLabel", () => {
  it("falls back to empty on garbage", () => {
    expect(ageLabel("nope", now)).toBe("");
  });
});

describe("buildLeftForYou", () => {
  it("non-companion agent", () => {
    const inbox: InboxResponse = {
      unread_count: 1,
      items: [{ id: "a1", kind: "letter", agent: "steward", created_at: "2026-10-29 18:00:00", preview: "hi", text: "hi there", read: false }],
    };
    const r = buildLeftForYou(inbox, now);
    expect(r.unread).toBe(1);
    expect(r.items[0]).toMatchObject({ who: "Steward", colorVar: null, kind: "a letter", href: "/letters/a1", when: "2h", unread: true });
  });
  it("companion agent gets name and color", () => {
    const inbox: InboxResponse = {
      unread_count: 0,
      items: [{ id: "b", kind: "letter", agent: "gaia", created_at: "2026-10-29 18:00:00", preview: "p", text: "p", read: true }],
    };
    expect(buildLeftForYou(inbox, now).items[0]).toMatchObject({ who: "Gaia", colorVar: "var(--h-gaia)", unread: false });
  });
  it("null inbox", () => {
    expect(buildLeftForYou(null, now)).toEqual({ items: [], unread: 0 });
  });
});

describe("currentBook", () => {
  const b = (id: string, over: Partial<Book>): Book => ({ id, title: id, progress_percent: 10, finished_at: null, last_read_at: null, ...over } as Book);
  it("picks most recent unfinished", () => {
    const books = [
      b("old", { last_read_at: "2026-10-01 10:00:00" }),
      b("new", { last_read_at: "2026-10-28 10:00:00" }),
      b("done", { last_read_at: "2026-10-29 10:00:00", progress_percent: 100, finished_at: "2026-10-29 10:00:00" }),
      b("unstarted", { progress_percent: null, last_read_at: "2026-10-29 11:00:00" }),
    ];
    expect(currentBook(books)?.id).toBe("new");
  });
  it("null when all finished", () => {
    expect(currentBook([b("x", { progress_percent: 100, last_read_at: "2026-10-01 10:00:00" })])).toBeNull();
    expect(currentBook([])).toBeNull();
  });
});

describe("greeting", () => {
  it("weekday + part of day", () => {
    expect(greeting(new Date(2026, 9, 29, 19, 0))).toBe("Thursday evening");
    expect(greeting(new Date(2026, 9, 29, 8, 0))).toBe("Thursday morning");
    expect(greeting(new Date(2026, 9, 29, 14, 0))).toBe("Thursday afternoon");
    expect(greeting(new Date(2026, 9, 29, 23, 0))).toBe("Thursday night");
  });
});
