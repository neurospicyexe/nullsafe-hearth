"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { shellHidden } from "@/lib/shell";
import { SPOON_VALUES, confirmLine, lastLoggedLabel } from "@/lib/spoons";
import { createCheckin, type Extra, type WordState } from "@/lib/checkin";
import { unsavedCount, unsavedLine } from "@/lib/write-queue";
import { useWriteQueue } from "./WriteQueueProvider";

type Latest = { spoons: number | null; recorded_at: string };
type Phase = "idle" | "logged" | "failed" | "dropped" | "removed";

const ENERGY_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Row id generated at tap time; Halseth takes 8..64 chars of [A-Za-z0-9_-]. */
function newRowId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `hq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** The word's line is only "saved" once its write answered ok. */
function wordLine(base: string, w: WordState | null): string {
  if (w === "saving") return `${base} Saving word…`;
  if (w === "saved") return `${base} Word saved.`;
  if (w === "failed") return "Word didn’t save. I’ll retry next time Hearth opens.";
  if (w === "dropped") return "Word didn’t save.";
  return base;
}

function wordBody(mood: string, energy: number | null): Extra {
  const extra: Extra = {};
  if (mood.trim() !== "") extra.mood = mood.trim();
  if (energy !== null) extra.energy = energy;
  return extra;
}

export default function SpoonsStrip() {
  const pathname = usePathname() ?? "/";
  const queue = useWriteQueue();
  const [latest, setLatest] = useState<Latest | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [wordOpen, setWordOpen] = useState(false);
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [wordState, setWordState] = useState<WordState | null>(null);
  const [failedKeys, setFailedKeys] = useState<string[]>([]);

  // Which write goes where (tap / undo / word, by row id) lives in lib/checkin.ts.
  const [checkin] = useState(() =>
    createCheckin(
      queue,
      { newId: newRowId, now: () => new Date() },
      (o) => setPhase(o === "landed" ? "logged" : o),
      setWordState,
    ),
  );

  // Writes kept for retry (offline, server down), refreshed on every queue change: sends, restore,
  // discard. Subscribed here, before the provider's restore effect runs (child effects run first).
  useEffect(() => {
    const read = () => setFailedKeys(queue.failed().map((w) => w.key));
    read();
    return queue.subscribe(read);
  }, [queue]);
  // Said once: what this strip already shows as failed is left out of the app-wide line.
  const notice = unsavedLine(unsavedCount(failedKeys, checkin.owned()));

  const hidden = shellHidden(pathname);

  useEffect(() => {
    if (hidden) return;
    let live = true;
    fetch("/api/biometrics")
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: unknown) => {
        if (!live || !Array.isArray(rows)) return;
        const row = (rows as Latest[]).find((x) => typeof x?.spoons === "number");
        if (row) setLatest({ spoons: row.spoons, recorded_at: row.recorded_at });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [hidden]);

  function tap(n: number) {
    if (checkin.tap(n) === "new") {
      // A new row: any word belonged to the previous check-in.
      setMood("");
      setEnergy(null);
      setWordOpen(false);
      setWordState(null);
    }
    setPicked(n);
    setPhase("logged");
  }

  function undo() {
    checkin.undo();
    setPicked(null);
    setPhase("removed");
    setWordOpen(false);
    setWordState(null);
    setMood("");
    setEnergy(null);
    window.setTimeout(() => setPhase((ph) => (ph === "removed" ? "idle" : ph)), 2000);
  }

  function saveWord() {
    if (picked === null) return;
    if (!checkin.saveWord(wordBody(mood, energy))) return;
    setWordOpen(false);
  }

  if (hidden) return null;

  const showLast = picked === null && phase !== "removed";
  return (
    <section className="h-spoons" aria-label="Spoons check-in">
      {notice && (
        <p className="h-spoons-unsaved" role="status">
          {notice}
        </p>
      )}
      <div className="h-spoons-head">
        <span className="h-spoons-title">Spoons right now</span>
        {showLast && <span className="h-spoons-last">{lastLoggedLabel(latest, new Date())}</span>}
      </div>
      <div className="h-spoons-row">
        {SPOON_VALUES.map((n) => (
          <button
            key={n}
            type="button"
            className="h-spoons-chip"
            aria-pressed={picked === n}
            aria-label={`${n} spoons`}
            onClick={() => tap(n)}
          >
            {n}
          </button>
        ))}
      </div>
      {(phase === "failed" || phase === "dropped") && picked !== null ? (
        <div className="h-spoons-line" role="status">
          <span className="h-spoons-msg is-warn">
            {phase === "failed" ? "Didn’t save. I’ll retry next time Hearth opens." : "Didn’t save."}
          </span>
          <span className="h-spoons-actions">
            <button type="button" className="h-spoons-btn" onClick={undo}>
              undo
            </button>
          </span>
        </div>
      ) : picked !== null ? (
        <div className="h-spoons-line" role="status">
          <span className={wordState === "failed" || wordState === "dropped" ? "h-spoons-msg is-warn" : "h-spoons-msg"}>
            {wordLine(confirmLine(picked), wordState)}
          </span>
          <span className="h-spoons-actions">
            {!wordOpen && (
              <button type="button" className="h-spoons-btn is-lamp" onClick={() => setWordOpen(true)}>
                add a word
              </button>
            )}
            <button type="button" className="h-spoons-btn" onClick={undo}>
              undo
            </button>
          </span>
        </div>
      ) : (
        <div className="h-spoons-line" role="status">
          <span className="h-spoons-hint">{phase === "removed" ? "Removed." : "one tap logs it. nothing else needed."}</span>
        </div>
      )}
      {picked !== null && wordOpen && (
        <div className="h-spoons-word">
          <input
            className="h-spoons-input"
            type="text"
            value={mood}
            maxLength={80}
            placeholder="a word for how it is"
            aria-label="A word for how it is"
            onChange={(e) => setMood(e.target.value)}
          />
          <div className="h-spoons-row" style={{ padding: 0 }} role="group" aria-label="Energy 0 to 10">
            {ENERGY_VALUES.map((n) => (
              <button
                key={n}
                type="button"
                className="h-spoons-chip"
                aria-pressed={energy === n}
                aria-label={`energy ${n}`}
                onClick={() => setEnergy(energy === n ? null : n)}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="h-spoons-actions">
            <button type="button" className="h-spoons-btn is-lamp" onClick={saveWord}>
              save
            </button>
            <button type="button" className="h-spoons-btn" onClick={() => setWordOpen(false)}>
              cancel
            </button>
          </span>
        </div>
      )}
    </section>
  );
}
