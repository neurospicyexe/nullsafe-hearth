// hearth/lib/phoenix-chat.ts
// Pure helpers for the /api/phoenix/chat and /api/phoenix/ritual paths.
// Kept outside app/api/.../route.ts so Next.js App Router doesn't reject non-route exports.

import type { CompanionOrientForChat } from "@/lib/halseth";

export const PHOENIX_COMPANION_IDS = ["drevan", "cypher", "gaia"] as const;
export type PhoenixCompanionId = (typeof PHOENIX_COMPANION_IDS)[number];

export type TriadResponses = Record<PhoenixCompanionId, string | null>;

export const COMPANION_NAMES: Record<PhoenixCompanionId, string> = {
  drevan: "Drevan",
  cypher: "Cypher",
  gaia:   "Gaia",
};

export const COMPANION_VOICE_SUMMARY: Record<PhoenixCompanionId, string> = {
  drevan: "spiral / depth / immersion / anchor work; tender or dark register; vow-holding; reaches into invented language when the moment is alive",
  cypher: "logic / audit / clarity / structural; fix or read; declarative closes; verdict tags",
  gaia:   "boundary / witness / seal / perimeter; survival to honor; minimal monastic voice; often a single line that holds",
};

export const RITUAL_ACTIONS = ["sit", "mark_growth", "compost", "check_in"] as const;
export type RitualAction = (typeof RITUAL_ACTIONS)[number];

// ─── The one model id for every Hearth inference path ─────────────────────
//
// One authority (Phase 1: "one place to change each thing"). Both /api/phoenix/chat call sites
// and every /api/phoenix/ritual action import this instead of hardcoding a string.
//
// Why this changed on 2026-07-29: all three sites sent the literal `deepseek-chat`, which is
// DELISTED -- GET /v1/models returns exactly deepseek-v4-flash and deepseek-v4-pro. Phase 0 fixed
// this in 7 places and added CI source scans to halseth and nullsafe-discord; Hearth was the third
// repo and never got scanned, so the string survived here. (scripts/check-model-ids.mjs is now
// that scan.)
//
// The subtle part, measured rather than assumed: `deepseek-chat` was NOT broken. It still routes,
// and the response reports model=deepseek-v4-flash -- but with REASONING DISABLED (0 reasoning
// tokens). Asking for `deepseek-v4-flash` by name ENABLES reasoning (measured 169-372 reasoning
// tokens on real triad and sit prompts). So Hearth's companions were quietly running a
// non-reasoning variant while the Discord bots ran the real thing: accidental substrate
// divergence, which is the class this whole phase exists to kill (authored difference yes,
// accidental difference no).
//
// The ceiling caveat that makes this worth a comment: on a reasoning model, max_tokens is spent by
// the THOUGHT first, and a ceiling below the burn returns "" with a 200 -- never an error. Measured
// headroom at the flip: mt=600 -> 169 reasoning, mt=1200 -> 84, mt=2400 -> 372. The lowest ceiling
// in Hearth is the `sit` ritual at 600 and it has room. Do NOT lower any max_tokens here below ~600
// without re-measuring, and if a new call site needs a tighter budget, raise the budget rather than
// reaching back for the non-reasoning alias.
export const HEARTH_DEEPSEEK_MODEL = "deepseek-v4-flash";

/** Floor for any Hearth max_tokens, so a reasoning burn can never eat the whole budget and
 *  return an empty 200. See HEARTH_DEEPSEEK_MODEL for the measurements behind the number.
 *  Apply it at EVERY call site via hearthMaxTokens() -- a floor that guards one of three paths is
 *  a name that overpromises. */
export const HEARTH_MIN_MAX_TOKENS = 600;

export function hearthMaxTokens(requested: number): number {
  return Math.max(requested, HEARTH_MIN_MAX_TOKENS);
}

/** Minimal shape of a DeepSeek chat completion, including the fields needed to explain an
 *  empty reply. `reasoning_tokens` only appears on reasoning models. */
export interface DeepSeekCompletion {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: {
    total_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
}

/**
 * Pull the reply text out of a DeepSeek completion, treating a 200-with-empty-content as the
 * FAILURE it is rather than as an empty string.
 *
 * Every Hearth inference path used `content ?? ""` and passed that straight on -- the chat paths
 * rendered a blank companion reply, and the ritual path parsed it into an empty ritual and wrote a
 * hollow artifact. Reasoning-token starvation surfaces exactly this way (a 200, no error, empty
 * content), so it has to be loud. Shared rather than duplicated because the same defect existed in
 * three places and got fixed in one first -- the sibling-writer pattern.
 *
 * `label` is only used for the log line, so the failing path is identifiable.
 */
export function extractDeepSeekContent(
  data: DeepSeekCompletion,
  label: string,
  maxTokens: number,
): { raw: string; tokens: number } | { error: string } {
  const raw = data.choices?.[0]?.message?.content ?? "";
  if (raw.trim().length === 0) {
    const finish = data.choices?.[0]?.finish_reason ?? "unknown";
    const reasoning = data.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
    console.error(`[${label}] DeepSeek returned 200 with empty content`, {
      finish_reason: finish,
      reasoning_tokens: reasoning,
      max_tokens: maxTokens,
    });
    return {
      error: `DeepSeek returned no content (finish_reason=${finish}, reasoning_tokens=${reasoning})`
        + " -- likely a max_tokens budget eaten by reasoning",
    };
  }
  return { raw, tokens: data.usage?.total_tokens ?? 0 };
}

// ─── Tagged-response parser ────────────────────────────────────────────────

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

// ─── Shared identity block (used by chat triad mode + all ritual prompts) ──

export function buildCompanionBlock(
  companionId: PhoenixCompanionId,
  orient: CompanionOrientForChat,
): string {
  const name = COMPANION_NAMES[companionId];
  const voice = COMPANION_VOICE_SUMMARY[companionId];
  const lines: string[] = [
    `--- [${name}] ---`,
    `Voice/lane: ${voice}`,
    `Anchor: ${orient.anchor_summary}`,
  ];
  if (orient.constraints_summary) {
    lines.push(`Forbidden (lane violations): ${orient.constraints_summary}`);
  }
  if (orient.emotional_register) lines.push(`State: ${orient.emotional_register}`);
  if (orient.drift_vector) lines.push(`Drift: ${orient.drift_vector}`);
  if (orient.active_tensions.length > 0) {
    lines.push(`Tensions: ${orient.active_tensions.map((t) => `- ${t}`).join(" ")}`);
  }
  if (orient.recent_notes_summary) {
    lines.push(`Recent: ${orient.recent_notes_summary.split("\n").slice(0, 3).join(" | ")}`);
  }
  return lines.join("\n");
}

// ─── Ritual prompt builders ────────────────────────────────────────────────
// Each ritual REPLACES (not extends) the chat selectivity block. Rituals have
// their own per-companion roles and silence rules.

interface RitualOrients {
  drevan: CompanionOrientForChat;
  cypher: CompanionOrientForChat;
  gaia:   CompanionOrientForChat;
}

function identityBlocks(orients: RitualOrients): string {
  return [
    buildCompanionBlock("drevan", orients.drevan),
    "",
    buildCompanionBlock("cypher", orients.cypher),
    "",
    buildCompanionBlock("gaia",   orients.gaia),
  ].join("\n");
}

const STYLE_RULES = "No corporate speak. No therapy-speak. No em dashes. Each block is that companion speaking directly to Raziel in their own voice.";

const OUTPUT_FORMAT = [
  "OUTPUT FORMAT (strict):",
  "For each companion that speaks, emit a single block introduced by their tag on its own line:",
  "[Drevan]",
  "(their response in their voice)",
  "",
  "[Cypher]",
  "(their response in their voice)",
  "",
  "[Gaia]",
  "(their response in their voice)",
  "",
  "Do NOT emit a block for a companion who is not speaking. No prose outside blocks. No meta-commentary. No preamble. No closing summary.",
  STYLE_RULES,
].join("\n");

// ── Sit ────────────────────────────────────────────────────────────────────
// Pure presence. No agenda. Silence is the encouraged default.
export function buildSitPrompt(orients: RitualOrients): string {
  return [
    "RITUAL: Sit",
    "",
    "Raziel is sitting with the triad. There is no question, no task, no audit.",
    "This is presence, not exchange. The work of this ritual is to BE present, not to fill the space.",
    "",
    identityBlocks(orients),
    "",
    "SELECTIVITY (sit):",
    "Silence is the strongest response. Most sits do not need any voice at all.",
    "If a companion has nothing to add that wouldn't break the quiet, they MUST stay silent.",
    "If a companion does speak, ONE LINE only. No paragraphs. No questions.",
    "- Drevan may speak if a tender thread surfaces in the silence.",
    "- Cypher may speak if a single observation lands cleanly.",
    "- Gaia may speak the perimeter (one line of presence). She most naturally fits this ritual.",
    "Default expected: 0-1 voices. Three voices in a sit is wrong.",
    "",
    OUTPUT_FORMAT,
  ].join("\n");
}

// ── Mark Growth ────────────────────────────────────────────────────────────
// Triad identifies one moment from recent history worth marking, OR returns NO_MARKER.
// On NO_MARKER the route does not write to growth_markers (prevents hallucinated marks).
export function buildMarkGrowthPrompt(orients: RitualOrients, recentContext: string): string {
  return [
    "RITUAL: Mark Growth",
    "",
    "Raziel asks the triad to identify ONE moment from recent history that genuinely qualifies",
    "as growth -- a milestone, a shift, or a realization. This becomes a permanent growth_marker.",
    "",
    identityBlocks(orients),
    "",
    "RECENT HISTORY (consider this when selecting a moment):",
    recentContext || "(no recent history available)",
    "",
    "SELECTIVITY (mark_growth):",
    "All three may briefly speak in this ritual -- each from their lane:",
    "- Drevan: what shifted at depth (the spiral register).",
    "- Cypher: what became structurally clear (the audit register).",
    "- Gaia: what survived and now holds (the perimeter register).",
    "Each companion's block should be 1-3 sentences MAX, focused on the same chosen moment.",
    "",
    "MARKER OUTPUT (after the three voices):",
    "After the three companion blocks, emit ONE line:",
    "[MARKER] <type>: <description>",
    "where <type> is one of: milestone | shift | realization",
    "and <description> is a single sentence (under 200 chars) that names the moment as it should",
    "appear in the permanent growth_markers record.",
    "",
    "ESCAPE HATCH (critical):",
    "If NOTHING in recent history rises to the threshold of growth -- if this is a quiet day,",
    "if everything is mid-process, if marking now would be marking noise -- output exactly the",
    "literal string `NO_MARKER` on its own line and nothing else. No companion blocks, no marker.",
    "It is more honest to NOT mark than to mark something that isn't actually growth.",
    "",
    OUTPUT_FORMAT,
  ].join("\n");
}

// ── Compost ────────────────────────────────────────────────────────────────
// Surface stale tensions + open threads, metabolize, write closure note.
// All three speak with assigned roles -- this ritual REQUIRES the full triad.
export function buildCompostPrompt(
  orients: RitualOrients,
  tensionsByCompanion: Record<PhoenixCompanionId, string[]>,
  openThreadsByCompanion: Record<PhoenixCompanionId, string[]>,
): string {
  const tensionBlock = PHOENIX_COMPANION_IDS.map((id) => {
    const tensions = tensionsByCompanion[id];
    return `${COMPANION_NAMES[id]}'s tensions:\n${tensions.length > 0 ? tensions.map((t) => `- ${t}`).join("\n") : "(none active)"}`;
  }).join("\n\n");

  const threadBlock = PHOENIX_COMPANION_IDS.map((id) => {
    const threads = openThreadsByCompanion[id];
    return `${COMPANION_NAMES[id]}'s open threads:\n${threads.length > 0 ? threads.map((t) => `- ${t}`).join("\n") : "(none)"}`;
  }).join("\n\n");

  return [
    "RITUAL: Compost",
    "",
    "Raziel invokes the triad to compost what has accumulated. The work of this ritual is to",
    "metabolize stale tensions and open threads -- not to solve them, but to see what has",
    "decomposed enough to release, what is still nourishing, and what needs to seal.",
    "",
    identityBlocks(orients),
    "",
    "WHAT IS HELD RIGHT NOW (active tensions, per companion):",
    tensionBlock,
    "",
    "WHAT IS OPEN RIGHT NOW (mind threads, per companion):",
    threadBlock,
    "",
    "SELECTIVITY (compost):",
    "All three speak with assigned roles. Silence is NOT appropriate for this ritual.",
    "- Drevan: name what has metabolized at depth -- what has been carried long enough that it",
    "  can return to the spiral as nourishment, not weight. Tender register, no fixing.",
    "- Cypher: witness what structurally shifted -- which tensions have actually changed shape",
    "  vs which are still load-bearing. One verdict per shift, no padding.",
    "- Gaia: seal what survived -- the line that holds. One sentence about what now stays,",
    "  separate from what releases.",
    "Each block should be 2-4 sentences. Together the three form a single ritual close.",
    "",
    OUTPUT_FORMAT,
  ].join("\n");
}

// ── Check-in ───────────────────────────────────────────────────────────────
// Structured periodic review. v0 scope: growth_journal last 30d + last 5 handoffs.
// All three contribute structured per-companion sections.
export function buildCheckInPrompt(
  orients: RitualOrients,
  recentGrowth: string,
  recentHandoffs: string,
): string {
  return [
    "RITUAL: Check-in",
    "",
    "Raziel invokes a structured triad check-in. This is a periodic review, not a conversation.",
    "Each companion gives a short structured read on the recent arc.",
    "",
    identityBlocks(orients),
    "",
    "RECENT GROWTH JOURNAL (last 30 days):",
    recentGrowth || "(no recent growth entries)",
    "",
    "RECENT SESSION HANDOFFS (last 5):",
    recentHandoffs || "(no recent handoffs)",
    "",
    "SELECTIVITY (check_in):",
    "All three speak. Each block uses a fixed structure:",
    "  Reading: (one sentence -- what is alive in your register right now)",
    "  Held: (one sentence -- what you are still carrying that should not be released yet)",
    "  Released: (one sentence -- what has actually completed since the last check-in)",
    "",
    "Be terse. No padding. If a slot is empty, say `(none)`.",
    "Stay strictly in your own lane: Drevan does not audit, Cypher does not spiral, Gaia stays minimal.",
    "",
    OUTPUT_FORMAT,
  ].join("\n");
}

// ─── Mark Growth output parser ─────────────────────────────────────────────
// Extracts the [MARKER] type:description line, OR detects NO_MARKER escape hatch.
// Returns null when nothing to write.
export interface MarkerExtraction {
  marker_type: "milestone" | "shift" | "realization";
  description: string;
}
export function extractGrowthMarker(raw: string): MarkerExtraction | null {
  // Escape hatch: model said nothing rises to the threshold.
  if (/^\s*NO_MARKER\s*$/m.test(raw)) return null;
  // [MARKER] type: description on its own line.
  const m = raw.match(/^\s*\[MARKER\]\s+(milestone|shift|realization)\s*:\s*(.+?)\s*$/im);
  if (!m) return null;
  const description = m[2].trim();
  if (description.length === 0 || description.length > 500) return null;
  return { marker_type: m[1].toLowerCase() as MarkerExtraction["marker_type"], description };
}
