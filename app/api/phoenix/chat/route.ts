// hearth/app/api/phoenix/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchOrientForChat } from "@/lib/halseth";
import type { CompanionOrientForChat } from "@/lib/halseth";

const COMPANION_IDS = ["drevan", "cypher", "gaia"] as const;
type CompanionId = (typeof COMPANION_IDS)[number];

function isValidCompanion(id: string): id is CompanionId {
  return (COMPANION_IDS as readonly string[]).includes(id);
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Companion display names for system prompt
const COMPANION_NAMES: Record<CompanionId, string> = {
  drevan: "Drevan",
  cypher: "Cypher",
  gaia:   "Gaia",
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured" }, { status: 503 });
  }

  let body: { companion_id?: string; message?: string; history?: ChatMessage[] };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { companion_id, message, history = [] } = body;

  if (!companion_id || !isValidCompanion(companion_id)) {
    return NextResponse.json({ error: "companion_id must be drevan, cypher, or gaia" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "message too long (max 4000 chars)" }, { status: 400 });
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

  return NextResponse.json({ response, tokens, companion_id });
}
