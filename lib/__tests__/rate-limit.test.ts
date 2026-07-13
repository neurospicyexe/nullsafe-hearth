import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkLoginRateLimit, getClientKey, __resetForTests } from "../rate-limit.js";

beforeEach(() => { __resetForTests(); });

describe("checkLoginRateLimit", () => {
  it("allows the first attempt for a fresh key", () => {
    expect(checkLoginRateLimit("1.2.3.4")).toBe(true);
  });

  it("allows up to the configured max attempts", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkLoginRateLimit("5.6.7.8")).toBe(true);
    }
  });

  it("blocks the attempt after the max is exceeded", () => {
    for (let i = 0; i < 10; i++) checkLoginRateLimit("9.9.9.9");
    expect(checkLoginRateLimit("9.9.9.9")).toBe(false);
  });

  it("tracks keys independently", () => {
    for (let i = 0; i < 10; i++) checkLoginRateLimit("blocked-key");
    expect(checkLoginRateLimit("blocked-key")).toBe(false);
    expect(checkLoginRateLimit("different-key")).toBe(true);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();
    for (let i = 0; i < 10; i++) checkLoginRateLimit("timed-key");
    expect(checkLoginRateLimit("timed-key")).toBe(false);
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(checkLoginRateLimit("timed-key")).toBe(true);
    vi.useRealTimers();
  });
});

describe("getClientKey", () => {
  const headers = (map: Record<string, string>) => ({
    get: (name: string) => map[name.toLowerCase()] ?? null,
  });

  it("prefers x-real-ip over x-forwarded-for", () => {
    expect(
      getClientKey(headers({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" })),
    ).toBe("1.2.3.4");
  });

  it("falls back to the last x-forwarded-for entry, not the client-spoofable first one", () => {
    expect(
      getClientKey(headers({ "x-forwarded-for": "attacker-controlled, 5.6.7.8" })),
    ).toBe("5.6.7.8");
  });

  it("an attacker prepending arbitrary values cannot get a fresh rate-limit bucket per request", () => {
    __resetForTests();
    const realKey = getClientKey(headers({ "x-forwarded-for": "10.0.0.1" }));
    for (let i = 0; i < 10; i++) {
      const spoofedHeaders = headers({ "x-forwarded-for": `spoofed-${i}, 10.0.0.1` });
      expect(getClientKey(spoofedHeaders)).toBe(realKey);
      checkLoginRateLimit(getClientKey(spoofedHeaders));
    }
    expect(checkLoginRateLimit(realKey)).toBe(false);
  });

  it("returns 'unknown' when no identifying header is present", () => {
    expect(getClientKey(headers({}))).toBe("unknown");
  });
});
