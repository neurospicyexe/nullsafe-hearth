// Query strings the companion pages depend on: the Journal page asks for the substantive lane, the
// Letters door asks the inbox for one companion. Other callers keep their old URLs.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchCompanionJournal, fetchInbox } from "@/lib/halseth";

let urls: string[] = [];
beforeEach(() => {
  urls = [];
  vi.stubEnv("HALSETH_URL", "https://h.example");
  vi.stubGlobal("fetch", vi.fn(async (u: string) => {
    urls.push(u);
    return new Response(JSON.stringify({ items: [], unread_count: 0 }), { status: 200 });
  }));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const query = (u: string) => Object.fromEntries(new URL(u).searchParams);

describe("fetchCompanionJournal", () => {
  it("adds substantive=1 only when asked", async () => {
    await fetchCompanionJournal("cypher", 200, { substantive: true });
    expect(query(urls[0])).toEqual({ limit: "200", review_state: "all", agent: "cypher", substantive: "1" });
  });
  it("default callers are unchanged", async () => {
    await fetchCompanionJournal("cypher", 6);
    await fetchCompanionJournal(undefined, 40);
    expect(query(urls[0])).toEqual({ limit: "6", review_state: "all", agent: "cypher" });
    expect(query(urls[1])).toEqual({ limit: "40", review_state: "all" });
  });
});

describe("fetchInbox", () => {
  it("scopes to one companion when given", async () => {
    await fetchInbox(100, "gaia");
    expect(new URL(urls[0]).pathname).toBe("/raziel/inbox");
    expect(query(urls[0])).toEqual({ limit: "100", agent: "gaia" });
  });
  it("Home's call is unchanged", async () => {
    await fetchInbox(3);
    expect(query(urls[0])).toEqual({ limit: "3" });
  });
});
