import { describe, it, expect } from "vitest";
import { biometricsPostBody } from "../biometrics-body";

const NOW = () => new Date("2026-10-30T03:00:00.000Z");

describe("biometricsPostBody", () => {
  it("forwards the client's recorded_at (tap time), else stamps now", () => {
    expect(biometricsPostBody({ spoons: 4, recorded_at: "2026-10-29T22:15:00.000Z" }, NOW).recorded_at).toBe("2026-10-29T22:15:00.000Z");
    expect(biometricsPostBody({ spoons: 4 }, NOW).recorded_at).toBe("2026-10-30T03:00:00.000Z");
  });

  it("forwards a well-formed client id and drops a malformed one", () => {
    const uuid = "0b7c6f1e-3a2d-4c5b-9e8f-1a2b3c4d5e6f";
    expect(biometricsPostBody({ id: uuid, spoons: 4 }, NOW).id).toBe(uuid);
    for (const id of ["short", "x".repeat(65), "has space x", 12345678, null]) {
      expect("id" in biometricsPostBody({ id, spoons: 4 }, NOW), String(id)).toBe(false);
    }
  });

  it("keeps the allowlist: unknown fields never reach Halseth", () => {
    const b = biometricsPostBody({ spoons: 4, mood: "foggy", energy: 3, evil: "x" }, NOW) as Record<string, unknown>;
    expect(b.spoons).toBe(4);
    expect(b.mood).toBe("foggy");
    expect(b.energy).toBe(3);
    expect("evil" in b).toBe(false);
  });
});
