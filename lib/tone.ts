const COMPANIONS = { drevan: true, cypher: true, gaia: true } as const;

export function isCompanionKey(id: string | null | undefined): id is keyof typeof COMPANIONS {
  return typeof id === "string" && Object.hasOwn(COMPANIONS, id);
}

/** CSS tone class for a companion id; anything else (null, "cross", "constructor") is h-tone-none. */
export function toneOf(id: string | null | undefined): string {
  return isCompanionKey(id) ? `h-tone-${id}` : "h-tone-none";
}
