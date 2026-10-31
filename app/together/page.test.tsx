import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const m = vi.hoisted(() => ({
  fetchClubCurrent: vi.fn(),
  fetchBooks: vi.fn(),
  fetchCreatures: vi.fn(),
  fetchCreature: vi.fn(),
  fetchNewestImage: vi.fn(),
}));
vi.mock("@/lib/halseth", () => m);

import Page from "./page";
import { HUBS } from "@/lib/shell";

beforeEach(() => {
  m.fetchClubCurrent.mockResolvedValue(null);
  m.fetchBooks.mockResolvedValue([]);
  m.fetchCreatures.mockResolvedValue([]);
  m.fetchCreature.mockResolvedValue(null);
  m.fetchNewestImage.mockResolvedValue(null);
});

describe("/together", () => {
  it("renders every door and no hints when nothing loads", async () => {
    m.fetchBooks.mockRejectedValue(new Error("down"));
    const html = renderToStaticMarkup(await Page());
    for (const d of HUBS.together) expect(html).toContain(d.label);
    expect(html).not.toContain("h-door-hint");
  });
  it("shows the club hint on the club door", async () => {
    m.fetchClubCurrent.mockResolvedValue({
      round: { id: "r", status: "voting", winning_recommendation_id: null },
      recommendations: [{ id: "a", recommended_by: "drevan", title: "Dune" }],
      votes: [],
    });
    const html = renderToStaticMarkup(await Page());
    expect(html).toMatch(/href="\/club".*?Voting is open\. You haven&#x27;t voted yet\./);
  });
});
