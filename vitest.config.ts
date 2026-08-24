import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // 2026-08-23: was `lib/**/*.test.ts` only, so a test written next to the page it covers was
    // silently never collected -- green suite, zero coverage, no error anywhere. Route-level logic
    // worth testing (thread flattening in app/log) belongs beside its route, so the glob covers
    // both trees. If a new test seems to pass suspiciously fast, check it is in this list at all.
    include: ["{lib,app,components}/**/*.test.ts", "{lib,app,components}/**/*.test.tsx"],
  },
});
