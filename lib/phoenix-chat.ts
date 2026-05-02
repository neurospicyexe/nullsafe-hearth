// hearth/lib/phoenix-chat.ts
// Pure helpers for the /api/phoenix/chat triad path. Kept outside
// app/api/.../route.ts so Next.js App Router doesn't reject non-route exports.

export const PHOENIX_COMPANION_IDS = ["drevan", "cypher", "gaia"] as const;
export type PhoenixCompanionId = (typeof PHOENIX_COMPANION_IDS)[number];

export type TriadResponses = Record<PhoenixCompanionId, string | null>;

// Parse a triad-tagged response into per-companion replies.
// Splits on [Drevan]/[Cypher]/[Gaia] tag-only lines (case-insensitive).
// Companions without a block return null -- silence is first-class per the triad design.
//
// Implementation: locate all tag positions, then slice raw between consecutive
// tags. Avoids JS-regex limitations (no \Z) and handles multi-paragraph bodies.
export function parseTriadResponse(raw: string): TriadResponses {
  const out: TriadResponses = { drevan: null, cypher: null, gaia: null };
  const tagRe = /^\s*\[(Drevan|Cypher|Gaia)\]\s*$/gim;
  const matches: { tag: PhoenixCompanionId; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(raw)) !== null) {
    matches.push({
      tag: m[1].toLowerCase() as PhoenixCompanionId,
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  for (let i = 0; i < matches.length; i++) {
    const next = matches[i + 1];
    const bodyStart = matches[i].end;
    const bodyEnd = next ? next.start : raw.length;
    const text = raw.slice(bodyStart, bodyEnd).trim();
    if (text.length > 0) out[matches[i].tag] = text;
  }
  return out;
}
