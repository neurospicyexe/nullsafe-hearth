import { describe, it, expect } from "vitest";
import { addQualified, qualifiedSpellings, previewLine, draftBody, EMPTY_DRAFT } from "../people-frame";
import type { GraphPerson } from "../halseth";

const blue = { id: "b", label: "Blue", kind: "person" } as GraphPerson;
const centre = { id: "raziel", label: "Raziel", kind: "centre" } as GraphPerson;

describe("qualified spellings", () => {
  it("self gets (ours); others get (Blue) and (Blue's system)", () => {
    expect(qualifiedSpellings("Lestat", "self")).toEqual(["Lestat (ours)"]);
    expect(qualifiedSpellings("Barbossa", "person")).toEqual(["Barbossa (Blue)", "Barbossa (Blue's system)"]);
  });
  it("uses the system owner's label when it is not Blue", () => {
    expect(qualifiedSpellings("Sora", "person", "Casey")).toEqual(["Sora (Casey)", "Sora (Casey's system)"]);
  });
  it("empty label adds nothing", () => {
    expect(qualifiedSpellings("  ", "person")).toEqual([]);
    expect(addQualified("", "", "person")).toBe("");
  });
  it("adds only what is missing and never removes what was typed", () => {
    expect(addQualified("Barb", "Barbossa", "person")).toBe("Barb, Barbossa (Blue), Barbossa (Blue's system)");
    expect(addQualified("Barbossa (Blue), Barb", "Barbossa", "person")).toBe("Barbossa (Blue), Barb, Barbossa (Blue's system)");
    expect(addQualified("Barbossa (Blue), Barbossa (Blue's system)", "Barbossa", "person")).toBe("Barbossa (Blue), Barbossa (Blue's system)");
  });
});

describe("previewLine", () => {
  it("mirrors the server rendering", () => {
    expect(previewLine("Kyle Barnes", "person", { ...EMPTY_DRAFT, system_of: "b" }, [blue])).toBe("Kyle Barnes, a member of Blue's system");
    expect(previewLine("Blue", "person", { ...EMPTY_DRAFT, relation: "partner", frame_line: "Hosts truck nights." }, [])).toBe("Blue, Raziel's partner. Hosts truck nights");
    expect(previewLine("Magpie", "self", { ...EMPTY_DRAFT, frame_line: "ignored" }, [centre])).toBe("Magpie: Raziel (one of Raziel's names)");
    expect(previewLine("Corbin", "person", EMPTY_DRAFT, [])).toBeNull();
  });
  it("neutralises brackets and quotes", () => {
    expect(previewLine("Zed", "person", { ...EMPTY_DRAFT, frame_line: 'a"] [x]' }, [])).toBe("Zed: a') (x)");
  });
});

describe("draftBody", () => {
  it("clears empties to null", () => {
    expect(draftBody(EMPTY_DRAFT)).toEqual({ system_of: null, relation: null, frame_line: null, discord_user_id: null, pk_system: null });
  });
});
