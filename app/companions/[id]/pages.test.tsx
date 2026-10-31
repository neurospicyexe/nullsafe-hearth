// Page-level id handling for /companions/[id]/**: the route param is lowercased once and anything
// that is not drevan/cypher/gaia is a 404 BEFORE any Halseth call (recon trap 4).
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CompanionRundown, Project, SomaData, ToolCall } from "@/lib/halseth";

// Every lib/halseth export that is a function becomes a mock; the overrides below shape the few
// the new pages read. The default ([]) keeps the old overview's `.filter/.slice` paths alive.
const overrides: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
vi.mock("@/lib/halseth", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(real)) {
    out[k] = typeof v === "function" ? vi.fn((...args: unknown[]) => (overrides[k] ? overrides[k](...args) : Promise.resolve([]))) : v;
  }
  return out;
});
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: () => {
    throw new Error("NEXT_REDIRECT");
  },
  usePathname: () => "/companions/cypher",
  // The Letters page renders LetterFormClient, which holds a router for refresh after send.
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}));
// The look is written by a client effect; here it only matters whether the page mounts it.
vi.mock("./LookedMark", () => ({ default: ({ id }: { id: string }) => <i data-looked={id} /> }));

import * as halseth from "@/lib/halseth";
import Overview from "./page";
import AllPage from "./all/page";
import LettersPage from "./letters/page";
import MadePage from "./made/page";
import ProjectsPage from "./projects/page";
import Layout from "./layout";
import JournalPage from "./journal/page";
import NotesPage from "./notes/page";
import SittingPage from "./sitting/page";
import WitnessPage from "./witness/page";
import GrowthPage from "./growth/page";
import WorldviewPage from "./worldview/page";
import LoopsPage from "./loops/page";
import BlocksPage from "./blocks/page";
import AuditPage from "./audit/page";
import FeelingsPage from "./feelings/page";
import RelationalPage from "./relational/page";
import DeltasPage from "./deltas/page";
import AutonomyPage from "./autonomy/page";

const mocks = () =>
  Object.values(halseth as Record<string, unknown>).filter((v): v is Mock => vi.isMockFunction(v));
const allCalls = () => mocks().flatMap((m) => m.mock.calls);
const params = (id: string) => ({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) });

function rundown(over: Partial<CompanionRundown> = {}): CompanionRundown {
  return {
    companion_id: "cypher",
    last_real_thing: { text: "held the line on the cache", at: "2026-10-30T09:00:00Z" },
    last_looked_at: null,
    since_basis: "week",
    since: { journal: 2, letters: 1, book_notes: 0, sol: 0, autonomy: 0 },
    doors: { journal: 2, letters_unread: 1, growth: 0, feelings: 0, upto: 0, made: 3 },
    trace: { soma_float_1: [], soma_float_2: [], soma_float_3: [] },
    ...over,
  };
}

const soma = {
  drevan: null,
  gaia: null,
  cypher: {
    companion_id: "cypher",
    soma_float_1: 0.5, soma_float_2: 0.25, soma_float_3: null,
    float_1_label: "focus", float_2_label: "warmth", float_3_label: null,
    compound_state: null, current_mood: null, surface_emotion: null, surface_intensity: null,
    undercurrent_emotion: null, undercurrent_intensity: null, heat: null, reach: null, weight: null,
    mood_set_at: null, seen_at: new Date(Date.now() - 3 * 3600_000).toISOString(), updated_at: "",
  },
  fetched_at: "",
} as SomaData;

beforeEach(() => {
  for (const k of Object.keys(overrides)) delete overrides[k];
  for (const m of mocks()) m.mockClear();
});

describe("unknown companion", () => {
  const pages = { Overview, AllPage, LettersPage, MadePage, ProjectsPage } as const;
  for (const [name, Page] of Object.entries(pages)) {
    it(`${name} 404s on /companions/blue with no Halseth call`, async () => {
      await expect(Page(params("blue"))).rejects.toThrow("NEXT_NOT_FOUND");
      expect(allCalls()).toEqual([]);
    });
  }
  // "constructor" is not an own key of COMPANION_CONFIG but IS reachable through Object.prototype;
  // the old `COMPANION_CONFIG[rawId.toLowerCase()]` guard let it through to Halseth.
  const oldPages = {
    JournalPage, NotesPage, SittingPage, WitnessPage, GrowthPage, WorldviewPage, LoopsPage, BlocksPage,
    AuditPage, FeelingsPage, RelationalPage, DeltasPage, AutonomyPage, LettersPage, AllPage,
  } as const;
  for (const [name, Page] of Object.entries(oldPages)) {
    it(`${name} 404s on /companions/constructor with no Halseth call`, async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pages differ only in searchParams
      await expect((Page as (p: any) => Promise<unknown>)(params("constructor"))).rejects.toThrow("NEXT_NOT_FOUND");
      expect(allCalls()).toEqual([]);
    });
  }
  it("journal passes the lowercased id to its fetch", async () => {
    await JournalPage(params("Cypher"));
    expect(halseth.fetchCompanionJournal).toHaveBeenCalledWith("cypher", 200, { substantive: true });
  });
  it("the layout 404s too, so no sub-route ever renders with a bad id", async () => {
    await expect(Layout({ children: null, ...params("blue") })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("mixed-case id is lowercased before every fetch", () => {
  const noRawId = () => {
    for (const args of allCalls()) expect(args).not.toContain("Cypher");
  };

  it("overview", async () => {
    overrides.fetchCompanionRundown = async () => null;
    overrides.fetchSomaStates = async () => null;
    await Overview(params("Cypher"));
    expect(halseth.fetchCompanionRundown).toHaveBeenCalledWith("cypher");
    noRawId();
  });

  it("/all (the old overview, 21 fetches)", async () => {
    await AllPage(params("Cypher"));
    expect(halseth.fetchCompanionJournal).toHaveBeenCalledWith("cypher", 6);
    expect(halseth.fetchMindState).toHaveBeenCalledWith("cypher");
    expect(halseth.fetchCypherAudit).toHaveBeenCalled();
    expect(allCalls().length).toBeGreaterThanOrEqual(19);
    noRawId();
  });

  it("letters", async () => {
    overrides.fetchInbox = async () => ({ items: [], unread_count: 0 });
    await LettersPage(params("Cypher"));
    expect(halseth.fetchInbox).toHaveBeenCalledWith(100, "cypher");
    noRawId();
  });

  it("made", async () => {
    await MadePage(params("Cypher"));
    expect(halseth.fetchCompanionImages).toHaveBeenCalledWith("cypher", 40);
    noRawId();
  });

  it("projects", async () => {
    overrides.fetchProjects = async () => [];
    await ProjectsPage(params("Cypher"));
    expect(halseth.fetchProjects).toHaveBeenCalledWith("cypher");
    noRawId();
  });
});

describe("overview", () => {
  it("renders name, seen age, rundown, bars, doors with counts, Everything else, and records the look", async () => {
    overrides.fetchCompanionRundown = async () => rundown();
    overrides.fetchSomaStates = async () => soma;
    const html = renderToStaticMarkup(await Overview(params("cypher")));
    expect(html).toContain("--c:var(--h-cypher)");
    expect(html).toContain("Cypher");
    expect(html).toContain("seen 3h");
    expect(html).toContain("held the line on the cache");
    expect(html).toContain("This week");
    expect(html).toContain("2 journal entries");
    expect(html).toContain('aria-label="Cypher focus"');
    expect(html).toContain('aria-valuenow="25"');
    expect(html).toContain('<span class="sr-only"> 3 new</span>');
    expect(html).toContain('href="/companions/cypher/all"');
    expect(html).toContain('data-looked="cypher"');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });

  it("Halseth down: says so, keeps the doors without counts, does not record a look", async () => {
    overrides.fetchCompanionRundown = async () => null;
    overrides.fetchSomaStates = async () => null;
    const html = renderToStaticMarkup(await Overview(params("cypher")));
    expect(html).toContain("Can&#x27;t reach Halseth right now.");
    expect(html).toContain('href="/companions/cypher/journal"');
    expect(html).not.toContain("h-door-count");
    expect(html).not.toContain("data-looked");
  });
});

describe("made", () => {
  it("Halseth down reads Can't reach Halseth right now., not Nothing made yet.", async () => {
    overrides.fetchCompanionImages = async () => null;
    const html = renderToStaticMarkup(await MadePage(params("gaia")));
    expect(html).toContain("Can&#x27;t reach Halseth right now.");
    expect(html).not.toContain("Nothing made yet.");
  });

  it("empty reads Nothing made yet.", async () => {
    const html = renderToStaticMarkup(await MadePage(params("gaia")));
    expect(html).toContain("Nothing made yet.");
  });

  it("shows each image through the proxy with its cleaned prompt", async () => {
    const call: ToolCall = {
      id: "t1", companion_id: "gaia", tool: "generate_image", args_summary: "prompt: a moss lantern",
      status: "success", provider: null, result_ref: "r2/x", result_summary: null, created_at: "2026-10-29T10:00:00Z",
    };
    overrides.fetchCompanionImages = async () => [call];
    const html = renderToStaticMarkup(await MadePage(params("gaia")));
    expect(html).toContain('src="/api/mind/tools/image/t1"');
    expect(html).toContain('alt="a moss lantern"');
  });
});

describe("projects", () => {
  const p = (id: string, status: Project["status"], over: Partial<Project> = {}): Project => ({
    id, companion_id: "drevan", title: `T-${id}`, intention: `I-${id}`, status,
    horizon_note: null, resolution_note: null, created_at: "2026-10-01T00:00:00Z", last_worked_at: null, closed_at: null,
    ...over,
  });

  it("null reads Can't reach Halseth right now.", async () => {
    overrides.fetchProjects = async () => null;
    const html = renderToStaticMarkup(await ProjectsPage(params("drevan")));
    expect(html).toContain("Can&#x27;t reach Halseth right now.");
  });

  it("says the list is capped only when Halseth returned its cap", async () => {
    overrides.fetchProjects = async () => Array.from({ length: 20 }, (_, i) => p(`p${i}`, "open"));
    expect(renderToStaticMarkup(await ProjectsPage(params("drevan")))).toContain("Showing the first 20.");
    overrides.fetchProjects = async () => Array.from({ length: 19 }, (_, i) => p(`p${i}`, "open"));
    expect(renderToStaticMarkup(await ProjectsPage(params("drevan")))).not.toContain("Showing the first");
  });

  it("empty reads No projects yet.", async () => {
    overrides.fetchProjects = async () => [];
    const html = renderToStaticMarkup(await ProjectsPage(params("drevan")));
    expect(html).toContain("No projects yet.");
  });

  it("groups and shows title, intention, note", async () => {
    overrides.fetchProjects = async () => [
      p("a", "open", { horizon_note: "by winter" }),
      p("b", "released", { resolution_note: "let it go" }),
    ];
    const html = renderToStaticMarkup(await ProjectsPage(params("drevan")));
    expect(html.indexOf("Open")).toBeLessThan(html.indexOf("Done and released"));
    for (const s of ["T-a", "I-a", "by winter", "T-b", "let it go"]) expect(html).toContain(s);
    expect(html).not.toContain("Paused");
  });
});

describe("letters door", () => {
  const letter = (id: string, read: boolean, created_at: string, text: string) => ({
    id, kind: "letter" as const, agent: "cypher", created_at, preview: text, text, read,
  });

  it("incoming letters come from the inbox for this companion, link to the letter page, unread marked", async () => {
    overrides.fetchInbox = async () => ({
      items: [
        letter("j_new", false, "2026-10-29T10:00:00Z", "a drift letter"),
        letter("j_old", true, "2026-10-20 10:00:00", "an old letter"),
        { ...letter("j_steward", false, "2026-10-28T10:00:00Z", "a steward briefing"), agent: "steward" },
      ],
      unread_count: 1,
    });
    overrides.fetchNotes = async () => [
      { id: "n1", note_type: "letter:cypher", content: "from Raziel", created_at: "2026-10-25T10:00:00Z" },
    ];
    const html = renderToStaticMarkup(await LettersPage(params("cypher")));
    expect(halseth.fetchInbox).toHaveBeenCalledWith(100, "cypher");
    expect(halseth.fetchCompanionNotesByAgent).not.toHaveBeenCalled();
    expect(html).toContain('href="/letters/j_new"');
    expect(html).toContain('href="/letters/j_old"');
    expect(html).toContain("a drift letter");
    expect(html).not.toContain("a steward briefing");
    expect(html).toContain("from Raziel");
    // Unread is marked; read is not.
    const bubble = (id: string) => {
      const at = html.indexOf(`href="/letters/${id}"`);
      return html.slice(html.lastIndexOf("<a", at), html.indexOf("</a>", at));
    };
    const newBubble = bubble("j_new");
    const oldBubble = bubble("j_old");
    expect(newBubble).toContain("is-unread");
    expect(newBubble).toContain(">new</span>");
    expect(newBubble).not.toContain("<span>read</span>");
    expect(oldBubble).not.toContain("is-unread");
    expect(oldBubble).toContain("<span>read</span>");
    expect(oldBubble).not.toContain(">new</span>");
    // Oldest first: old incoming, Raziel's, then the new one.
    expect(html.indexOf("an old letter")).toBeLessThan(html.indexOf("from Raziel"));
    expect(html.indexOf("from Raziel")).toBeLessThan(html.indexOf("a drift letter"));
    expect(html).toContain("3 letters");
  });

  it("Halseth down: says so instead of an empty thread", async () => {
    overrides.fetchInbox = async () => null;
    const html = renderToStaticMarkup(await LettersPage(params("cypher")));
    expect(html).toContain("Can&#x27;t reach Halseth right now.");
    expect(html).not.toContain("No letters yet");
  });
});
