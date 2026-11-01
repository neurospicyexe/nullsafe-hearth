import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Page from "./page";
import { HOOD_SECTIONS } from "@/lib/shell";

describe("Under the hood page", () => {
  const html = renderToStaticMarkup(Page());
  it("renders every section title", () => {
    for (const s of HOOD_SECTIONS) expect(html).toContain(s.title);
  });
  it("renders every door label and href", () => {
    for (const s of HOOD_SECTIONS)
      for (const d of s.doors) {
        expect(html).toContain(d.label);
        expect(html).toContain(`href="${d.href}"`);
      }
  });
  it("gives every door a hint without em dashes", () => {
    for (const s of HOOD_SECTIONS)
      for (const d of s.doors) {
        expect(d.hint && d.hint.length > 0).toBe(true);
        expect(d.hint).not.toMatch(/—/);
      }
  });
});
