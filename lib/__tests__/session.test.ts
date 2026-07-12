import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "../session.js";

describe("signSession / verifySession", () => {
  it("a freshly signed session verifies against the same secret", async () => {
    const token = await signSession("my-secret");
    expect(await verifySession(token, "my-secret")).toBe(true);
  });

  it("does not verify against a different secret", async () => {
    const token = await signSession("my-secret");
    expect(await verifySession(token, "wrong-secret")).toBe(false);
  });

  it("rejects an undefined token", async () => {
    expect(await verifySession(undefined, "my-secret")).toBe(false);
  });

  it("rejects a malformed token", async () => {
    expect(await verifySession("not.a.validtoken", "my-secret")).toBe(false);
  });

  it("rejects a tampered payload", async () => {
    const token = await signSession("my-secret");
    const [issuedAt, nonce, sig] = token.split(".");
    const tampered = `${issuedAt}.tampered-nonce.${sig}`;
    expect(await verifySession(tampered, "my-secret")).toBe(false);
  });

  it("rejects a token older than maxAgeMs", async () => {
    const token = await signSession("my-secret");
    expect(await verifySession(token, "my-secret", -1)).toBe(false); // already "expired"
  });

  it("never stores the raw secret in the token", async () => {
    const token = await signSession("my-super-secret-value");
    expect(token).not.toContain("my-super-secret-value");
  });
});
