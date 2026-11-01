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
  vi.clearAllMocks();
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

  const creatures = [
    { id: "m1", name: "Moss" },
    { id: "s1", name: "Sol" },
  ];
  const solDetail = { creature: {}, interactions: [{ id: "i", actor: "sol", action: "appear", note: "on the sill", created_at: "2026-10-31 10:00:00" }] };

  it("finds Sol by name and shows the hint on the creatures door", async () => {
    m.fetchCreatures.mockResolvedValue(creatures);
    m.fetchCreature.mockResolvedValue(solDetail);
    const html = renderToStaticMarkup(await Page());
    expect(m.fetchCreature).toHaveBeenCalledTimes(1);
    expect(m.fetchCreature).toHaveBeenCalledWith("s1");
    expect(html).toMatch(/href="\/creatures".*?on the sill/);
  });
  it("matches Sol case-insensitively", async () => {
    m.fetchCreatures.mockResolvedValue([{ id: "s1", name: "SOL" }]);
    m.fetchCreature.mockResolvedValue(solDetail);
    renderToStaticMarkup(await Page());
    expect(m.fetchCreature).toHaveBeenCalledWith("s1");
  });
  it("makes no creature call and shows no hint when Sol is absent", async () => {
    m.fetchCreatures.mockResolvedValue([{ id: "m1", name: "Moss" }]);
    const html = renderToStaticMarkup(await Page());
    expect(m.fetchCreature).not.toHaveBeenCalled();
    expect(html).not.toContain("h-door-hint");
  });
  it("renders without a hint when fetchCreature throws", async () => {
    m.fetchCreatures.mockResolvedValue(creatures);
    m.fetchCreature.mockRejectedValue(new Error("down"));
    const html = renderToStaticMarkup(await Page());
    for (const d of HUBS.together) expect(html).toContain(d.label);
    expect(html).not.toContain("h-door-hint");
  });
});
