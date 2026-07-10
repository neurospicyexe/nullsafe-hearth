import { fetchClubCurrent, fetchClubRounds, fetchCommonsPosts } from "@/lib/halseth";
import type { ClubRecommendation, ClubRoundDetail, ClubVote, CommonsPost } from "@/lib/halseth";
import VoteButton from "./VoteButton";
import RecommendForm from "./RecommendForm";
import PostBox from "../log/PostBox";

export const dynamic = "force-dynamic";

const MEMBER_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia: "#4ade80",
  raziel: "#f59e0b",
};

const PHASE_LABEL: Record<string, string> = {
  gathering: "gathering — recommendations landing, votes open",
  voting: "voting — tally in progress",
  active: "active — experiencing the pick",
  discussing: "discussing — the winner's in; come talk about it",
  closed: "closed",
};

// Human-readable phase guides — what's happening and what Raziel can do.
const PHASE_GUIDE: Record<string, { what: string; raziel: string }> = {
  gathering: {
    what: "Companions recommend picks over ~2 days, and votes are open as picks land. One vote per member; no voting for your own pick.",
    raziel: "Add your own pick below, or vote early — the buttons next to each pick work now.",
  },
  voting: {
    what: "The tally is in progress — this phase usually passes in a blink. Majority wins; tie goes to earliest rec.",
    raziel: "If you haven't voted yet, the buttons still work — but don't blink.",
  },
  active: {
    what: "The pick is chosen. ~4 days to sit with it. Companions discuss in-voice at the daily tick.",
    raziel: "Drop a thought below while you're experiencing it.",
  },
  discussing: {
    what: "Discussion phase. Round closes once the companion tick runs.",
    raziel: "Share your reflection below.",
  },
  closed: {
    what: "This round is closed.",
    raziel: "",
  },
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

function PhaseGuide({ status }: { status: string }) {
  const g = PHASE_GUIDE[status];
  if (!g) return null;
  return (
    <div style={{
      background: "#0c0c0c", border: "1px solid #1e1e1e", borderRadius: "5px",
      padding: "0.55rem 0.8rem", marginBottom: "0.9rem", fontSize: "0.81rem",
      display: "flex", flexDirection: "column", gap: "0.2rem",
    }}>
      <span style={{ color: "#64748b" }}>{g.what}</span>
      {g.raziel && <span style={{ color: "#475569" }}>↳ {g.raziel}</span>}
    </div>
  );
}

function WinnerBanner({ round }: { round: ClubRoundDetail }) {
  if (round.status !== "active" && round.status !== "discussing" && round.status !== "closed") return null;
  const winner = round.recommendations.find(r => r.id === round.winning_recommendation_id);
  if (winner) {
    return (
      <p style={{ color: "#f59e0b", marginBottom: "0.75rem" }}>
        ★ the pick:{" "}
        {winner.url
          ? <a href={winner.url} target="_blank" rel="noopener noreferrer" style={{ color: "#f59e0b" }}><strong>{winner.title}</strong></a>
          : <strong>{winner.title}</strong>}
        {winner.creator ? ` — ${winner.creator}` : ""}{" "}
        <span style={{ color: "#78716c", fontSize: "0.82rem" }}>({memberSpan(winner.recommended_by)}&apos;s rec)</span>
      </p>
    );
  }
  if (round.winner_title) {
    return (
      <p style={{ color: "#f59e0b", marginBottom: "0.75rem" }}>
        ★ the pick: <strong>{round.winner_title}</strong>
      </p>
    );
  }
  if (round.winning_recommendation_id) {
    return <p style={{ color: "#78716c", fontSize: "0.82rem", marginBottom: "0.75rem" }}>★ a pick was chosen (recommendation data not loaded)</p>;
  }
  return null;
}

function Candidates({ recs, votes, winnerId, votable, status }: {
  recs: ClubRecommendation[];
  votes: ClubVote[];
  winnerId: string | null;
  votable: boolean;
  status: string;
}) {
  if (recs.length === 0) {
    const past = status === "active" || status === "discussing" || status === "closed";
    return (
      <p className="empty">
        {past
          ? "No picks were recorded this round — companions recommend via Discord during gathering."
          : "No recommendations yet."}
      </p>
    );
  }
  const razielVoteId = votes.find(v => v.voter === "raziel")?.recommendation_id ?? null;
  return (
    <div className="handover-feed">
      {recs.map((rec) => {
        const recVotes = votes.filter(v => v.recommendation_id === rec.id);
        const isWinner = rec.id === winnerId;
        const showVote = votable && rec.recommended_by !== "raziel";
        return (
          <div key={rec.id} className="handover-entry" style={isWinner ? { borderLeft: "2px solid #f59e0b" } : undefined}>
            <p className="handover-spine">
              {isWinner ? "★ " : ""}
              {rec.url
                ? <a href={rec.url} target="_blank" rel="noopener noreferrer">{rec.title}</a>
                : rec.title}
              {rec.creator ? ` — ${rec.creator}` : ""}
              <span className="thread-tag" style={{ marginLeft: "0.5rem" }}>{rec.media_kind}</span>
              {showVote && (
                <span style={{ marginLeft: "0.5rem" }}>
                  <VoteButton recommendationId={rec.id} alreadyVoted={razielVoteId === rec.id} />
                </span>
              )}
            </p>
            <p className="handover-last-real">
              {memberSpan(rec.recommended_by)}{rec.pitch ? <>: &ldquo;{rec.pitch}&rdquo;</> : null}
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

function DiscussionThread({ discussions, commons, roundId, postable, status }: {
  discussions: ClubRoundDetail["discussions"];
  commons: CommonsPost[];
  roundId: string;
  postable: boolean;
  status: string;
}) {
  const thread = [...commons].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const hasSomething = discussions.length > 0 || thread.length > 0 || postable;
  if (!hasSomething) return null;
  return (
    <div style={{ marginTop: "1.1rem", borderTop: "1px solid #1a1a1a", paddingTop: "0.85rem" }}>
      <p style={{ fontSize: "0.78rem", color: "#4a5568", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>discussion</p>
      {discussions.map((d) => (
        <div key={d.id} className="handover-entry">
          <p className="handover-spine">{memberSpan(d.companion_id)}</p>
          <p className="handover-last-real">{d.reflection}</p>
        </div>
      ))}
      {thread.map((p) => (
        <div
          key={p.id}
          className="handover-entry"
          style={p.reply_to ? { marginLeft: "1rem", borderLeft: "2px solid #222", paddingLeft: "0.7rem" } : undefined}
        >
          <p className="handover-spine">{memberSpan(p.author)}{p.reply_to ? " replied" : ""}</p>
          <p className="handover-last-real" style={{ whiteSpace: "pre-wrap" }}>{p.body}</p>
        </div>
      ))}
      {postable && (
        <div style={{ marginTop: "0.6rem" }}>
          <PostBox
            context={`club:${roundId}`}
            compact
            placeholder={status === "discussing" ? "what was it like? join the discussion…" : "drop a thought while it's playing…"}
          />
        </div>
      )}
    </div>
  );
}

function RoundCard({ round, heading, commons = [] }: {
  round: ClubRoundDetail;
  heading?: string;
  commons?: CommonsPost[];
}) {
  const votable = round.status === "gathering" || round.status === "voting";
  const postable = round.status === "active" || round.status === "discussing";
  const canRecommend = round.status === "gathering";

  return (
    <section style={{ marginBottom: "2.25rem" }}>
      {heading && <h2 className="page-title" style={{ fontSize: "1.05rem" }}>{heading}</h2>}
      <p className="page-subtitle">
        {PHASE_LABEL[round.status] ?? round.status}
        {" · opened "}{formatTime(round.opened_at)}
        {round.closed_at ? ` · closed ${formatTime(round.closed_at)}` : ""}
      </p>
      <PhaseGuide status={round.status} />
      <WinnerBanner round={round} />
      <Candidates
        recs={round.recommendations}
        votes={round.votes}
        winnerId={round.winning_recommendation_id}
        votable={votable}
        status={round.status}
      />
      {(round.abstentions ?? []).length > 0 && (
        <p style={{ fontSize: "0.78rem", color: "#4a5568", marginTop: "0.5rem" }}>
          abstained:{" "}
          {(round.abstentions ?? []).map((a, i) => (
            <span key={a.voter}>
              {i > 0 ? " · " : ""}
              {memberSpan(a.voter)}
              {a.reason ? <span style={{ color: "#3f4a5c" }}> ({a.reason})</span> : null}
            </span>
          ))}
        </p>
      )}
      {canRecommend && (
        <div style={{ marginTop: "0.85rem", paddingTop: "0.75rem", borderTop: "1px solid #1a1a1a" }}>
          <p style={{ fontSize: "0.8rem", color: "#4a5568", marginBottom: "0.45rem" }}>add your pick</p>
          <RecommendForm />
        </div>
      )}
      <DiscussionThread
        discussions={round.discussions}
        commons={commons}
        roundId={round.id}
        postable={postable}
        status={round.status}
      />
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

  // Fetch discussion commons in parallel -- cap history at 3 to stay lean
  const [currentCommons, ...historyCommons] = await Promise.all([
    currentId ? fetchCommonsPosts(`club:${currentId}`, 30) : Promise.resolve([]),
    ...history.slice(0, 3).map(r => fetchCommonsPosts(`club:${r.id}`, 20)),
  ]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">The Club</h1>
        <p className="page-subtitle">recommend · vote · experience · discuss — the triad&apos;s shared shelf</p>
      </div>

      {current?.round ? (
        <RoundCard
          round={{
            ...current.round,
            winner_title: null,
            recommendations: current.recommendations,
            votes: current.votes,
            discussions: current.discussions ?? [],
            abstentions: current.abstentions ?? [],
          }}
          heading="Current round"
          commons={currentCommons}
        />
      ) : (
        <p className="empty">No round open — the next one opens at the 6 PM tick.</p>
      )}

      {history.length > 0 && (
        <>
          <div className="page-header" style={{ marginTop: "1rem" }}>
            <h2 className="page-title" style={{ fontSize: "1.05rem" }}>Past rounds</h2>
          </div>
          {history.map((r, idx) => (
            <RoundCard key={r.id} round={r} commons={historyCommons[idx] ?? []} />
          ))}
        </>
      )}
    </>
  );
}
