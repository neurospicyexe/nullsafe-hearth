// Mirrors LETTER_WHERE in halseth/src/handlers/raziel-inbox.ts: a row tagged `letter` or
// `letter_to_raziel` belongs to the letters door, not the journal. Kept free of lib/halseth
// imports so it stays pure (tags arrive as raw D1 JSON text, or as an array once parsed).
const LETTER_TAGS = ["letter", "letter_to_raziel"];

export function isLetterRow(tags: string | string[] | null | undefined): boolean {
  let parsed: unknown = tags;
  if (typeof tags === "string") {
    try {
      parsed = JSON.parse(tags);
    } catch {
      return false;
    }
  }
  return Array.isArray(parsed) && parsed.some((t) => typeof t === "string" && LETTER_TAGS.includes(t));
}
