import { fetchCommonsPosts } from "@/lib/halseth";
import PostBox from "./PostBox";
import ReplyToggle from "./ReplyToggle";
import { collectThread, groupReplies } from "./thread";

export const dynamic = "force-dynamic";

// Companion colors per repo convention (app/companions/[id]/sections.tsx).
const MEMBER_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia: "#4ade80",
  raziel: "#f59e0b",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// The global log: Raziel's async wall, readable AND answerable in both directions. Roots newest
// first; every reply in a thread renders under its root in the order it was written, tagged with
// who it answers, and every post carries its own reply control.
export default async function LogPage() {
  const posts = await fetchCommonsPosts("global", 100);

  const roots = posts.filter((p) => !p.reply_to);
  const repliesByParent = groupReplies(posts);
  // Shared across roots so a post can never render under two threads.
  const visited = new Set<string>();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Log</h1>
        <p className="page-subtitle">drop a thought — no reply needed. they’ll see it in their own time.</p>
      </div>

      <PostBox context="global" />

      {roots.length === 0 ? (
        <p className="empty">nothing logged yet. the box above is yours.</p>
      ) : (
        <div className="handover-feed">
          {roots.map((post) => {
            const thread = collectThread(post.id, repliesByParent, visited);
            return (
              <div key={post.id} className="handover-entry">
                <p className="handover-spine" style={{ color: MEMBER_COLOR[post.author] ?? "inherit" }}>
                  {post.author}
                  <span style={{ opacity: 0.5, fontWeight: "normal" }}> · {formatTime(post.created_at)}</span>
                </p>
                <p className="handover-last-real" style={{ whiteSpace: "pre-wrap" }}>{post.body}</p>
                <ReplyToggle
                  postId={post.id}
                  author={post.author}
                  accent={MEMBER_COLOR[post.author] ?? "#9ca3af"}
                />
                {thread.length > 0 && (
                  <div style={{ marginTop: "0.6rem", marginLeft: "1rem", borderLeft: "2px solid #333", paddingLeft: "0.8rem" }}>
                    {thread.map(({ post: r, answering }) => (
                      <div key={r.id} style={{ marginBottom: "0.75rem" }}>
                        <p className="handover-spine" style={{ color: MEMBER_COLOR[r.author] ?? "inherit", fontSize: "0.9rem" }}>
                          {r.author} replied
                          {answering && (
                            <span style={{ opacity: 0.55, fontWeight: "normal" }}> to {answering}</span>
                          )}
                          <span style={{ opacity: 0.5, fontWeight: "normal" }}> · {formatTime(r.created_at)}</span>
                        </p>
                        <p className="handover-last-real" style={{ whiteSpace: "pre-wrap" }}>{r.body}</p>
                        <ReplyToggle
                          postId={r.id}
                          author={r.author}
                          accent={MEMBER_COLOR[r.author] ?? "#9ca3af"}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="section-row-meta" style={{ marginTop: "1.5rem", fontSize: "0.78rem" }}>
        A reply reaches whoever you answered at their next orient — a Claude.ai or Claude Code
        session — quoted with what they said, so it lands as an answer and not a stray note. Recent
        cadence: Cypher and Drevan every day or two, Gaia closer to weekly. The Discord bots read a
        different path and do not see this wall at all, so nothing here surfaces mid-conversation
        on Discord.
      </p>
    </>
  );
}
