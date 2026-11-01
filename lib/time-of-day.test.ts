import { describe, it, expect } from "vitest";
import { partOfDay } from "./time-of-day";
import { greeting } from "./home-model";

const at = (h: number, m = 0) => new Date(2026, 10, 1, h, m);

describe("partOfDay", () => {
  it("cuts at 12, 17 and 21 like the greeting", () => {
    expect(partOfDay(at(0))).toBe("morning");
    expect(partOfDay(at(11, 59))).toBe("morning");
    expect(partOfDay(at(12))).toBe("afternoon");
    expect(partOfDay(at(16, 59))).toBe("afternoon");
    expect(partOfDay(at(17))).toBe("evening");
    expect(partOfDay(at(20, 59))).toBe("evening");
    expect(partOfDay(at(21))).toBe("night");
    expect(partOfDay(at(23, 59))).toBe("night");
  });
  it("greeting() ends with the same word", () => {
    for (const h of [0, 6, 11, 12, 16, 17, 20, 21, 23]) expect(greeting(at(h)).endsWith(partOfDay(at(h)))).toBe(true);
  });
});
