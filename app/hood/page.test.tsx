// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Page from "./page";
import { HOOD_SECTIONS } from "@/lib/shell";

describe("Under the hood page", () => {
  it("renders every section title as a heading", () => {
    render(<Page />);
    for (const s of HOOD_SECTIONS) expect(screen.getByRole("heading", { name: s.title })).toBeTruthy();
    cleanup();
  });
  it("renders every door label and href", () => {
    render(<Page />);
    for (const s of HOOD_SECTIONS)
      for (const d of s.doors) {
        const a = screen.getByText(d.label).closest("a");
        expect(a?.getAttribute("href")).toBe(d.href);
      }
    cleanup();
  });
  it("gives every door a hint without em dashes", () => {
    for (const s of HOOD_SECTIONS)
      for (const d of s.doors) {
        expect(d.hint && d.hint.length > 0).toBe(true);
        expect(d.hint).not.toMatch(/—/);
      }
  });
});
