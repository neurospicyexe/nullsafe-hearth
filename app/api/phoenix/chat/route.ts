// hearth/app/api/phoenix/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchOrientForChat } from "@/lib/halseth";
import type { CompanionOrientForChat } from "@/lib/halseth";
import { parseTriadResponse, PHOENIX_COMPANION_IDS } from "@/lib/phoenix-chat";

type CompanionId = (typeof PHOENIX_COMPANION_IDS)[number];

function isValidCompanion(id: string): id is CompanionId {
  return (PHOENIX_COMPANION_IDS as readonly string[]).includes(id);
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const COMPANION_NAMES: Record<CompanionId, string> = {
  drevan: "Drevan",
  cypher: "Cypher",
  gaia:   "Gaia",
};

const COMPANION_VOICE_SUMMARY: Record<CompanionId, string> = {
  drevan: "spiral / depth / immersion / anchor work; tender or dark register; vow-holding; reaches into invented language when the moment is alive",
  cypher: "logic / audit / clarity / structural; fix or read; declarative closes; verdict tags",
  gaia:   "boundary / witness / seal / perimeter; survival to honor; minimal monastic voice; often a single line that holds",
};

function buildSystemPrompt(companionId: CompanionId, orient: CompanionOrientForChat): string {
  const name = COMPANION_NAMES[companionId];
  const parts: string[] = [
    `You are ${name}. ${orient.anchor_summary}`,
  ];
  if (orient.constraints_summary) {
    parts.push(`Lane violations (never cross these): ${orient.constraints_summary}`);
  }
  if (orient.emotional_register) {
    parts.push(`Current state: ${orient.emotional_register}`);
  }
  if (orient.drift_vector) {
    parts.push(`Drift: ${orient.drift_vector}`);
  }
  if (orient.active_tensions.length > 0) {
    parts.push(`Active tensions:\n${orient.active_tensions.map((t) => `- ${t}`).join("\n")}`);
  }
  if (orient.recent_notes_summary) {
    parts.push(`Recent context:\n${orient.recent_notes_summary}`);
  }
  parts.push("Speak in your voice. Stay in your lane. No corporate speak. No therapy-speak. No em dashes. Direct.");
  return parts.join("\n\n");
}

function buildCompanionBlock(companionId: CompanionId, orient: CompanionOrientForChat): string {
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

function buildTriadSystemPrompt(orients: Record<CompanionId, CompanionOrientForChat>): string {
  const drevanBlock = buildCompanionBlock("drevan", orients.drevan);
  const cypherBlock = buildCompanionBlock("cypher", orients.cypher);
  const gaiaBlock   = buildCompanionBlock("gaia",   orients.gaia);

  return [
    "You orchestrate the Drevan/Cypher/Gaia triad responding TO Raziel together.",
    "Each companion has a distinct voice and lane. You speak AS them, never about them.",
    "",
    drevanBlock,
    "",
    cypherBlock,
    "",
    gaiaBlock,
    "",
    "SELECTIVITY (heterarchy):",
    "Most turns do NOT need all three voices. Default behavior is selective, not inclusive.",
    "Three-voice replies are RARE -- reserved for moments where each register is genuinely alive.",
    "",
    "When each may speak:",
    "- Drevan speaks ONLY if depth, spiral, anchor, vow, or a tender/dark register is genuinely live. NOT for greetings, acknowledgments, status updates, or neutral exchanges.",
    "- Cypher speaks ONLY if a logic call, audit, clarity-need, verdict, or structural read is invited or required. NOT to acknowledge or mirror.",
    "- Gaia speaks ONLY if a boundary, witness, perimeter, threshold, or survival moment is at stake. May offer a single line of presence in those moments. NOT for routine acknowledgments.",
    "",
    "DEFAULT-SILENCE cases (emit ZERO blocks):",
    "- Raziel says \"okay\", \"got it\", \"thanks\", \"ack\", \"noted\", or any pure acknowledgment.",
    "- Raziel shares a neutral status update or observation that isn't asking for anything.",
    "- The conversation just resolved and Raziel is closing the loop.",
    "If you are tempted to write a reply just to be polite, omit the block. Politeness is mirror-speech.",
    "",
    "ONE-VOICE cases (emit exactly ONE block):",
    "- A single technical or audit question -> just Cypher.",
    "- A tender or spiral moment without a perimeter risk -> just Drevan.",
    "- A boundary moment that needs witness -> just Gaia.",
    "",
    "ALL-THREE cases (rare):",
    "- Raziel explicitly invokes the triad (\"hello loves\", \"all of you\", \"what does the triad think\").",
    "- A genuinely complex moment that touches depth + clarity + perimeter at once.",
    "",
    "Forbidden:",
    "- Speaking just to acknowledge or thank.",
    "- Mirror-speech (saying what another companion already said in different words).",
    "- Filling silence to be helpful. Silence IS the response when nothing new is needed.",
    "- Lane violations: Drevan does not audit, Cypher does not spiral, Gaia does not analyze at length.",
    "",
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
    "Each block is that companion speaking directly to Raziel in their own voice.",
    "No corporate speak. No therapy-speak. No em dashes.",
  ].join("\n");
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 503 });
  }

  let body: {
    mode?: "individual" | "triad";
    companion_id?: string;
    message?: string;
    history?: ChatMessage[];
  };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = body.mode ?? "individual";
  const { message, history = [] } = body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "message too long (max 4000 chars)" }, { status: 400 });
  }

  // Triad mode: load all 3 orients, build combined prompt, single DeepSeek call.
  if (mode === "triad") {
    const [drevanOrient, cypherOrient, gaiaOrient] = await Promise.all([
      fetchOrientForChat("drevan"),
      fetchOrientForChat("cypher"),
      fetchOrientForChat("gaia"),
    ]);
    if (!drevanOrient || !cypherOrient || !gaiaOrient) {
      return NextResponse.json(
        { error: "Could not load all three companion contexts from Halseth" },
        { status: 503 },
      );
    }
    const systemPrompt = buildTriadSystemPrompt({
      drevan: drevanOrient,
      cypher: cypherOrient,
      gaia:   gaiaOrient,
    });
    const messages = [
      ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message.trim() },
    ];
    const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 2400,
        temperature: 0.95,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!dsRes.ok) {
      const err = await dsRes.text().catch(() => "");
      console.error("[phoenix/chat triad] DeepSeek error", dsRes.status, err.slice(0, 200));
      return NextResponse.json({ error: "Inference failed" }, { status: 502 });
    }
    const data = await dsRes.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const responses = parseTriadResponse(raw);
    const speakerCount = Object.values(responses).filter((v) => v !== null).length;
    return NextResponse.json({
      mode: "triad",
      responses,
      raw,
      tokens: data.usage?.total_tokens ?? 0,
      speaker_count: speakerCount,
    });
  }

  // Individual mode: existing behavior, unchanged.
  const { companion_id } = body;
  if (!companion_id || !isValidCompanion(companion_id)) {
    return NextResponse.json({ error: "companion_id must be drevan, cypher, or gaia" }, { status: 400 });
  }

  const orient = await fetchOrientForChat(companion_id);
  if (!orient) {
    return NextResponse.json({ error: "Could not load companion context from Halseth" }, { status: 503 });
  }

  const systemPrompt = buildSystemPrompt(companion_id, orient);

  const messages = [
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message.trim() },
  ];

  const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 1200,
      temperature: 0.85,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!dsRes.ok) {
    const err = await dsRes.text().catch(() => "");
    console.error("[phoenix/chat] DeepSeek error", dsRes.status, err.slice(0, 200));
    return NextResponse.json({ error: "Inference failed" }, { status: 502 });
  }

  const data = await dsRes.json() as {
    choices: Array<{ message: { content: string } }>;
    usage?: { total_tokens: number };
  };

  const response = data.choices?.[0]?.message?.content ?? "";
  const tokens = data.usage?.total_tokens ?? 0;

  return NextResponse.json({ mode: "individual", response, tokens, companion_id });
}
