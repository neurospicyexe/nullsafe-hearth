import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Page from "./page";
import { HUBS } from "@/lib/shell";

describe("/archive", () => {
  const html = renderToStaticMarkup(<Page />);
  it("renders every door label", () => {
    for (const d of HUBS.archive) expect(html).toContain(d.label);
  });
  it("has a search form with an input named q and the honest sentence", () => {
    expect(html).toContain("<form");
    expect(html).toMatch(/<input[^>]*name="q"/);
    expect(html).toContain("Searches recent items: the newest 50 of each kind.");
  });
  it("links Under the hood to /hood", () => {
    expect(html).toMatch(/href="\/hood"[^>]*>Under the hood</);
  });
  it("puts the search form before the doors", () => {
    expect(html.indexOf("<form")).toBeGreaterThan(-1);
    expect(html.indexOf("<form")).toBeLessThan(html.indexOf("h-doors"));
  });
});
