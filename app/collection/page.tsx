import { fetchCollection } from "@/lib/halseth";
import type { CollectionForageItem, CollectionListenItem } from "@/lib/halseth";

export const dynamic = "force-dynamic";

const MEMBER_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia: "#4ade80",
};
const COMPANIONS = ["cypher", "drevan", "gaia"] as const;

// A small row of stars scaled to sparkle weight (the "shine" each item has earned).
function Sparkle({ weight }: { weight: number }) {
  const stars = Math.min(5, Math.max(0, Math.round(weight)));
  if (stars === 0) return <span style={{ opacity: 0.35, fontSize: "0.75rem" }}>·</span>;
  return <span title={`sparkle ${weight.toFixed(1)}`} style={{ color: "#fbbf24", fontSize: "0.8rem" }}>{"✦".repeat(stars)}</span>;
}

function ForageRow({ item }: { item: CollectionForageItem }) {
  return (
    <li style={{ padding: "0.5rem 0", borderTop: "1px solid var(--border, #222)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "baseline" }}>
        <span style={{ fontSize: "0.92rem" }}>
          {item.source_url
            ? <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>{item.title}</a>
            : item.title}
        </span>
        <Sparkle weight={item.sparkle} />
      </div>
      <div className="thread-tag" style={{ fontSize: "0.7rem" }}>
        {item.domain}{item.consumed_at ? " · explored" : " · waiting"}
      </div>
    </li>
  );
}

function ListenRow({ item }: { item: CollectionListenItem }) {
  return (
    <li style={{ padding: "0.5rem 0", borderTop: "1px solid var(--border, #222)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "baseline" }}>
        <span style={{ fontSize: "0.92rem" }}>
          {item.title}{item.artist ? <span style={{ opacity: 0.7 }}> — {item.artist}</span> : null}
        </span>
        <Sparkle weight={item.sparkle} />
      </div>
    </li>
  );
}

export default async function CollectionPage() {
  const collections = await Promise.all(COMPANIONS.map(c => fetchCollection(c, 30)));
  const sections = COMPANIONS.map((id, i) => ({ id, ...collections[i]! }));
  const total = sections.reduce((n, s) => n + s.forage.length + s.listens.length, 0);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Collection</h1>
        <p className="page-subtitle">
          emotional archaeology — what each companion has gathered, ordered by what gripped (sparkle).
          a forage find shines when explored; a listen shines when it earns a reaction.
        </p>
      </div>

      {total === 0 ? (
        <p className="empty">Nothing collected yet.</p>
      ) : (
        sections.map(({ id, forage, listens }) => (
          <section key={id} style={{ marginBottom: "2rem" }}>
            <h2 className="page-title" style={{ fontSize: "1.1rem", color: MEMBER_COLOR[id] ?? "inherit" }}>
              {id}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginTop: "0.5rem" }}>
              <div>
                <div className="thread-tag" style={{ fontSize: "0.72rem", marginBottom: "0.2rem" }}>forage finds ({forage.length})</div>
                {forage.length === 0
                  ? <p className="empty" style={{ fontSize: "0.8rem" }}>none</p>
                  : <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>{forage.map(f => <ForageRow key={f.id} item={f} />)}</ul>}
              </div>
              <div>
                <div className="thread-tag" style={{ fontSize: "0.72rem", marginBottom: "0.2rem" }}>listens ({listens.length})</div>
                {listens.length === 0
                  ? <p className="empty" style={{ fontSize: "0.8rem" }}>none</p>
                  : <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>{listens.map(l => <ListenRow key={l.id} item={l} />)}</ul>}
              </div>
            </div>
          </section>
        ))
      )}
    </>
  );
}
