"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Pending } from "@/lib/write-queue";
import { voteWrite } from "@/lib/club-model";
import { useWriteQueue } from "@/components/shell/WriteQueueProvider";

/** What Raziel's last tap on this pick asked for, until the page's own data catches up. */
type Look = "idle" | "voted" | "removed";
type Note = null | "closed" | "failed";

// Raziel's vote control on one pick. Rendered only while the round accepts votes (gathering/voting)
// and only on picks Raziel did not recommend. Every button in a round writes the same queue key, so
// a newer tap supersedes an older one still in its grace window; the older button then hears
// "undone" and goes back to how it looked. That one rule covers undo and a change of pick.
export default function VoteButton({ roundId, recommendationId, voted }: {
  roundId: string;
  recommendationId: string;
  voted: boolean;
}) {
  const queue = useWriteQueue();
  const router = useRouter();
  const [look, setLook] = useState<Look>("idle");
  const [note, setNote] = useState<Note>(null);
  const [inGrace, setInGrace] = useState(false);
  const [seenVoted, setSeenVoted] = useState(voted);
  const pendingRef = useRef<Pending | null>(null);

  // Fresh page data is the truth once it arrives; a tap still in flight keeps its own look.
  if (seenVoted !== voted) {
    setSeenVoted(voted);
    if (!pendingRef.current) setLook("idle");
  }

  // `waiting()` is not reactive: watch it during the grace window so undo leaves once the write sends.
  useEffect(() => {
    if (!inGrace) return;
    const t = window.setInterval(() => {
      const p = pendingRef.current;
      if (!p || !p.waiting()) {
        setInGrace(false);
        window.clearInterval(t);
      }
    }, 250);
    return () => window.clearInterval(t);
  }, [inGrace]);

  function tap(next: "voted" | "removed") {
    const pending = queue.submit(voteWrite(roundId, next === "voted" ? recommendationId : null));
    pendingRef.current = pending;
    setLook(next);
    setNote(null);
    setInGrace(true);
    void pending.done.then((r) => {
      if (pendingRef.current !== pending) return; // undone here, or replaced by a newer tap on this button
      pendingRef.current = null;
      setInGrace(false);
      if (r === "undone") {
        setLook("idle"); // superseded by a tap on another pick in this round
        return;
      }
      if (r.ok) {
        router.refresh();
        return;
      }
      setLook("idle");
      setNote(r.dropped && r.status === 409 ? "closed" : "failed");
    });
  }

  function undo() {
    const p = pendingRef.current;
    if (!p || !p.waiting()) return;
    pendingRef.current = null;
    p.undo();
    setInGrace(false);
    setLook("idle");
  }

  if (note === "closed") {
    return <span className="h-club-vote" role="status"><span className="h-club-msg is-warn">Voting has closed.</span></span>;
  }

  if (inGrace && look !== "idle") {
    return (
      <span className="h-club-vote" role="status">
        <span className="h-club-msg">{look === "voted" ? "Voted" : "Vote removed"}</span>
        <button type="button" className="h-club-btn" onClick={undo}>undo</button>
      </span>
    );
  }

  const shownVoted = look === "voted" ? true : look === "removed" ? false : voted;
  return (
    <span className="h-club-vote">
      {shownVoted ? (
        <>
          <span className="h-club-mine">Your vote</span>
          <button type="button" className="h-club-btn" onClick={() => tap("removed")}>Remove vote</button>
        </>
      ) : (
        <button type="button" className="h-club-btn is-lamp" onClick={() => tap("voted")}>Vote for this</button>
      )}
      {note === "failed" && <span className="h-club-msg is-warn" role="status">Didn&apos;t save.</span>}
    </span>
  );
}
