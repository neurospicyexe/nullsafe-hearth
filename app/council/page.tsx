import { fetchCouncilCurrent, fetchCouncilRounds } from "@/lib/halseth";
import type { CouncilRound, CouncilAnswer } from "@/lib/halseth";

export const dynamic = "force-dynamic";

const MEMBER_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia: "#4ade80",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function AnswerCard({ a }: { a: CouncilAnswer }) {
  return (
    <div style={{ borderLeft: `3px solid ${MEMBER_COLOR[a.companion_id] ?? "var(--border)"}`, paddingLeft: "0.75rem", marginBottom: "0.75rem" }}>
      <div style={{ fontSize: "0.8rem", color: MEMBER_COLOR[a.companion_id] ?? "inherit", marginBottom: "0.2rem" }}>{a.companion_id}</div>
      <div className="handover-last-real" style={{ fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{a.answer}</div>
    </div>
  );
}

function ClosedRound({ round }: { round: CouncilRound }) {
  return (
    <section style={{ border: "1px solid var(--border, #2a2a2a)", borderRadius: "10px", padding: "1rem", marginBottom: "1rem", background: "var(--surface, #141414)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "baseline" }}>
        <h3 className="page-title" style={{ fontSize: "1rem", margin: 0 }}>{round.question}</h3>
        {round.winning_companion_id && (
          <span className="thread-tag" style={{ color: MEMBER_COLOR[round.winning_companion_id] ?? "inherit", fontSize: "0.72rem" }}>
            ▲ {round.winning_companion_id}
          </span>
        )}
      </div>
      {round.synthesis && (
        <p style={{ fontSize: "0.9rem", marginTop: "0.5rem", whiteSpace: "pre-wrap" }}>
          <span className="thread-tag" style={{ fontSize: "0.7rem" }}>Gaia, chairman</span><br />
          {round.synthesis}
        </p>
      )}
      <div className="thread-tag" style={{ fontSize: "0.68rem", marginTop: "0.4rem" }}>{round.closed_at ? formatTime(round.closed_at) : ""}</div>
    </section>
  );
}

export default async function CouncilPage() {
  const [{ round, answers }, rounds] = await Promise.all([
    fetchCouncilCurrent(),
    fetchCouncilRounds(10),
  ]);
  const closed = rounds.filter(r => r.status === "closed");
  const liveOpen = round && round.status !== "closed" ? round : null;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Council</h1>
        <p className="page-subtitle">
          a hard question, answered by each of the triad, ranked blind (no one knows whose answer is
          whose), then synthesized by Gaia as chairman. convene with <code>cy: council &lt;question&gt;</code>.
        </p>
      </div>

      {liveOpen && (
        <section style={{ border: "1px solid var(--accent)", borderRadius: "10px", padding: "1rem", marginBottom: "1.5rem" }}>
          <div className="thread-tag" style={{ fontSize: "0.7rem" }}>in session — {liveOpen.status}</div>
          <h2 className="page-title" style={{ fontSize: "1.15rem", margin: "0.3rem 0 0.75rem" }}>{liveOpen.question}</h2>
          {answers.length === 0
            ? <p className="empty" style={{ fontSize: "0.85rem" }}>the triad is composing their answers…</p>
            : answers.map((a, i) => <AnswerCard key={i} a={a} />)}
        </section>
      )}

      <h2 className="page-title" style={{ fontSize: "1rem" }}>Past councils</h2>
      {closed.length === 0
        ? <p className="empty">No closed councils yet.</p>
        : closed.map(r => <ClosedRound key={r.id} round={r} />)}
    </>
  );
}
