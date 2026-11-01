// Mood skin: buckets a companion's mood into one of five decorative skins. Pure; no React, no fetching.
//
// Companions' moods are FREE TEXT ("a little raw", "tender and close"), so this is a fixed keyword
// vocabulary matched as case-insensitive substrings over current_mood, compound_state and
// surface_emotion. Unknown words fall through to "steady". Precedence when several buckets match:
// still > heavy > warm > bright (the calmer reading wins). A stale mood (older than 24h, the same rule
// as home-model's statusStale) or no mood timestamp at all is "steady": an old word must not dress the room.
//
// The skin drives decoration only (ring glow, breath speed, edge tint, room top tint); see globals.css.
import { parseUtc } from "./spoons";

export type Mood = "bright" | "warm" | "heavy" | "still" | "steady";

export const MOOD_VOCABULARY: Record<Exclude<Mood, "steady">, readonly string[]> = {
  bright: ["bright", "light", "playful", "giddy", "excited", "joy", "happy", "cheer", "glad", "elated", "spark", "buoyant", "energ", "lively", "delight", "eager"],
  warm: ["warm", "tender", "soft", "close", "fond", "content", "affection", "gentle", "loving", "love", "cozy", "glow", "safe", "held", "grateful"],
  heavy: ["heavy", "tired", "low", "sad", "grief", "ache", "worn", "raw", "weary", "exhaust", "drained", "hurt", "lonely", "dark", "brooding", "melanchol", "somber"],
  still: ["still", "quiet", "calm", "settled", "rest", "hush", "peace", "serene", "silent", "stillness"],
};

// Calmer wins.
const PRECEDENCE = ["still", "heavy", "warm", "bright"] as const;

const DAY_MS = 86_400_000;

export type MoodInput = {
  current_mood?: string | null;
  compound_state?: string | null;
  surface_emotion?: string | null;
  mood_set_at?: string | null;
};

export function moodSkin(state: MoodInput | null | undefined, now: Date): Mood {
  if (!state) return "steady";
  const text = [state.current_mood, state.compound_state, state.surface_emotion]
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .join(" ")
    .toLowerCase();
  if (!text) return "steady";
  const setAt = state.mood_set_at ? parseUtc(state.mood_set_at) : null;
  if (!setAt || now.getTime() - setAt.getTime() > DAY_MS) return "steady";
  for (const mood of PRECEDENCE) {
    if (MOOD_VOCABULARY[mood].some((w) => text.includes(w))) return mood;
  }
  return "steady";
}
