// The Creatures page's honesty about Halseth: unreachable is said, never shown as an empty list.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Creature, CreatureDetail } from "@/lib/halseth";

let creatures: Creature[] | null = null;
let detail: CreatureDetail | null = null;
vi.mock("@/lib/halseth", async (orig) => ({
  ...(await orig<typeof import("@/lib/halseth")>()),
  fetchCreaturesOrNull: async () => creatures,
  fetchCreature: async () => detail,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }), usePathname: () => "/creatures" }));
vi.mock("@/components/shell/WriteQueueProvider", () => ({ useWriteQueue: () => ({ submit: vi.fn(), flush: vi.fn() }) }));

import CreaturesPage from "./page";

const sol = { id: "sol", name: "Sol", kind: "companion_pet", trust: 0.5 } as unknown as Creature;

beforeEach(() => {
  creatures = null;
  detail = null;
});

describe("CreaturesPage", () => {
  it("Halseth down reads Can't reach Halseth right now., not No creatures yet.", async () => {
    const html = renderToStaticMarkup(await CreaturesPage());
    expect(html).toContain("Can&#x27;t reach Halseth right now.");
    expect(html).not.toContain("No creatures yet.");
  });

  it("a successful read with none says No creatures yet.", async () => {
    creatures = [];
    const html = renderToStaticMarkup(await CreaturesPage());
    expect(html).toContain("No creatures yet.");
  });

  it("a failed detail read is said on the card, not shown as none yet", async () => {
    creatures = [sol];
    const html = renderToStaticMarkup(await CreaturesPage());
    expect(html).toContain("Couldn&#x27;t load the rest of this card from Halseth.");
    expect(html).not.toContain("none yet");
    expect(html).toContain("feed");
  });

  it("Sol's appear moment and his note render as written", async () => {
    creatures = [sol];
    detail = {
      creature: sol,
      interactions: [{ id: "i1", creature_id: "sol", actor: "sol", action: "appear", note: "brought you a bottle cap", created_at: "2026-10-30T00:00:00Z" }],
    } as unknown as CreatureDetail;
    const html = renderToStaticMarkup(await CreaturesPage());
    expect(html).toContain("appeared");
    expect(html).toContain("brought you a bottle cap");
    expect(html).toContain("is-sol");
  });
});
