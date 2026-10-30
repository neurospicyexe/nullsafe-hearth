"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { shellHidden } from "@/lib/shell";
import { SPOON_VALUES, confirmLine, lastLoggedLabel } from "@/lib/spoons";
import { useWriteQueue } from "./WriteQueueProvider";

type Latest = { spoons: number | null; recorded_at: string };
type Phase = "idle" | "logged" | "failed" | "removed";
type Extra = { mood?: string; energy?: number };

const ENERGY_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function idFrom(json: unknown): string | null {
  const id = (json as { id?: unknown } | null)?.id;
  return typeof id === "string" || typeof id === "number" ? String(id) : null;
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
  const [wordSaved, setWordSaved] = useState(false);

  // Check-in lifecycle lives in refs so async results never read stale state.
  const pendingRef = useRef<ReturnType<typeof queue.submit> | null>(null);
  const idRef = useRef<string | null>(null); // set once the POST has landed
  const tokenRef = useRef(0); // identifies the newest check-in; older results are ignored

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

  const post = useCallback(
    (spoons: number, extra: Extra) => {
      const token = ++tokenRef.current;
      const p = queue.submit({
        key: "spoons",
        url: "/api/biometrics",
        method: "POST",
        body: { spoons, source: "hearth-quick", ...extra },
      });
      pendingRef.current = p;
      void p.done.then((r) => {
        if (r === "undone" || token !== tokenRef.current) return;
        if (r.ok) {
          idRef.current = idFrom(r.json);
          setPhase("logged");
        } else {
          setPhase("failed"); // the queue keeps the write and retries it
        }
      });
    },
    [queue],
  );

  function tap(n: number) {
    if (idRef.current !== null) {
      // The previous check-in already landed: this one is a new log.
      idRef.current = null;
      setMood("");
      setEnergy(null);
      setWordOpen(false);
      setWordSaved(false);
      post(n, {});
    } else {
      // Still in grace (or first tap): resubmitting the same key replaces the pending POST.
      post(n, wordBody(mood, energy));
    }
    setPicked(n);
    setPhase("logged");
  }

  function deleteRow(id: string) {
    queue.submit({ key: "spoons-undo", url: `/api/biometrics/${encodeURIComponent(id)}`, method: "DELETE" });
  }

  function undo() {
    const id = idRef.current;
    const p = pendingRef.current;
    tokenRef.current++; // ignore the POST's own result from here on
    setPicked(null);
    setPhase("removed");
    setWordOpen(false);
    setWordSaved(false);
    setMood("");
    setEnergy(null);
    window.setTimeout(() => setPhase((ph) => (ph === "removed" ? "idle" : ph)), 2000);
    pendingRef.current = null;
    if (id !== null) {
      idRef.current = null;
      deleteRow(id);
      return;
    }
    if (!p) return;
    p.undo(); // before send: nothing was ever written
    // If the POST was already in flight, undo() is a no-op: delete the row once it lands.
    void p.done.then((r) => {
      if (r === "undone") return;
      const landed = r.ok ? idFrom(r.json) : null;
      if (landed !== null) deleteRow(landed);
    });
  }

  function saveWord() {
    const extra = wordBody(mood, energy);
    if (picked === null || Object.keys(extra).length === 0) return;
    if (idRef.current !== null) {
      queue.submit({
        key: "spoons-word",
        url: `/api/biometrics/${encodeURIComponent(idRef.current)}`,
        method: "PATCH",
        body: extra,
      });
    } else {
      post(picked, extra); // still in grace: one request carries everything
    }
    setWordSaved(true);
    setWordOpen(false);
  }

  if (hidden) return null;

  const showLast = picked === null && phase !== "removed";
  return (
    <section className="h-spoons" aria-label="Spoons check-in">
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
      {phase === "failed" && picked !== null ? (
        <div className="h-spoons-line" role="status">
          <span className="h-spoons-msg is-warn">Didn&apos;t save. Retrying when you&apos;re back online.</span>
        </div>
      ) : picked !== null ? (
        <div className="h-spoons-line" role="status">
          <span className="h-spoons-msg">{wordSaved ? `${confirmLine(picked)} Word saved.` : confirmLine(picked)}</span>
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
