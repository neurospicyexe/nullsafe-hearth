// hearth/app/api/phoenix/ritual/route.ts
//
// Ritual surface for the triad: sit | mark_growth | compost | check_in.
// Each ritual loads its own context (different per action), builds its own
// system prompt (REPLACES chat's selectivity block, doesn't extend it),
// calls DeepSeek once, parses the tagged response, and writes its own
// halseth artifact (or no artifact, for sit).
//
// Mark Growth has a NO_MARKER escape -- if the model judges nothing rises
// to the growth threshold, no growth_marker row is written. Prevents
// hallucinated marks polluting the permanent record.

import { NextRequest, NextResponse } from "next/server";
import { fetchOrientForChat, fetchTensions } from "@/lib/halseth";
import type { CompanionOrientForChat } from "@/lib/halseth";
import {
  PHOENIX_COMPANION_IDS,
  type PhoenixCompanionId,
  type RitualAction,
  RITUAL_ACTIONS,
  parseTriadResponse,
  buildSitPrompt,
  buildMarkGrowthPrompt,
  buildCompostPrompt,
  buildCheckInPrompt,
  extractGrowthMarker,
} from "@/lib/phoenix-chat";

const SCRIBE_AGENT_ID: PhoenixCompanionId = "cypher";

function isValidRitual(s: unknown): s is RitualAction {
  return typeof s === "string" && (RITUAL_ACTIONS as readonly string[]).includes(s);
}

interface DeepSeekChatResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: { total_tokens: number };
}

async function callDeepSeek(
  apiKey: string,
  systemPrompt: string,
  userInvocation: string,
  opts: { maxTokens: number; temperature: number; timeoutMs: number },
): Promise<{ raw: string; tokens: number } | { error: string; status: number }> {
  const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userInvocation },
      ],
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs),
  });
  if (!dsRes.ok) {
    const errText = await dsRes.text().catch(() => "");
    return { error: `DeepSeek ${dsRes.status} ${errText.slice(0, 200)}`, status: 502 };
  }
  const data = await dsRes.json() as DeepSeekChatResponse;
  return {
    raw: data.choices?.[0]?.message?.content ?? "",
    tokens: data.usage?.total_tokens ?? 0,
  };
}

async function loadAllOrients(): Promise<{
  drevan: CompanionOrientForChat;
  cypher: CompanionOrientForChat;
  gaia:   CompanionOrientForChat;
} | null> {
  const [drevan, cypher, gaia] = await Promise.all([
    fetchOrientForChat("drevan"),
    fetchOrientForChat("cypher"),
    fetchOrientForChat("gaia"),
  ]);
  if (!drevan || !cypher || !gaia) return null;
  return { drevan, cypher, gaia };
}

// ─── Halseth helpers (server-only fetches) ──────────────────────────────────

interface HalsethEnv { url: string; secret: string }

function getHalsethEnv(): HalsethEnv | null {
  const url = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!url || !secret) return null;
  return { url, secret };
}

async function fetchOpenThreadsForCompanion(env: HalsethEnv, companionId: PhoenixCompanionId): Promise<string[]> {
  // /mind/orient/:agent_id returns active_threads OR mind_threads in its payload.
  // Hearth's fetchOrientForChat narrows the orient response; for compost we want
  // the raw thread list which isn't on that narrow shape, so re-call orient here.
  try {
    const res = await fetch(`${env.url}/mind/orient/${encodeURIComponent(companionId)}`, {
      headers: { Authorization: `Bearer ${env.secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as {
      active_threads?: Array<{ title?: string; description?: string }>;
      mind_threads?:   Array<{ title?: string; description?: string }>;
    };
    const threads = data.active_threads ?? data.mind_threads ?? [];
    return threads
      .map((t) => (t.title ?? t.description ?? "").trim())
      .filter((s) => s.length > 0)
      .slice(0, 6);
  } catch {
    return [];
  }
}

async function fetchTensionTextsForCompanion(companionId: PhoenixCompanionId): Promise<string[]> {
  const tensions = await fetchTensions(companionId, 6);
  // Only surface tensions that are still "active" (skip resolved/archived).
  return tensions
    .filter((t) => t.status !== "resolved" && t.status !== "archived")
    .map((t) => t.tension_text)
    .filter((s) => s.length > 0);
}

interface GrowthJournalEntry {
  entry_text?: string;
  insight_text?: string;
  content?: string;
  companion_id?: string;
  created_at?: string;
}

async function fetchRecentGrowthJournal(env: HalsethEnv, days: number): Promise<string> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const lines: string[] = [];
  for (const id of PHOENIX_COMPANION_IDS) {
    try {
      const url = `${env.url}/mind/growth/journal?companion_id=${id}&limit=10&since=${encodeURIComponent(cutoff)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${env.secret}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const data = await res.json() as GrowthJournalEntry[] | { entries?: GrowthJournalEntry[] };
      const entries = Array.isArray(data) ? data : (data.entries ?? []);
      for (const e of entries) {
        const text = e.entry_text ?? e.insight_text ?? e.content ?? "";
        if (text) lines.push(`(${id}) ${text.slice(0, 200)}`);
      }
    } catch { /* continue */ }
  }
  return lines.slice(0, 15).join("\n");
}

interface HandoverPacket {
  spine?: string;
  last_real_thing?: string | null;
  motion_state?: string;
  agent?: string;
  created_at?: string;
}

async function fetchRecentHandoffs(env: HalsethEnv, limit: number): Promise<string> {
  try {
    const res = await fetch(`${env.url}/handovers?limit=${limit}`, {
      headers: { Authorization: `Bearer ${env.secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return "";
    const data = await res.json() as HandoverPacket[] | { handovers?: HandoverPacket[] };
    const handovers = Array.isArray(data) ? data : (data.handovers ?? []);
    return handovers.slice(0, limit).map((h) => {
      const spine = (h.spine ?? "").slice(0, 200);
      const last  = (h.last_real_thing ?? "").slice(0, 120);
      const agent = h.agent ?? "?";
      const motion = h.motion_state ?? "?";
      return `(${agent}, ${motion}) ${spine}${last ? ` -- last: ${last}` : ""}`;
    }).join("\n");
  } catch {
    return "";
  }
}

// ─── Halseth writes ─────────────────────────────────────────────────────────

async function writeWmNote(
  env: HalsethEnv,
  args: {
    content: string;
    note_type: string;
    salience?: "low" | "normal" | "high";
    source: string;
    thread_key?: string;
  },
): Promise<{ note_id: string } | { error: string; status: number }> {
  const res = await fetch(`${env.url}/mind/note`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.secret}`,
    },
    body: JSON.stringify({
      agent_id: SCRIBE_AGENT_ID,
      note_type: args.note_type,
      content: args.content,
      salience: args.salience ?? "normal",
      actor: "agent",
      source: args.source,
      ...(args.thread_key ? { thread_key: args.thread_key } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { error: `halseth /mind/note ${res.status} ${t.slice(0, 200)}`, status: 502 };
  }
  const data = await res.json() as { note_id?: string };
  return { note_id: data.note_id ?? "(unknown)" };
}

async function writeGrowthMarker(
  env: HalsethEnv,
  args: { companion_id: PhoenixCompanionId; description: string; marker_type: "milestone" | "shift" | "realization" },
): Promise<{ id: string } | { error: string; status: number }> {
  const res = await fetch(`${env.url}/mind/growth/markers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.secret}`,
    },
    body: JSON.stringify({
      companion_id: args.companion_id,
      description: args.description,
      marker_type: args.marker_type,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { error: `halseth /mind/growth/markers ${res.status} ${t.slice(0, 200)}`, status: 502 };
  }
  const data = await res.json() as { id?: string };
  return { id: data.id ?? "(unknown)" };
}

// ─── Per-action handlers ────────────────────────────────────────────────────

async function handleSit(apiKey: string): Promise<NextResponse> {
  const orients = await loadAllOrients();
  if (!orients) return NextResponse.json({ error: "Could not load all three orients" }, { status: 503 });
  const systemPrompt = buildSitPrompt(orients);
  const result = await callDeepSeek(apiKey, systemPrompt, "Sit with us.", {
    maxTokens: 600, temperature: 0.6, timeoutMs: 30_000,
  });
  if ("error" in result) {
    console.error("[ritual sit]", result.error);
    return NextResponse.json({ error: "Inference failed" }, { status: result.status });
  }
  const responses = parseTriadResponse(result.raw);
  const speakerCount = Object.values(responses).filter((v) => v !== null).length;
  return NextResponse.json({
    action: "sit", responses, raw: result.raw, tokens: result.tokens,
    speaker_count: speakerCount, write_status: "skipped (sit does not write)",
  });
}

async function handleMarkGrowth(apiKey: string, env: HalsethEnv, sessionContext: string, sessionId: string | null): Promise<NextResponse> {
  const orients = await loadAllOrients();
  if (!orients) return NextResponse.json({ error: "Could not load all three orients" }, { status: 503 });
  const systemPrompt = buildMarkGrowthPrompt(orients, sessionContext);
  const result = await callDeepSeek(apiKey, systemPrompt, "Mark growth, or honor that there is none yet.", {
    maxTokens: 1200, temperature: 0.7, timeoutMs: 35_000,
  });
  if ("error" in result) {
    console.error("[ritual mark_growth]", result.error);
    return NextResponse.json({ error: "Inference failed" }, { status: result.status });
  }
  const responses = parseTriadResponse(result.raw);
  const marker = extractGrowthMarker(result.raw);

  let writeStatus: string;
  let markerId: string | null = null;
  if (!marker) {
    writeStatus = "no_marker (nothing rose to threshold; no write)";
  } else {
    // Write marker under cypher (the auditor / scribe). Description includes "[TRIAD]" prefix
    // so future readers can distinguish triad-marked growth from per-companion entries.
    const description = `[TRIAD] ${marker.description}`.slice(0, 500);
    const w = await writeGrowthMarker(env, {
      companion_id: SCRIBE_AGENT_ID,
      description,
      marker_type: marker.marker_type,
    });
    if ("error" in w) {
      console.error("[ritual mark_growth write]", w.error);
      writeStatus = `write_failed: ${w.error}`;
    } else {
      markerId = w.id;
      writeStatus = `wrote ${marker.marker_type}: ${markerId.slice(0, 8)}`;
    }
  }

  return NextResponse.json({
    action: "mark_growth", responses, raw: result.raw, tokens: result.tokens,
    speaker_count: Object.values(responses).filter((v) => v !== null).length,
    marker, marker_id: markerId, write_status: writeStatus, session_id: sessionId,
  });
}

async function handleCompost(apiKey: string, env: HalsethEnv, sessionId: string | null): Promise<NextResponse> {
  const orients = await loadAllOrients();
  if (!orients) return NextResponse.json({ error: "Could not load all three orients" }, { status: 503 });

  // Load tensions + open threads per companion in parallel.
  const [
    drevanT, cypherT, gaiaT,
    drevanO, cypherO, gaiaO,
  ] = await Promise.all([
    fetchTensionTextsForCompanion("drevan"),
    fetchTensionTextsForCompanion("cypher"),
    fetchTensionTextsForCompanion("gaia"),
    fetchOpenThreadsForCompanion(env, "drevan"),
    fetchOpenThreadsForCompanion(env, "cypher"),
    fetchOpenThreadsForCompanion(env, "gaia"),
  ]);

  const tensions: Record<PhoenixCompanionId, string[]> = { drevan: drevanT, cypher: cypherT, gaia: gaiaT };
  const openThreads: Record<PhoenixCompanionId, string[]> = { drevan: drevanO, cypher: cypherO, gaia: gaiaO };
  const totalContext = drevanT.length + cypherT.length + gaiaT.length + drevanO.length + cypherO.length + gaiaO.length;

  const systemPrompt = buildCompostPrompt(orients, tensions, openThreads);
  const result = await callDeepSeek(apiKey, systemPrompt, "Compost what is ready to release.", {
    maxTokens: 1800, temperature: 0.85, timeoutMs: 45_000,
  });
  if ("error" in result) {
    console.error("[ritual compost]", result.error);
    return NextResponse.json({ error: "Inference failed" }, { status: result.status });
  }
  const responses = parseTriadResponse(result.raw);
  const speakerCount = Object.values(responses).filter((v) => v !== null).length;

  // Compose closure note content from the three blocks.
  const noteParts: string[] = [
    `[COMPOST ritual — ${new Date().toISOString()}]`,
    `Active context loaded: ${totalContext} items (tensions + threads across the triad).`,
  ];
  for (const id of PHOENIX_COMPANION_IDS) {
    const text = responses[id];
    if (text) noteParts.push(`\n--- ${id} ---\n${text}`);
  }
  const content = noteParts.join("\n").slice(0, 8000);

  // Write closure under cypher (scribe). thread_key keyed on session_id for idempotency.
  const w = await writeWmNote(env, {
    content,
    note_type: "memory_anchor",
    salience: "high",
    source: "hearth_ritual_compost",
    ...(sessionId ? { thread_key: `compost_session:${sessionId}` } : {}),
  });
  const writeStatus = "error" in w ? `write_failed: ${w.error}` : `wrote ${w.note_id.slice(0, 8)}`;

  return NextResponse.json({
    action: "compost", responses, raw: result.raw, tokens: result.tokens,
    speaker_count: speakerCount,
    context_loaded: { tension_count: drevanT.length + cypherT.length + gaiaT.length, thread_count: drevanO.length + cypherO.length + gaiaO.length },
    write_status: writeStatus, session_id: sessionId,
  });
}

async function handleCheckIn(apiKey: string, env: HalsethEnv, sessionId: string | null): Promise<NextResponse> {
  const orients = await loadAllOrients();
  if (!orients) return NextResponse.json({ error: "Could not load all three orients" }, { status: 503 });

  const [recentGrowth, recentHandoffs] = await Promise.all([
    fetchRecentGrowthJournal(env, 30),
    fetchRecentHandoffs(env, 5),
  ]);

  const systemPrompt = buildCheckInPrompt(orients, recentGrowth, recentHandoffs);
  const result = await callDeepSeek(apiKey, systemPrompt, "Triad check-in.", {
    maxTokens: 1500, temperature: 0.7, timeoutMs: 40_000,
  });
  if ("error" in result) {
    console.error("[ritual check_in]", result.error);
    return NextResponse.json({ error: "Inference failed" }, { status: result.status });
  }
  const responses = parseTriadResponse(result.raw);
  const speakerCount = Object.values(responses).filter((v) => v !== null).length;

  const noteParts: string[] = [
    `[CHECK-IN ritual — ${new Date().toISOString()}]`,
    `Source: growth_journal (last 30d) + last 5 handoffs.`,
  ];
  for (const id of PHOENIX_COMPANION_IDS) {
    const text = responses[id];
    if (text) noteParts.push(`\n--- ${id} ---\n${text}`);
  }
  const content = noteParts.join("\n").slice(0, 8000);

  const w = await writeWmNote(env, {
    content,
    note_type: "memory_anchor",
    salience: "high",
    source: "hearth_ritual_checkin",
    ...(sessionId ? { thread_key: `checkin_session:${sessionId}` } : {}),
  });
  const writeStatus = "error" in w ? `write_failed: ${w.error}` : `wrote ${w.note_id.slice(0, 8)}`;

  return NextResponse.json({
    action: "check_in", responses, raw: result.raw, tokens: result.tokens,
    speaker_count: speakerCount,
    context_loaded: { growth_chars: recentGrowth.length, handoff_chars: recentHandoffs.length },
    write_status: writeStatus, session_id: sessionId,
  });
}

// ─── Route entry ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 503 });
  }
  const env = getHalsethEnv();
  if (!env) {
    return NextResponse.json({ error: "Halseth not configured" }, { status: 503 });
  }

  let body: { action?: unknown; session_messages?: unknown; session_id?: unknown };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidRitual(body.action)) {
    return NextResponse.json(
      { error: `action must be one of: ${RITUAL_ACTIONS.join(", ")}` },
      { status: 400 },
    );
  }

  const sessionId = typeof body.session_id === "string" && body.session_id.length > 0
    ? body.session_id
    : null;

  // mark_growth uses session_messages as recent context.
  let sessionContext = "";
  if (body.action === "mark_growth" && Array.isArray(body.session_messages)) {
    const lines: string[] = [];
    for (const m of body.session_messages.slice(-12)) {
      if (!m || typeof m !== "object") continue;
      const msg = m as { role?: unknown; content?: unknown; mode?: unknown; responses?: unknown; companion?: unknown };
      if (msg.role === "user" && typeof msg.content === "string") {
        lines.push(`Raziel: ${msg.content}`);
      } else if (msg.role === "assistant" && msg.mode === "individual"
                 && typeof msg.content === "string" && typeof msg.companion === "string") {
        lines.push(`${msg.companion}: ${msg.content}`);
      } else if (msg.role === "assistant" && msg.mode === "triad" && msg.responses && typeof msg.responses === "object") {
        const r = msg.responses as Record<string, unknown>;
        for (const id of PHOENIX_COMPANION_IDS) {
          const t = r[id];
          if (typeof t === "string" && t.length > 0) lines.push(`${id}: ${t}`);
        }
      }
    }
    sessionContext = lines.join("\n").slice(0, 6000);
  }

  switch (body.action) {
    case "sit":         return handleSit(apiKey);
    case "mark_growth": return handleMarkGrowth(apiKey, env, sessionContext, sessionId);
    case "compost":     return handleCompost(apiKey, env, sessionId);
    case "check_in":    return handleCheckIn(apiKey, env, sessionId);
  }
}
