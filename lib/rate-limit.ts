// lib/rate-limit.ts
//
// In-memory, per-instance login rate limiter. Not perfectly accurate across
// serverless instances/regions (each cold instance starts its own counter) --
// accepted for a single-operator dashboard behind a passphrase, combined with
// the constant-time compare (lib/timing-safe.ts) and signed session (lib/session.ts).
// No Redis/KV dependency added for this.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

interface Entry { count: number; resetAt: number; }

let attempts = new Map<string, Entry>();

/** Returns true if this attempt is allowed; false if the key is currently locked out. */
export function checkLoginRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

/** Test-only: clears all tracked state between test cases. */
export function __resetForTests(): void {
  attempts = new Map();
}
