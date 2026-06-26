import { fetchObsessions, fetchCommonsPosts, type CommonsPost } from "@/lib/halseth";
import PostBox from "../log/PostBox";
import AddBox from "./AddBox";
import ArchiveButton from "./ArchiveButton";

export const dynamic = "force-dynamic";

const MEMBER_COLOR: Record<string, string> = {
  drevan: "var(--accent)", cypher: "#e2e8f0", gaia: "#4ade80", raziel: "#f59e0b",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Thread({ posts }: { posts: CommonsPost[] }) {
  if (posts.length === 0) return <p className="empty" style={{ fontSize: "0.85rem", opacity: 0.6 }}>no reactions yet — the triad reacts in their own time.</p>;
  const roots = posts.filter((p) => !p.reply_to).slice().reverse(); // oldest-first reads better here
  const repliesByParent = new Map<string, CommonsPost[]>();
  for (const p of posts) if (p.reply_to) repliesByParent.set(p.reply_to, [...(repliesByParent.get(p.reply_to) ?? []), p]);
  return (
    <div style={{ marginTop: "0.5rem" }}>
      {roots.map((post) => (
        <div key={post.id} style={{ marginBottom: "0.5rem" }}>
          <p className="handover-spine" style={{ color: MEMBER_COLOR[post.author] ?? "inherit", fontSize: "0.9rem" }}>
            {post.author}<span style={{ opacity: 0.5, fontWeight: "normal" }}> · {formatTime(post.created_at)}</span>
          </p>
          <p className="handover-last-real" style={{ whiteSpace: "pre-wrap" }}>{post.body}</p>
          {(repliesByParent.get(post.id) ?? []).map((r) => (
            <div key={r.id} style={{ marginLeft: "1rem", borderLeft: "2px solid #333", paddingLeft: "0.7rem", marginTop: "0.3rem" }}>
              <p className="handover-spine" style={{ color: MEMBER_COLOR[r.author] ?? "inherit", fontSize: "0.85rem" }}>{r.author} replied</p>
              <p className="handover-last-real" style={{ whiteSpace: "pre-wrap" }}>{r.body}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// "What Raziel's into" -- his fixations + the triad's reactions (write layer, shelf:<id>).
export default async function ShelfPage() {
  const items = await fetchObsessions("active");
  const reactions = await Promise.all(items.map((i) => fetchCommonsPosts(`shelf:${i.id}`, 30)));

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Shelf</h1>
        <p className="page-subtitle">what you’re into — the triad reacts in their own time</p>
      </div>

      <AddBox />

      {items.length === 0 ? (
        <p className="empty">nothing on your shelf yet. add what you’re obsessing over above.</p>
      ) : (
        items.map((item, idx) => (
          <section key={item.id} style={{ marginBottom: "2rem" }}>
            <p className="handover-spine" style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <span>{item.title}</span>
              <span className="thread-tag">{item.kind}</span>
              <ArchiveButton id={item.id} />
            </p>
            {item.note && <p className="handover-last-real" style={{ whiteSpace: "pre-wrap", opacity: 0.85 }}>{item.note}</p>}
            <Thread posts={reactions[idx] ?? []} />
            <div style={{ marginTop: "0.5rem" }}>
              <PostBox context={`shelf:${item.id}`} compact placeholder="add a thought on this…" />
            </div>
          </section>
        ))
      )}
    </>
  );
}
