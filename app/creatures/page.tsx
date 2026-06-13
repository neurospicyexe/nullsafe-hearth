import { fetchCreatures, fetchCreature, creatureMood } from "@/lib/halseth";
import type { Creature, CreatureInteraction } from "@/lib/halseth";

export const dynamic = "force-dynamic";

const ACTOR_COLOR: Record<string, string> = {
  raziel: "#f59e0b",
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia: "#4ade80",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function TrustBar({ trust }: { trust: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, trust)) * 100);
  return (
    <div style={{ marginTop: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", opacity: 0.7 }}>
        <span>trust</span><span>{trust.toFixed(2)}</span>
      </div>
      <div style={{ height: "6px", borderRadius: "3px", background: "var(--surface, #1a1a1a)", overflow: "hidden", marginTop: "0.2rem" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function CreatureCard({ creature, interactions }: { creature: Creature; interactions: CreatureInteraction[] }) {
  const mood = creatureMood(creature);
  return (
    <section style={{
      border: "1px solid var(--border, #2a2a2a)", borderRadius: "10px",
      padding: "1.1rem", background: "var(--surface, #141414)",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem" }}>
        <h2 className="page-title" style={{ fontSize: "1.15rem", margin: 0 }}>
          {creature.name}
        </h2>
        <span className="thread-tag" style={{ fontSize: "0.7rem" }}>
          {creature.kind === "companion_pet" ? "system pet" : "real animal"}
        </span>
      </div>
      {creature.species && <p className="page-subtitle" style={{ margin: "0.15rem 0", fontSize: "0.8rem" }}>{creature.species}</p>}
      {mood && <p style={{ margin: "0.3rem 0", fontSize: "0.9rem" }}>mood: <strong>{mood}</strong></p>}
      {creature.bio && <p className="handover-last-real" style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>{creature.bio}</p>}

      <TrustBar trust={creature.trust} />

      <div style={{ marginTop: "0.8rem" }}>
        <div style={{ fontSize: "0.75rem", opacity: 0.7, marginBottom: "0.3rem" }}>
          recent interactions{creature.last_interaction_at ? ` — last ${formatTime(creature.last_interaction_at)}` : ""}
        </div>
        {interactions.length === 0 ? (
          <p className="empty" style={{ fontSize: "0.8rem" }}>none yet</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.82rem" }}>
            {interactions.slice(0, 6).map(i => (
              <li key={i.id} style={{ padding: "0.2rem 0", borderTop: "1px solid var(--border, #222)" }}>
                <span style={{ color: ACTOR_COLOR[i.actor] ?? "inherit" }}>{i.actor}</span>{" "}
                {i.action === "give" ? "gave to" : i.action}
                {i.note ? <span style={{ opacity: 0.8 }}> — {i.note}</span> : null}
                <span className="thread-tag" style={{ marginLeft: "0.4rem", fontSize: "0.7rem" }}>{formatTime(i.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default async function CreaturesPage() {
  const creatures = await fetchCreatures();
  const details = await Promise.all(creatures.map(c => fetchCreature(c.id)));

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Creatures</h1>
        <p className="page-subtitle">
          presences who live in the system — the corvid + Raziel&apos;s animals. trust builds slowly through
          interaction (<code>cy: pet &lt;name&gt; feed</code>) and cools when untended.
        </p>
      </div>

      {creatures.length === 0 ? (
        <p className="empty">No creatures yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {creatures.map((c, i) => (
            <CreatureCard key={c.id} creature={c} interactions={details[i]?.interactions ?? []} />
          ))}
        </div>
      )}
    </>
  );
}
