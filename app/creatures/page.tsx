import { fetchCreatures, fetchCreature, creatureMood } from "@/lib/halseth";
import type { Creature, CreatureInteraction } from "@/lib/halseth";
import ClientTime from "@/components/ClientTime";
import TendButtons from "./TendButtons";

export const dynamic = "force-dynamic";

const COMPANION_IDS = new Set(["cypher", "drevan", "gaia"]);

const ACTOR_COLOR: Record<string, string> = {
  raziel: "#f59e0b",
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia: "#4ade80",
};

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

function RestlessnessBar({ restlessness }: { restlessness: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, restlessness)) * 100);
  // Color shifts from calm (green) toward agitated (amber/red) as restlessness rises
  const color = restlessness > 0.7 ? "#f87171" : restlessness > 0.4 ? "#f59e0b" : "#4ade80";
  return (
    <div style={{ marginTop: "0.4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", opacity: 0.7 }}>
        <span>restlessness</span><span>{restlessness.toFixed(2)}</span>
      </div>
      <div style={{ height: "6px", borderRadius: "3px", background: "var(--surface, #1a1a1a)", overflow: "hidden", marginTop: "0.2rem" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function activityLabel(i: CreatureInteraction): { label: string; color: string; prefix: string } {
  if (i.actor === "sol" && i.action === "appear") {
    return { prefix: "✦", label: "appeared", color: "#c084fc" }; // Sol's own moment — purple
  }
  if (COMPANION_IDS.has(i.actor)) {
    return { prefix: "→", label: i.action, color: ACTOR_COLOR[i.actor] ?? "#e2e8f0" };
  }
  if (i.actor === "raziel") {
    return { prefix: "♡", label: i.action, color: ACTOR_COLOR.raziel };
  }
  return { prefix: "·", label: i.action, color: "inherit" };
}

function CreatureCard({ creature, interactions }: { creature: Creature; interactions: CreatureInteraction[] }) {
  const mood = creatureMood(creature);
  return (
    <div className="home-section-card" style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {creature.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creature.avatar_url} alt={creature.name} width={32} height={32}
              style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          )}
          <span className="home-section-title" style={{ margin: 0 }}>{creature.name}</span>
        </div>
        <span className="section-row-meta" style={{ fontSize: "0.7rem", whiteSpace: "nowrap" }}>
          {creature.kind === "companion_pet" ? "system pet" : "real animal"}
        </span>
      </div>

      {/* Species + mood + disposition */}
      {creature.species && (
        <p className="section-row-meta" style={{ margin: 0, fontSize: "0.78rem" }}>{creature.species}</p>
      )}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
        {mood && (
          <span style={{ fontSize: "0.85rem" }}>
            mood: <strong>{mood}</strong>
          </span>
        )}
        {creature.disposition && (
          <span style={{ fontSize: "0.85rem" }}>
            disposition: <strong>{creature.disposition}</strong>
          </span>
        )}
      </div>

      {creature.bio && (
        <p className="section-row-meta" style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>{creature.bio}</p>
      )}

      {/* Trust + restlessness bars */}
      <TrustBar trust={creature.trust} />
      <RestlessnessBar restlessness={creature.restlessness ?? 0} />

      {/* Tend in place — feed/play/talk/give as raziel */}
      <TendButtons creatureId={creature.id} />

      {/* Activity log */}
      <div style={{ marginTop: "0.75rem" }}>
        <div className="section-row-meta" style={{ fontSize: "0.73rem", marginBottom: "0.35rem" }}>
          recent activity
          {creature.last_interaction_at && (
            <> — last <ClientTime iso={creature.last_interaction_at} /></>
          )}
        </div>
        {interactions.length === 0 ? (
          <p className="section-row-meta" style={{ fontSize: "0.8rem" }}>none yet</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {interactions.slice(0, 6).map(i => {
              const { prefix, label, color } = activityLabel(i);
              return (
                <li key={i.id} className="section-row" style={{ alignItems: "baseline", padding: "0.2rem 0" }}>
                  <span style={{ color, marginRight: "0.3rem", fontSize: "0.78rem" }}>{prefix}</span>
                  <span style={{ color, fontSize: "0.82rem" }}>{i.actor}</span>
                  <span style={{ fontSize: "0.82rem", marginLeft: "0.3rem" }}>{label}</span>
                  {i.note && (
                    <span className="section-row-meta" style={{ marginLeft: "0.3rem", fontSize: "0.78rem" }}>
                      — {i.note}
                    </span>
                  )}
                  <span className="section-row-meta" style={{ marginLeft: "auto", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                    <ClientTime iso={i.created_at} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
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
          interaction and cools when untended. tend them right here.
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
