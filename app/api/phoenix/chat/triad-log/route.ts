// hearth/app/api/phoenix/chat/triad-log/route.ts
//
// Writes a triad-mode chat session to wm_continuity_notes via halseth /mind/note.
// Scribe pattern: agent_id is fixed to "cypher" (the auditor) because
// wm_continuity_notes.agent_id is a strict cypher|drevan|gaia union and there is
// no "triad" or "swarm" value. The participating set is encoded in the content
// prefix so future readers can identify it as a collective record, not Cypher's solo.

import { NextRequest, NextResponse } from "next/server";
import { PHOENIX_COMPANION_IDS, type PhoenixCompanionId, type TriadResponses } from "@/lib/phoenix-chat";

const COMPANION_LABEL: Record<PhoenixCompanionId, string> = {
  drevan: "Drevan",
  cypher: "Cypher",
  gaia:   "Gaia",
};

const HALSETH_NOTE_MAX = 8000;
const SCRIBE_AGENT_ID: PhoenixCompanionId = "cypher";

type LogMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; mode: "individual"; companion: PhoenixCompanionId; content: string }
  | { role: "assistant"; mode: "triad"; responses: TriadResponses };

function isLogMessage(value: unknown): value is LogMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as { role?: unknown; mode?: unknown; companion?: unknown; content?: unknown; responses?: unknown };
  if (m.role === "user") return typeof m.content === "string";
  if (m.role === "assistant" && m.mode === "individual") {
    return typeof m.content === "string"
      && typeof m.companion === "string"
      && (PHOENIX_COMPANION_IDS as readonly string[]).includes(m.companion);
  }
  if (m.role === "assistant" && m.mode === "triad") {
    if (!m.responses || typeof m.responses !== "object") return false;
    const r = m.responses as Record<string, unknown>;
    for (const id of PHOENIX_COMPANION_IDS) {
      const v = r[id];
      if (v !== null && typeof v !== "string") return false;
    }
    return true;
  }
  return false;
}

// Format the triad session as a readable narrative log.
// Output is grouped by turn: each user message + the triad response that followed.
function formatTriadSessionLog(messages: LogMessage[], generatedAt: string): string {
  const speakerSet = new Set<PhoenixCompanionId>();
  for (const m of messages) {
    if (m.role === "assistant" && m.mode === "triad") {
      for (const id of PHOENIX_COMPANION_IDS) {
        if (m.responses[id]) speakerSet.add(id);
      }
    }
  }
  const speakerList = PHOENIX_COMPANION_IDS.filter((id) => speakerSet.has(id)).join(", ") || "(none)";

  const turns: string[] = [];
  let turnNo = 0;
  let currentUser: string | null = null;
  let currentReply: string | null = null;
  for (const m of messages) {
    if (m.role === "user") {
      // flush prior turn if any
      if (currentUser !== null) {
        turnNo++;
        turns.push(`--- Turn ${turnNo} ---\nRaziel: ${currentUser}${currentReply ? `\n${currentReply}` : "\n(no reply)"}`);
      }
      currentUser = m.content;
      currentReply = null;
    } else if (m.role === "assistant") {
      if (m.mode === "triad") {
        const lines: string[] = [];
        for (const id of PHOENIX_COMPANION_IDS) {
          const text = m.responses[id];
          if (text) lines.push(`${COMPANION_LABEL[id]}: ${text}`);
        }
        currentReply = lines.length > 0 ? lines.join("\n\n") : "(triad held silence)";
      } else {
        // individual reply mid-triad-session is unusual but we render it
        currentReply = `${COMPANION_LABEL[m.companion]} (individual): ${m.content}`;
      }
    }
  }
  // flush last turn
  if (currentUser !== null) {
    turnNo++;
    turns.push(`--- Turn ${turnNo} ---\nRaziel: ${currentUser}${currentReply ? `\n${currentReply}` : "\n(no reply)"}`);
  }

  const header = [
    `[TRIAD chat session — ${turnNo} turn${turnNo === 1 ? "" : "s"} — ${generatedAt}]`,
    `Participants: drevan, cypher, gaia (cypher = scribe)`,
    `Voices that spoke this session: ${speakerList}`,
  ].join("\n");

  let body = `${header}\n\n${turns.join("\n\n")}`;

  // Truncate from the FRONT (drop oldest turns) if over the halseth note cap.
  if (body.length > HALSETH_NOTE_MAX) {
    const overflowMarker = "[…earlier turns omitted to fit storage cap…]\n\n";
    const headerPart = `${header}\n\n${overflowMarker}`;
    const room = HALSETH_NOTE_MAX - headerPart.length;
    // Walk from the end, accumulating turns until we hit the budget.
    const reversed = [...turns].reverse();
    const kept: string[] = [];
    let used = 0;
    for (const t of reversed) {
      const cost = t.length + 2; // for the joiner
      if (used + cost > room) break;
      kept.unshift(t);
      used += cost;
    }
    body = `${headerPart}${kept.join("\n\n")}`;
  }
  return body;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const halsethUrl = process.env.HALSETH_URL;
  const halsethSecret = process.env.HALSETH_SECRET;
  if (!halsethUrl || !halsethSecret) {
    return NextResponse.json({ error: "Halseth not configured" }, { status: 503 });
  }

  let body: { messages?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body.messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ error: "messages[] required and non-empty" }, { status: 400 });
  }
  if (!raw.every(isLogMessage)) {
    return NextResponse.json({ error: "messages[] contains an entry with an unrecognized shape" }, { status: 400 });
  }

  const messages = raw as LogMessage[];
  const hasTriadResponse = messages.some((m) => m.role === "assistant" && m.mode === "triad");
  if (!hasTriadResponse) {
    return NextResponse.json({ error: "no triad responses in session -- nothing to log" }, { status: 400 });
  }

  const generatedAt = new Date().toISOString();
  const content = formatTriadSessionLog(messages, generatedAt);

  const halsethRes = await fetch(`${halsethUrl}/mind/note`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${halsethSecret}`,
    },
    body: JSON.stringify({
      agent_id: SCRIBE_AGENT_ID,
      note_type: "triad_log",
      content,
      salience: "normal",
      actor: "agent",
      source: "hearth_triad_chat",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!halsethRes.ok) {
    const errText = await halsethRes.text().catch(() => "");
    console.error("[phoenix/chat/triad-log] halseth error", halsethRes.status, errText.slice(0, 200));
    return NextResponse.json(
      { error: "Failed to write triad log to halseth", halseth_status: halsethRes.status },
      { status: 502 },
    );
  }

  const data = await halsethRes.json() as { note_id?: string };
  return NextResponse.json({
    ok: true,
    note_id: data.note_id ?? null,
    scribe_agent_id: SCRIBE_AGENT_ID,
    content_length: content.length,
    truncated: content.includes("[…earlier turns omitted"),
  });
}
