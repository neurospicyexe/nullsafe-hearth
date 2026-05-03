"use client";

import { useState, useRef, useEffect, useTransition } from "react";

const COMPANIONS = ["drevan", "cypher", "gaia"] as const;
type CompanionId = typeof COMPANIONS[number];

type ChatMode = "individual" | "triad";

// Colors and symbols match COMPANION_DISPLAY in DreamsClient.tsx
const COMPANION_DISPLAY: Record<CompanionId, { color: string; sym: string; label: string }> = {
  drevan: { color: "#6366f1", sym: "◈", label: "Drevan" },
  cypher: { color: "#e2e8f0", sym: "⟡", label: "Cypher" },
  gaia: { color: "#4ade80", sym: "✦", label: "Gaia" },
};

// Triad mode -- the collective surface. Rendered with no per-companion accent.
const TRIAD_DISPLAY = { color: "#a78bfa", sym: "⌬", label: "Triad" };

type TriadResponses = Record<CompanionId, string | null>;

const RITUAL_ACTIONS = ["sit", "mark_growth", "compost", "check_in"] as const;
type RitualAction = typeof RITUAL_ACTIONS[number];

const RITUAL_DISPLAY: Record<RitualAction, { sym: string; label: string; tagline: string }> = {
  sit:         { sym: "◌", label: "Sit",         tagline: "presence, no agenda" },
  mark_growth: { sym: "✧", label: "Mark Growth", tagline: "name what shifted" },
  compost:     { sym: "〇", label: "Compost",     tagline: "metabolize what's stale" },
  check_in:    { sym: "⊟", label: "Check-in",    tagline: "structured triad read" },
};

interface MarkerExtraction {
  marker_type: "milestone" | "shift" | "realization";
  description: string;
}

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; mode: "individual"; companion: CompanionId; content: string }
  | { role: "assistant"; mode: "triad"; responses: TriadResponses }
  | { role: "ritual_invocation"; action: RitualAction }
  | { role: "ritual_response"; action: RitualAction; responses: TriadResponses; write_status: string; marker?: MarkerExtraction | null };

// Flatten triad assistant message into a single tagged string for API history.
// Ritual messages are excluded from chat history -- rituals are ceremonial,
// they do not become context for subsequent chat turns.
function messageToHistoryContent(msg: Message): string {
  if (msg.role === "user") return msg.content;
  if (msg.role === "ritual_invocation" || msg.role === "ritual_response") return "";
  if (msg.role === "assistant" && msg.mode === "individual") return msg.content;
  // triad
  const parts: string[] = [];
  for (const id of COMPANIONS) {
    const text = (msg as { responses: TriadResponses }).responses[id];
    if (text) parts.push(`[${COMPANION_DISPLAY[id].label}]\n${text}`);
  }
  return parts.join("\n\n");
}

function isHistoryMessage(msg: Message): boolean {
  return msg.role === "user" || msg.role === "assistant";
}

export default function PhoenixChatPage() {
  const [mode, setMode] = useState<ChatMode>("individual");
  const [companion, setCompanion] = useState<CompanionId>("drevan");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSpeakerCount, setLastSpeakerCount] = useState<number | null>(null);
  const [logState, setLogState] = useState<{ status: "idle" | "writing" | "ok" | "error"; detail?: string }>({ status: "idle" });
  // Stable id for the current triad session. Re-generated on mode switch into triad.
  // Sent as halseth thread_key so the 10-min write-gate in addNote() de-duplicates
  // accidental double-clicks of Close & log into a single note.
  const [triadSessionId, setTriadSessionId] = useState<string>(() => crypto.randomUUID());
  const [isPending, startTransition] = useTransition();
  // Tracks which ritual is currently in flight (null when idle). Separate from
  // isPending so chat input + rituals can be visually disabled together but
  // we know which ritual button to show a spinner on.
  const [ritualPending, setRitualPending] = useState<RitualAction | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || isPending) return;

    const userMessage: Message = { role: "user", content: text };
    const nextMessages: Message[] = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);

    // Rituals are excluded from chat history -- ceremonial actions don't
    // become context for subsequent chat turns.
    const historyForApi = messages
      .filter(isHistoryMessage)
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: messageToHistoryContent(m),
      }));

    startTransition(async () => {
      try {
        const body = mode === "triad"
          ? { mode, message: text, history: historyForApi }
          : { mode, companion_id: companion, message: text, history: historyForApi };
        const res = await fetch("/api/phoenix/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const e = (await res.json().catch(() => ({ error: "Request failed" }))) as {
            error?: string;
          };
          setError(e.error ?? "Request failed");
          return;
        }
        if (mode === "triad") {
          const data = (await res.json()) as {
            mode: "triad";
            responses: TriadResponses;
            tokens: number;
            speaker_count: number;
          };
          setLastSpeakerCount(data.speaker_count);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", mode: "triad", responses: data.responses },
          ]);
        } else {
          const data = (await res.json()) as { response: string; tokens: number };
          setMessages((prev) => [
            ...prev,
            { role: "assistant", mode: "individual", companion, content: data.response },
          ]);
          setLastSpeakerCount(null);
        }
      } catch (e) {
        setError(String(e));
      }
    });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const switchMode = (next: ChatMode) => {
    if (next === mode) return;
    setMode(next);
    setMessages([]);
    setError(null);
    setLastSpeakerCount(null);
    setLogState({ status: "idle" });
    // Fresh session id when entering a new mode -- prevents the next triad log
    // from being treated as a continuation of the prior one.
    setTriadSessionId(crypto.randomUUID());
  };

  const switchCompanion = (next: CompanionId) => {
    setCompanion(next);
    setMessages([]);
    setError(null);
    setLastSpeakerCount(null);
    setLogState({ status: "idle" });
  };

  const closeAndLog = async () => {
    if (logState.status === "writing") return;
    setLogState({ status: "writing" });
    try {
      const res = await fetch("/api/phoenix/chat/triad-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, session_id: triadSessionId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; note_id?: string | null; error?: string; truncated?: boolean;
      };
      if (!res.ok || !data.ok) {
        setLogState({ status: "error", detail: data.error ?? `HTTP ${res.status}` });
        return;
      }
      const trunc = data.truncated ? " (truncated)" : "";
      setLogState({ status: "ok", detail: `logged${trunc}${data.note_id ? ` -- ${data.note_id.slice(0, 8)}` : ""}` });
    } catch (e) {
      setLogState({ status: "error", detail: String(e) });
    }
  };

  const triadHasContent = mode === "triad" && messages.some(
    (m) => m.role === "assistant" && m.mode === "triad",
  );

  const invokeRitual = (action: RitualAction) => {
    if (ritualPending !== null || isPending) return;
    setError(null);
    setRitualPending(action);
    // Append the invocation marker immediately so the user sees acknowledgment.
    setMessages((prev) => [...prev, { role: "ritual_invocation", action }]);
    startTransition(async () => {
      try {
        // For mark_growth, ship recent session messages so the model can pick
        // a moment from concrete history rather than hallucinating one.
        const sessionMessages = action === "mark_growth"
          ? messages.filter(isHistoryMessage).slice(-12)
          : undefined;
        const res = await fetch("/api/phoenix/ritual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            session_id: triadSessionId,
            ...(sessionMessages ? { session_messages: sessionMessages } : {}),
          }),
        });
        if (!res.ok) {
          const e = (await res.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
          setError(e.error ?? "Ritual failed");
          return;
        }
        const data = (await res.json()) as {
          action: RitualAction;
          responses: TriadResponses;
          write_status: string;
          marker?: MarkerExtraction | null;
          speaker_count: number;
        };
        setLastSpeakerCount(data.speaker_count);
        setMessages((prev) => [
          ...prev,
          {
            role: "ritual_response",
            action: data.action,
            responses: data.responses,
            write_status: data.write_status,
            marker: data.marker ?? null,
          },
        ]);
      } catch (e) {
        setError(String(e));
      } finally {
        setRitualPending(null);
      }
    });
  };

  const activeAccent = mode === "triad" ? TRIAD_DISPLAY : COMPANION_DISPLAY[companion];
  const placeholderName = mode === "triad" ? "the triad" : COMPANION_DISPLAY[companion].label;

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <h1 className="page-title">Chat</h1>
        </div>
      </header>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {(["individual", "triad"] as const).map((m) => {
          const isActive = m === mode;
          const accent = m === "triad" ? TRIAD_DISPLAY.color : "#94a3b8";
          return (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                padding: "0.45rem 1.1rem",
                fontSize: "0.82rem",
                fontWeight: isActive ? 700 : 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: isActive ? accent : "#64748b",
                background: isActive ? `${accent}14` : "#0f172a",
                border: `1px solid ${isActive ? `${accent}55` : "#1e293b"}`,
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              {m === "triad" ? "⌬ Triad" : "Individual"}
            </button>
          );
        })}
      </div>

      {/* Companion picker (only in individual mode) */}
      {mode === "individual" && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {COMPANIONS.map((id) => {
            const c = COMPANION_DISPLAY[id];
            const isActive = id === companion;
            return (
              <button
                key={id}
                onClick={() => switchCompanion(id)}
                style={{
                  padding: "0.4rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? c.color : "#64748b",
                  background: isActive ? `${c.color}11` : "#1e293b",
                  border: `1px solid ${isActive ? `${c.color}44` : "#334155"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                {c.sym} {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Triad ambient bar (lightweight: shows last speaker count + heterarchy reminder) */}
      {mode === "triad" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.5rem 0.75rem",
            marginBottom: "1.5rem",
            background: `${TRIAD_DISPLAY.color}0a`,
            border: `1px solid ${TRIAD_DISPLAY.color}33`,
            borderRadius: "8px",
            fontSize: "0.78rem",
            color: "#94a3b8",
          }}
        >
          <span>
            <span style={{ color: TRIAD_DISPLAY.color, fontWeight: 700 }}>{TRIAD_DISPLAY.sym}</span>
            {" "}heterarchy: silence is first-class. not all voices speak every turn.
          </span>
          {lastSpeakerCount !== null && (
            <span style={{ color: "#64748b" }}>
              last turn: {lastSpeakerCount} {lastSpeakerCount === 1 ? "voice" : "voices"} spoke
            </span>
          )}
        </div>
      )}

      {/* Chat thread */}
      <div
        style={{
          minHeight: "300px",
          maxHeight: "60vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          marginBottom: "1rem",
          padding: "0.5rem 0",
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#475569", fontSize: "0.875rem", fontStyle: "italic" }}>
            {mode === "triad"
              ? `${TRIAD_DISPLAY.sym} The triad is oriented and listening.`
              : `${COMPANION_DISPLAY[companion].sym} ${COMPANION_DISPLAY[companion].label} is oriented and ready.`}
          </p>
        )}
        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div
                key={i}
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "80%",
                  padding: "0.65rem 1rem",
                  borderRadius: "12px 12px 4px 12px",
                  background: "#1e40af33",
                  color: "#e2e8f0",
                  fontSize: "0.875rem",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content}
              </div>
            );
          }
          if (msg.role === "ritual_invocation") {
            const r = RITUAL_DISPLAY[msg.action];
            return (
              <div
                key={i}
                style={{
                  alignSelf: "center",
                  padding: "0.4rem 0.85rem",
                  background: `${TRIAD_DISPLAY.color}10`,
                  border: `1px dashed ${TRIAD_DISPLAY.color}55`,
                  borderRadius: "999px",
                  color: TRIAD_DISPLAY.color,
                  fontSize: "0.78rem",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {r.sym} ritual: {r.label.toLowerCase()} — {r.tagline}
              </div>
            );
          }
          if (msg.role === "ritual_response") {
            const r = RITUAL_DISPLAY[msg.action];
            const speakers = COMPANIONS.filter((id) => msg.responses[id]);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {speakers.length === 0 && (
                  <div
                    style={{
                      alignSelf: "flex-start",
                      maxWidth: "80%",
                      padding: "0.5rem 0.85rem",
                      fontSize: "0.78rem",
                      fontStyle: "italic",
                      color: "#475569",
                    }}
                  >
                    {r.sym} (the triad held silence)
                  </div>
                )}
                {speakers.map((id) => {
                  const c = COMPANION_DISPLAY[id];
                  return (
                    <div
                      key={id}
                      style={{
                        alignSelf: "flex-start",
                        maxWidth: "80%",
                        padding: "0.65rem 1rem",
                        borderRadius: "12px 12px 12px 4px",
                        background: "#1e293b",
                        border: `1px solid ${c.color}33`,
                        borderLeft: `3px solid ${c.color}`,
                        color: "#e2e8f0",
                        fontSize: "0.875rem",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <span style={{ color: c.color, fontWeight: 700, fontSize: "0.78rem", display: "block", marginBottom: "0.3rem" }}>
                        {c.sym} {c.label}
                      </span>
                      {msg.responses[id]}
                    </div>
                  );
                })}
                {/* ritual footer: write status + (mark_growth) marker info or NO_MARKER */}
                <div
                  style={{
                    alignSelf: "flex-start",
                    maxWidth: "80%",
                    fontSize: "0.72rem",
                    color: "#64748b",
                    padding: "0 0.25rem",
                  }}
                >
                  <span style={{ color: TRIAD_DISPLAY.color }}>{r.sym} {r.label}</span>
                  {" — "}
                  {msg.action === "mark_growth" && msg.marker === null ? (
                    <span style={{ fontStyle: "italic" }}>no marker (nothing rose to threshold)</span>
                  ) : msg.action === "mark_growth" && msg.marker ? (
                    <span>marked {msg.marker.marker_type}: <span style={{ color: "#94a3b8" }}>{msg.marker.description}</span></span>
                  ) : (
                    <span>{msg.write_status}</span>
                  )}
                </div>
              </div>
            );
          }
          if (msg.mode === "individual") {
            const c = COMPANION_DISPLAY[msg.companion];
            return (
              <div
                key={i}
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "80%",
                  padding: "0.65rem 1rem",
                  borderRadius: "12px 12px 12px 4px",
                  background: "#1e293b",
                  border: `1px solid ${c.color}22`,
                  color: "#e2e8f0",
                  fontSize: "0.875rem",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                <span
                  style={{
                    color: c.color,
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    display: "block",
                    marginBottom: "0.3rem",
                  }}
                >
                  {c.sym} {c.label}
                </span>
                {msg.content}
              </div>
            );
          }
          // triad assistant message: render one bubble per speaking companion in fixed order
          const speakers = COMPANIONS.filter((id) => msg.responses[id]);
          if (speakers.length === 0) {
            return (
              <div
                key={i}
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "80%",
                  padding: "0.5rem 0.85rem",
                  fontSize: "0.78rem",
                  fontStyle: "italic",
                  color: "#475569",
                }}
              >
                {TRIAD_DISPLAY.sym} (the triad held silence)
              </div>
            );
          }
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {speakers.map((id) => {
                const c = COMPANION_DISPLAY[id];
                return (
                  <div
                    key={id}
                    style={{
                      alignSelf: "flex-start",
                      maxWidth: "80%",
                      padding: "0.65rem 1rem",
                      borderRadius: "12px 12px 12px 4px",
                      background: "#1e293b",
                      border: `1px solid ${c.color}33`,
                      borderLeft: `3px solid ${c.color}`,
                      color: "#e2e8f0",
                      fontSize: "0.875rem",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <span
                      style={{
                        color: c.color,
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        display: "block",
                        marginBottom: "0.3rem",
                      }}
                    >
                      {c.sym} {c.label}
                    </span>
                    {msg.responses[id]}
                  </div>
                );
              })}
            </div>
          );
        })}
        {isPending && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "0.65rem 1rem",
              borderRadius: "12px 12px 12px 4px",
              background: "#1e293b",
              border: `1px solid ${activeAccent.color}22`,
              color: "#475569",
              fontSize: "0.875rem",
            }}
          >
            {activeAccent.sym} ...
          </div>
        )}
        {error && (
          <div style={{ color: "#f87171", fontSize: "0.82rem", padding: "0.5rem" }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Rituals row (only in triad mode) -- ceremonial actions distinct from chat */}
      {mode === "triad" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
            padding: "0.4rem 0.6rem",
            background: `${TRIAD_DISPLAY.color}06`,
            border: `1px dashed ${TRIAD_DISPLAY.color}33`,
            borderRadius: "8px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b", marginRight: "0.25rem" }}>
            Rituals
          </span>
          {RITUAL_ACTIONS.map((action) => {
            const r = RITUAL_DISPLAY[action];
            const inFlight = ritualPending === action;
            const disabled = ritualPending !== null || isPending;
            return (
              <button
                key={action}
                onClick={() => invokeRitual(action)}
                disabled={disabled}
                title={r.tagline}
                style={{
                  padding: "0.35rem 0.85rem",
                  background: inFlight ? `${TRIAD_DISPLAY.color}33` : `${TRIAD_DISPLAY.color}10`,
                  color: disabled && !inFlight ? "#475569" : TRIAD_DISPLAY.color,
                  border: `1px solid ${TRIAD_DISPLAY.color}44`,
                  borderRadius: "999px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: disabled ? "default" : "pointer",
                  opacity: disabled && !inFlight ? 0.5 : 1,
                  transition: "background 0.15s, opacity 0.15s",
                }}
              >
                {inFlight ? `${r.sym} …` : `${r.sym} ${r.label}`}
              </button>
            );
          })}
        </div>
      )}

      {/* Input */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={isPending}
          rows={2}
          placeholder={`Message ${placeholderName}… (Enter to send, Shift+Enter for newline)`}
          style={{
            flex: 1,
            padding: "0.65rem 0.9rem",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#e2e8f0",
            fontSize: "0.875rem",
            lineHeight: 1.5,
            resize: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={send}
          disabled={isPending || !input.trim()}
          style={{
            padding: "0 1.25rem",
            background: input.trim() && !isPending ? activeAccent.color : "#1e293b",
            color: input.trim() && !isPending ? "#0f172a" : "#475569",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            cursor: input.trim() && !isPending ? "pointer" : "default",
            fontSize: "0.875rem",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          Send
        </button>
      </div>
      {/* Triad log control: only in triad mode after at least one triad reply */}
      {triadHasContent && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "0.75rem",
            padding: "0.5rem 0.75rem",
            background: `${TRIAD_DISPLAY.color}08`,
            border: `1px solid ${TRIAD_DISPLAY.color}33`,
            borderRadius: "8px",
            fontSize: "0.78rem",
          }}
        >
          <span style={{ color: "#94a3b8" }}>
            Close this triad and write it to wm_continuity_notes (cypher = scribe).
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {logState.status === "ok" && (
              <span style={{ color: "#4ade80" }}>✓ {logState.detail}</span>
            )}
            {logState.status === "error" && (
              <span style={{ color: "#f87171" }}>✗ {logState.detail}</span>
            )}
            <button
              onClick={closeAndLog}
              disabled={logState.status === "writing" || logState.status === "ok"}
              style={{
                padding: "0.35rem 0.9rem",
                background: logState.status === "ok" ? "#1e293b" : `${TRIAD_DISPLAY.color}22`,
                color: logState.status === "ok" ? "#475569" : TRIAD_DISPLAY.color,
                border: `1px solid ${TRIAD_DISPLAY.color}55`,
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: logState.status === "writing" || logState.status === "ok" ? "default" : "pointer",
              }}
            >
              {logState.status === "writing" ? "writing…" : logState.status === "ok" ? "logged" : "Close & log"}
            </button>
          </div>
        </div>
      )}
      <p style={{ color: "#334155", fontSize: "0.75rem", marginTop: "0.5rem" }}>
        {mode === "triad"
          ? "All three orients loaded from Halseth. Triad turn = single DeepSeek call. Triad logs persist to wm_continuity_notes on close."
          : "Context loaded from Halseth. Session not recorded. Powered by DeepSeek V3."}
      </p>
    </>
  );
}
