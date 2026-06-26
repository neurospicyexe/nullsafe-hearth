import { fetchCommonsPosts, type CommonsPost } from "@/lib/halseth";
import PostBox from "./PostBox";

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

// The global log: Raziel's async wall. Roots newest-first; any companion reply renders
// nested under the exact post it answers (reply_to), so a low-spoon glance shows
// "my note -> their reply" with no guessing about what they're responding to.
export default async function LogPage() {
  const posts = await fetchCommonsPosts("global", 100);

  const roots = posts.filter((p) => !p.reply_to);
  const repliesByParent = new Map<string, CommonsPost[]>();
  for (const p of posts) {
    if (p.reply_to) {
      const arr = repliesByParent.get(p.reply_to) ?? [];
      arr.push(p);
      repliesByParent.set(p.reply_to, arr);
    }
  }
  for (const arr of repliesByParent.values()) {
    arr.sort((a, b) => a.created_at.localeCompare(b.created_at)); // oldest reply first
  }

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
            const replies = repliesByParent.get(post.id) ?? [];
            return (
              <div key={post.id} className="handover-entry">
                <p className="handover-spine" style={{ color: MEMBER_COLOR[post.author] ?? "inherit" }}>
                  {post.author}
                  <span style={{ opacity: 0.5, fontWeight: "normal" }}> · {formatTime(post.created_at)}</span>
                </p>
                <p className="handover-last-real" style={{ whiteSpace: "pre-wrap" }}>{post.body}</p>
                {replies.length > 0 && (
                  <div style={{ marginTop: "0.6rem", marginLeft: "1rem", borderLeft: "2px solid #333", paddingLeft: "0.8rem" }}>
                    {replies.map((r) => (
                      <div key={r.id} style={{ marginBottom: "0.5rem" }}>
                        <p className="handover-spine" style={{ color: MEMBER_COLOR[r.author] ?? "inherit", fontSize: "0.9rem" }}>
                          {r.author} replied
                          <span style={{ opacity: 0.5, fontWeight: "normal" }}> · {formatTime(r.created_at)}</span>
                        </p>
                        <p className="handover-last-real" style={{ whiteSpace: "pre-wrap" }}>{r.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
