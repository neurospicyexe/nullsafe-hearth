import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkLoginRateLimit, __resetForTests } from "../rate-limit.js";

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
