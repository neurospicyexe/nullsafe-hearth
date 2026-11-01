// The warn lines (spoons strip, needs strip) share one token so the visual pass retunes a single value.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

describe("--h-warn token", () => {
  it("is defined in :root with the Drevan value the warn lines used before", () => {
    const warn = css.match(/--h-warn:\s*(#[0-9a-fA-F]{3,8})/);
    const drevan = css.match(/--h-drevan:\s*(#[0-9a-fA-F]{3,8})/);
    expect(warn).not.toBeNull();
    expect(warn![1].toLowerCase()).toBe(drevan![1].toLowerCase());
  });
  it("both warn lines read it", () => {
    expect(css).toMatch(/\.h-spoons-msg\.is-warn\s*\{\s*color:\s*var\(--h-warn\)/);
    expect(css).toMatch(/\.h-needs-msg\.is-warn\s*\{\s*color:\s*var\(--h-warn\)/);
  });
});
