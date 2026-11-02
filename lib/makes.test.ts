import { describe, it, expect } from "vitest";
import type { Make } from "./halseth";
import { isMakeId, isMakeWhich, makeLinks, inlineImage, needsSource } from "./makes";

const ID = "0123456789abcdef0123456789abcdef";
const m = (over: Partial<Make>): Make => ({
  id: ID, kind: "drawing", title: "t", why: null, interest_name: null, status: "ready", heard_back: null,
  version: 1, parent_id: null, created_at: "2026-11-02T10:00:00Z", files: {}, ...over,
});

describe("ids and which", () => {
  it("accepts 32 hex with an optional img_ prefix only", () => {
    expect(isMakeId(ID)).toBe(true);
    expect(isMakeId("img_" + ID)).toBe(true);
    for (const bad of ["", ID.slice(1), ID + "a", "img_" + ID.slice(1), "img-" + ID, ID.replace("0", "g"), ID + "\n"]) {
      expect(isMakeId(bad)).toBe(false);
    }
  });
  it("which is an allowlist", () => {
    for (const ok of ["source", "file", "preview"]) expect(isMakeWhich(ok)).toBe(true);
    for (const bad of ["", "File", "__proto__", "toString", "source "]) expect(isMakeWhich(bad)).toBe(false);
  });
});

describe("links", () => {
  it("not ready means no links and no inline media", () => {
    for (const status of ["pending", "failed"] as const) {
      const x = m({ status, files: { source: {}, file: {}, preview: {} } });
      expect(makeLinks(x)).toEqual({ download: null, source: null });
      expect(inlineImage(x)).toBeNull();
      expect(needsSource(m({ status, kind: "writing" }))).toBe(false);
    }
  });
  it("source-only kinds download the source", () => {
    expect(makeLinks(m({ kind: "writing", files: { source: {} } })).download?.href).toBe(`/api/makes/${ID}/source`);
  });
  it("only writing needs fetched text", () => {
    expect(needsSource(m({ kind: "writing" }))).toBe(true);
    for (const k of ["page", "music_code", "drawing", "scad", "music_audio", "video", "image"] as const) expect(needsSource(m({ kind: k }))).toBe(false);
  });
});
