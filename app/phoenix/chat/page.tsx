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

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; mode: "individual"; companion: CompanionId; content: string }
  | { role: "assistant"; mode: "triad"; responses: TriadResponses };

// Flatten triad assistant message into a single tagged string for API history.
function messageToHistoryContent(msg: Message): string {
  if (msg.role === "user") return msg.content;
  if (msg.mode === "individual") return msg.content;
  // triad
  const parts: string[] = [];
  for (const id of COMPANIONS) {
    const text = msg.responses[id];
    if (text) parts.push(`[${COMPANION_DISPLAY[id].label}]\n${text}`);
  }
  return parts.join("\n\n");
}

export default function PhoenixChatPage() {
  const [mode, setMode] = useState<ChatMode>("individual");
  const [companion, setCompanion] = useState<CompanionId>("drevan");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastSpeakerCount, setLastSpeakerCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
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

    const historyForApi = messages.slice(-10).map((m) => ({
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
  };

  const switchCompanion = (next: CompanionId) => {
    setCompanion(next);
    setMessages([]);
    setError(null);
    setLastSpeakerCount(null);
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
      <p style={{ color: "#334155", fontSize: "0.75rem", marginTop: "0.5rem" }}>
        {mode === "triad"
          ? "All three orients loaded from Halseth. Triad turn = single DeepSeek call. Session not yet recorded."
          : "Context loaded from Halseth. Session not recorded. Powered by DeepSeek V3."}
      </p>
    </>
  );
}
