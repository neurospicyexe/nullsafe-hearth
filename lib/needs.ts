// "Needs you" model: pure logic for the inbox rows (what to write, what to say, row state).
// No React, no fetch; the page wires these to the write queue.
import type { NeedsItem, NeedsKind } from "./halseth";
import type { QueuedWrite, WriteResult } from "./write-queue";

export type NeedsAction =
  | { kind: "question"; verb: "answer"; answer: string } | { kind: "question"; verb: "dismiss" }
  | { kind: "growth"; verb: "accept" | "decline" }
  | { kind: "guardian"; verb: "acknowledge" | "resolve" }
  | { kind: "basin"; verb: "confirm" | "dismiss" };

export function resolveWrite(item: NeedsItem, action: NeedsAction): QueuedWrite {
  const key = `needs:${item.kind}:${item.id}`;
  const id = encodeURIComponent(item.id);
  switch (action.kind) {
    case "question":
      return {
        key, url: "/api/questions", method: "POST",
        body: action.verb === "answer"
          ? { id: item.id, status: "answered", answer: action.answer }
          : { id: item.id, status: "dismissed" },
      };
    case "growth":
      return { key, url: `/api/mind/growth/journal/${id}/${action.verb}`, method: "PATCH", body: { companion_id: item.companion_id } };
    case "guardian":
      return {
        key, url: `/api/guardian/${id}`, method: "PATCH",
        body: { status: action.verb === "resolve" ? "resolved" : "acknowledged" },
      };
    case "basin":
      return { key, url: "/api/basins", method: "POST", body: { id: item.id, action: action.verb } };
  }
}

const COMPANION: Record<string, string> = { drevan: "Drevan", cypher: "Cypher", gaia: "Gaia" };

export function whoLabel(item: NeedsItem): string {
  if (item.kind === "guardian") return "Guardian";
  return (item.companion_id && COMPANION[item.companion_id]) || "Guardian";
}

export function titleText(item: NeedsItem): string {
  if (item.title) return item.title;
  if (item.kind === "basin") return `Pressure drift ${(item.drift_score ?? 0).toFixed(2)}`;
  return "";
}

export function kindLabel(kind: NeedsKind): string {
  return { question: "asks", growth: "growth to ratify", guardian: "flag", basin: "basin drift" }[kind];
}

export function buttons(item: NeedsItem): { verb: string; label: string }[] {
  switch (item.kind) {
    case "question": return [{ verb: "answer", label: "Answer" }, { verb: "dismiss", label: "Dismiss" }];
    case "growth": return [{ verb: "accept", label: "Accept" }, { verb: "decline", label: "Decline" }];
    case "guardian": return [{ verb: "acknowledge", label: "Seen it" }, { verb: "resolve", label: "Resolved" }];
    case "basin": return [{ verb: "confirm", label: "It's growth" }, { verb: "dismiss", label: "Noise" }];
  }
}

export function doneLine(action: NeedsAction): string {
  switch (action.verb) {
    case "answer": return "Answered.";
    case "accept": return "Accepted.";
    case "decline": return "Declined.";
    case "acknowledge": return "Marked seen.";
    case "resolve": return "Resolved.";
    case "confirm": return "Marked growth.";
    case "dismiss": return action.kind === "basin" ? "Marked noise." : "Dismissed.";
  }
}

export function outcomeLine(r: WriteResult | "undone"): "saved" | "already" | "failed" | "undone" {
  if (r === "undone") return "undone";
  if (r.ok) {
    const j = r.json as { already_reviewed?: unknown } | null;
    return j && j.already_reviewed === true ? "already" : "saved";
  }
  return r.status === 404 ? "already" : "failed";
}

/** The proxy rejects empty answers with 400 (the queue would drop it), so Send needs real text. */
export function canSend(answer: string): boolean {
  return answer.trim().length > 0;
}

export type RowState = "idle" | "answering" | "pending" | "saved" | "already" | "failed";

export function rowState(
  prev: RowState,
  event: "open-answer" | "cancel" | "submit" | "undo" | "result",
  outcome?: ReturnType<typeof outcomeLine>,
  opts: { wasAnswer?: boolean } = {},
): RowState {
  // An undone answer goes back to the open textarea (text kept), not to the bare row.
  const back: RowState = opts.wasAnswer ? "answering" : "idle";
  switch (event) {
    case "open-answer": return prev === "idle" ? "answering" : prev;
    case "cancel": return prev === "answering" ? "idle" : prev;
    case "submit": return prev === "idle" || prev === "answering" || prev === "failed" ? "pending" : prev;
    case "undo": return prev === "pending" ? back : prev;
    case "result":
      if (prev !== "pending") return prev;
      if (outcome === "undone") return back;
      return outcome === "saved" || outcome === "already" ? outcome : "failed";
  }
}

/** The one line above the list. Empty at zero: the empty state says it instead. */
export function countLine(n: number): string {
  if (n <= 0) return "";
  return n === 1 ? "1 thing is waiting." : `${n} things are waiting.`;
}
