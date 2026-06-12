import { fetchClubCurrent, fetchClubRounds } from "@/lib/halseth";
import type { ClubRecommendation, ClubRoundDetail, ClubVote } from "@/lib/halseth";
import VoteButton from "./VoteButton";

export const dynamic = "force-dynamic";

// Companion colors per repo convention (companions/[id]/sections.tsx).
const MEMBER_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia: "#4ade80",
  raziel: "#f59e0b",
};

const PHASE_LABEL: Record<string, string> = {
  gathering: "gathering — recommendations open",
  voting: "voting — preferences landing",
  active: "active — experiencing the pick",
  closed: "closed",
};

function formatTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function memberSpan(name: string) {
  return <span style={{ color: MEMBER_COLOR[name] ?? "inherit" }}>{name}</span>;
}

function Candidates({ recs, votes, winnerId, votable = false }: {
  recs: ClubRecommendation[]; votes: ClubVote[]; winnerId: string | null; votable?: boolean;
}) {
  if (recs.length === 0) return <p className="empty">No recommendations yet.</p>;
  // One vote per voter per round (re-vote replaces) -- show where Raziel's vote sits.
  const razielVoteRecId = votes.find(v => v.voter === "raziel")?.recommendation_id ?? null;
  return (
    <div className="handover-feed">
      {recs.map((rec) => {
        const recVotes = votes.filter(v => v.recommendation_id === rec.id);
        const isWinner = rec.id === winnerId;
        // No-self-vote applies to Raziel too -- hide the button on Raziel's own pick.
        const showVote = votable && rec.recommended_by !== "raziel";
        return (
          <div key={rec.id} className="handover-entry" style={isWinner ? { borderLeft: "2px solid #f59e0b" } : undefined}>
            <p className="handover-spine">
              {isWinner ? "★ " : ""}
              {rec.url ? <a href={rec.url} target="_blank" rel="noopener noreferrer">{rec.title}</a> : rec.title}
              {rec.creator ? ` — ${rec.creator}` : ""}
              <span className="thread-tag" style={{ marginLeft: "0.5rem" }}>{rec.media_kind}</span>
              {showVote && (
                <span style={{ marginLeft: "0.5rem" }}>
                  <VoteButton recommendationId={rec.id} alreadyVoted={razielVoteRecId === rec.id} />
                </span>
              )}
            </p>
            <p className="handover-last-real">
              {memberSpan(rec.recommended_by)}{rec.pitch ? <>: “{rec.pitch}”</> : null}
            </p>
            {recVotes.length > 0 && (
              <div className="handover-threads">
                {recVotes.map((v) => (
                  <span key={v.voter} className="thread-tag">
                    {memberSpan(v.voter)}{v.reason ? <> — {v.reason}</> : null}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RoundCard({ round, heading }: { round: ClubRoundDetail; heading?: string }) {
  const votable = round.status === "gathering" || round.status === "voting";
  return (
    <section style={{ marginBottom: "2rem" }}>
      {heading && <h2 className="page-title" style={{ fontSize: "1.1rem" }}>{heading}</h2>}
      <p className="page-subtitle">
        {PHASE_LABEL[round.status] ?? round.status} · opened {formatTime(round.opened_at)}
        {round.closed_at ? ` · closed ${formatTime(round.closed_at)}` : ""}
      </p>
      <Candidates recs={round.recommendations} votes={round.votes} winnerId={round.winning_recommendation_id} votable={votable} />
      {round.discussions.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          {round.discussions.map((d) => (
            <div key={d.id} className="handover-entry">
              <p className="handover-spine">{memberSpan(d.companion_id)}</p>
              <p className="handover-last-real">{d.reflection}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function ClubPage() {
  const [current, rounds] = await Promise.all([
    fetchClubCurrent(),
    fetchClubRounds(10),
  ]);

  const currentId = current?.round?.id ?? null;
  const history = rounds.filter(r => r.id !== currentId);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">The Club</h1>
        <p className="page-subtitle">recommend · vote · experience · discuss — the triad’s shared shelf</p>
      </div>

      {current?.round ? (
        <RoundCard
          round={{
            ...current.round,
            winner_title: null,
            recommendations: current.recommendations,
            votes: current.votes,
            discussions: current.discussions ?? [],
          }}
          heading="Current round"
        />
      ) : (
        <p className="empty">No round open — the next one opens at the 6 PM tick.</p>
      )}

      {history.length > 0 && (
        <>
          <div className="page-header" style={{ marginTop: "1rem" }}>
            <h2 className="page-title" style={{ fontSize: "1.1rem" }}>Past rounds</h2>
          </div>
          {history.map((r) => <RoundCard key={r.id} round={r} />)}
        </>
      )}
    </>
  );
}
