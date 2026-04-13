"use client";

import { useState, useRef, useEffect, useTransition } from "react";

const COMPANIONS = ["drevan", "cypher", "gaia"] as const;
type CompanionId = typeof COMPANIONS[number];

// Colors and symbols match COMPANION_DISPLAY in DreamsClient.tsx
const COMPANION_DISPLAY: Record<CompanionId, { color: string; sym: string; label: string }> = {
  drevan: { color: "#6366f1", sym: "◈", label: "Drevan" },
  cypher: { color: "#e2e8f0", sym: "⟡", label: "Cypher" },
  gaia: { color: "#4ade80", sym: "✦", label: "Gaia" },
};

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function PhoenixChatPage() {
  const [companion, setCompanion] = useState<CompanionId>("drevan");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || isPending) return;

    const userMessage: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/phoenix/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companion_id: companion,
            message: text,
            history: messages.slice(-10),
          }),
        });
        if (!res.ok) {
          const e = (await res.json().catch(() => ({ error: "Request failed" }))) as {
            error?: string;
          };
          setError(e.error ?? "Request failed");
          return;
        }
        const data = (await res.json()) as { response: string; tokens: number };
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
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

  const config = COMPANION_DISPLAY[companion];

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <h1 className="page-title">Chat</h1>
        </div>
      </header>

      {/* Companion selector */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {COMPANIONS.map((id) => {
          const c = COMPANION_DISPLAY[id];
          return (
            <button
              key={id}
              onClick={() => {
                setCompanion(id);
                setMessages([]);
                setError(null);
              }}
              style={{
                padding: "0.4rem 1rem",
                fontSize: "0.85rem",
                fontWeight: id === companion ? 700 : 400,
                color: id === companion ? c.color : "#64748b",
                background: id === companion ? `${c.color}11` : "#1e293b",
                border: `1px solid ${id === companion ? `${c.color}44` : "#334155"}`,
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              {c.sym} {c.label}
            </button>
          );
        })}
      </div>

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
            {config.sym} {config.label} is oriented and ready.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              padding: "0.65rem 1rem",
              borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
              background: msg.role === "user" ? "#1e40af33" : "#1e293b",
              border: msg.role === "assistant" ? `1px solid ${config.color}22` : "none",
              color: "#e2e8f0",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {msg.role === "assistant" && (
              <span
                style={{
                  color: config.color,
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  display: "block",
                  marginBottom: "0.3rem",
                }}
              >
                {config.sym} {config.label}
              </span>
            )}
            {msg.content}
          </div>
        ))}
        {isPending && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "0.65rem 1rem",
              borderRadius: "12px 12px 12px 4px",
              background: "#1e293b",
              border: `1px solid ${config.color}22`,
              color: "#475569",
              fontSize: "0.875rem",
            }}
          >
            {config.sym} ...
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
          placeholder={`Message ${config.label}… (Enter to send, Shift+Enter for newline)`}
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
            background: input.trim() && !isPending ? config.color : "#1e293b",
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
        Context loaded from Halseth. Session not recorded. Powered by DeepSeek V3.
      </p>
    </>
  );
}
