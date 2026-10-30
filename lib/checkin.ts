// One-tap spoons check-in: which write goes to the queue for a tap, an undo or a word.
// Pure: no React, no window. The component is wiring; every decision lives here.
//
// The row id is generated HERE at tap time and sent with the POST (Halseth stores it and treats a
// repeat POST of the same id as a no-op), so the id is known before any answer comes back:
// undo = DELETE that id, a word = PATCH that id. A DELETE or PATCH must still wait for its POST to
// land, because Halseth answers 404 for an id it has not inserted yet and the queue drops 404s.
import type { Pending, QueuedWrite } from "./write-queue";

export type CheckinQueue = { submit(w: QueuedWrite): Pending; discard(key: string): void };
export type Extra = { mood?: string; energy?: number };
/** landed: saved. failed: kept, retried next time Hearth opens. dropped: refused, nothing will retry it. */
export type Outcome = "landed" | "failed" | "dropped";
/** The word's own save state: shown as "Saving word…" until its write answers. */
export type WordState = "saving" | "saved" | "failed" | "dropped";

export const POST_KEY = "spoons";
export const undoKey = (id: string) => `spoons-undo-${id}`;
export const wordKey = (id: string) => `spoons-word-${id}`;
const rowUrl = (id: string) => `/api/biometrics/${encodeURIComponent(id)}`;

type Current = {
  id: string;
  spoons: number;
  recordedAt: string;
  extra: Extra;
  pending: Pending;
  outcome: "pending" | "landed" | "failed";
  /** "riding": the word travels in the POST; "patch": in its own PATCH (wordKey). */
  word: { state: WordState; via: "riding" | "patch" } | null;
};

export function createCheckin(
  queue: CheckinQueue,
  deps: { newId(): string; now(): Date },
  onOutcome: (o: Outcome) => void,
  onWord: (w: WordState) => void = () => {},
) {
  let cur: Current | null = null;

  function setWord(c: Current, state: WordState, via: "riding" | "patch"): void {
    c.word = { state, via };
    if (cur === c) onWord(state);
  }

  function patchWord(c: Current, extra: Extra): void {
    setWord(c, "saving", "patch");
    const p = queue.submit({ key: wordKey(c.id), url: rowUrl(c.id), method: "PATCH", body: extra });
    void p.done.then((r) => {
      if (r === "undone" || c.word?.via !== "patch") return;
      setWord(c, r.ok ? "saved" : r.dropped ? "dropped" : "failed", "patch");
    });
  }

  function submitPost(c: Current): void {
    const p = queue.submit({
      key: POST_KEY,
      url: "/api/biometrics",
      method: "POST",
      body: { id: c.id, spoons: c.spoons, recorded_at: c.recordedAt, source: "hearth-quick", ...c.extra },
    });
    c.pending = p;
    c.outcome = "pending";
    void p.done.then((r) => {
      if (r === "undone" || c.pending !== p) return; // replaced by a newer intent for this same row
      c.outcome = r.ok ? "landed" : "failed";
      const o: Outcome = r.ok ? "landed" : r.dropped ? "dropped" : "failed";
      if (cur === c) onOutcome(o);
      if (c.word?.via === "riding" && c.word.state === "saving") setWord(c, o === "landed" ? "saved" : o, "riding");
    });
  }

  function deleteRow(id: string): void {
    queue.submit({ key: undoKey(id), url: rowUrl(id), method: "DELETE" });
  }

  /** Walk away from a check-in (undone, or superseded before it landed) leaving no row behind. */
  function retire(c: Current): void {
    if (c.outcome === "landed") {
      queue.discard(wordKey(c.id));
      deleteRow(c.id);
    } else if (c.outcome === "failed") {
      // Forget the stored retry, and DELETE by the client id in case the POST was saved but its answer
      // was lost (a 404 for a row that never landed is dropped by the queue as non-retryable).
      queue.discard(POST_KEY);
      deleteRow(c.id);
    } else if (c.pending.waiting()) {
      c.pending.undo(); // still in grace: nothing was ever sent
    } else {
      // In flight: only a POST that lands leaves a row to delete.
      void c.pending.done.then((r) => {
        if (r !== "undone" && r.ok) deleteRow(c.id);
      });
    }
  }

  return {
    /** "same": the answer changed inside the grace window (same row). "new": a new row was started. */
    tap(spoons: number): "same" | "new" {
      const c0 = cur;
      if (c0 && c0.outcome === "pending" && c0.pending.waiting()) {
        // Same check-in, changed answer: the resubmit replaces the waiting POST (same id).
        c0.spoons = spoons;
        c0.recordedAt = deps.now().toISOString();
        submitPost(c0);
        return "same";
      }
      // A landed check-in stays (a new tap is a new log). One that has not landed is superseded.
      if (c0 && c0.outcome !== "landed") retire(c0);
      const c: Current = {
        id: deps.newId(),
        spoons,
        recordedAt: deps.now().toISOString(),
        extra: {},
        pending: null as unknown as Pending, // set by submitPost
        outcome: "pending",
        word: null,
      };
      cur = c;
      submitPost(c);
      return "new";
    },

    /** Add a word / energy to the current check-in. False when there is nothing to attach it to. */
    saveWord(extra: Extra): boolean {
      const c = cur;
      if (!c || Object.keys(extra).length === 0) return false;
      Object.assign(c.extra, extra);
      if (c.outcome === "landed") {
        patchWord(c, extra);
      } else if (c.outcome === "failed" || c.pending.waiting()) {
        setWord(c, "saving", "riding");
        submitPost(c); // one request carries everything; for a failed one the stored retry now does
      } else {
        // In flight: PATCH once it lands; if it fails, the retry POST carries the word.
        setWord(c, "saving", "patch");
        const p = c.pending;
        void p.done.then((r) => {
          if (r === "undone" || cur !== c || c.pending !== p) return;
          if (r.ok) patchWord(c, extra);
          else {
            setWord(c, "saving", "riding");
            submitPost(c);
          }
        });
      }
      return true;
    },

    /** Queue keys whose failure the strip is showing right now (the app-wide line leaves those out). */
    owned(): string[] {
      const c = cur;
      if (!c) return [];
      const keys: string[] = [];
      if (c.outcome === "failed") keys.push(POST_KEY);
      if (c.word?.via === "patch" && c.word.state === "failed") keys.push(wordKey(c.id));
      return keys;
    },

    undo(): void {
      const c = cur;
      if (!c) return;
      cur = null;
      retire(c);
    },
  };
}
