import { describe, it, expect } from "vitest";
import { isLetterRow } from "../journal-model";

describe("isLetterRow", () => {
  it("is true for letter tags in JSON text or array form", () => {
    expect(isLetterRow('["letter"]')).toBe(true);
    expect(isLetterRow('["x","letter_to_raziel"]')).toBe(true);
    expect(isLetterRow(["a", "letter"])).toBe(true);
  });
  it("is false for other tags, null, undefined and bad JSON", () => {
    expect(isLetterRow('["journal"]')).toBe(false);
    expect(isLetterRow(null)).toBe(false);
    expect(isLetterRow(undefined)).toBe(false);
    expect(isLetterRow("not json")).toBe(false);
  });
});
