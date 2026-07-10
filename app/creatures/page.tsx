import { fetchCreatures, fetchCreature, creatureMood } from "@/lib/halseth";
import type { Creature, CreatureInteraction, CreatureDetail, NestItem, CreatureMilestone } from "@/lib/halseth";
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

const MILESTONE_LABEL: Record<string, string> = {
  first_approach: "first approach",
  first_hand_feed: "first food from hand",
  chooses_to_stay: "chooses to stay",
  first_treasure: "first treasure",
  shoulder_perch: "shoulder perch",
  first_song: "first song",
  whole_sky: "the whole sky",
};

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div style={{ marginTop: "0.4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", opacity: 0.7 }}>
        <span>{label}</span><span>{value.toFixed(2)}</span>
      </div>
      <div style={{ height: "6px", borderRadius: "3px", background: "var(--surface, #1a1a1a)", overflow: "hidden", marginTop: "0.2rem" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

// Drives read as needs: green when quiet, amber/red as they get loud. Energy inverts
// (low energy is a roosting crow, not a starving one) so it renders as its own hue.
function driveColor(v: number): string {
  return v > 0.7 ? "#f87171" : v > 0.45 ? "#f59e0b" : "#4ade80";
}

function DriveBars({ creature }: { creature: Creature }) {
  const d = creature.drives;
  if (!d) return <Bar label="restlessness" value={creature.restlessness ?? 0} color={driveColor(creature.restlessness ?? 0)} />;
  return (
    <div style={{ marginTop: "0.2rem" }}>
      <Bar label="hunger" value={d.hunger} color={driveColor(d.hunger)} />
      <Bar label="boredom" value={d.boredom} color={driveColor(d.boredom)} />
      <Bar label="missing you" value={d.missing} color={driveColor(d.missing)} />
      <Bar label="energy" value={d.energy} color="#60a5fa" />
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

function NestSection({ nest }: { nest: NestItem[] }) {
  const kept = nest.filter(n => !n.gifted_to);
  const given = nest.filter(n => n.gifted_to).slice(0, 3);
  if (kept.length === 0 && given.length === 0) {
    return (
      <div style={{ marginTop: "0.75rem" }}>
        <div className="section-row-meta" style={{ fontSize: "0.73rem", marginBottom: "0.35rem" }}>the nest</div>
        <p className="section-row-meta" style={{ fontSize: "0.8rem" }}>
          empty — he keeps what he overhears and what he&apos;s given (tend with a give)
        </p>
      </div>
    );
  }
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div className="section-row-meta" style={{ fontSize: "0.73rem", marginBottom: "0.35rem" }}>
        the nest — {kept.length} kept{kept.filter(k => k.treasured === 1).length > 0 ? `, ${kept.filter(k => k.treasured === 1).length} treasured` : ""}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {kept.slice(0, 12).map(item => (
          <span
            key={item.id}
            title={`${item.given_by ? `from ${item.given_by}` : item.source} — sparkle ${item.sparkle.toFixed(2)}`}
            style={{
              fontSize: "0.75rem",
              padding: "0.15rem 0.5rem",
              borderRadius: "999px",
              border: `1px solid ${item.treasured === 1 ? "#f59e0b" : "var(--border)"}`,
              color: item.treasured === 1 ? "#f59e0b" : "var(--muted)",
              opacity: 0.4 + Math.min(1, Math.max(0, item.sparkle)) * 0.6,
              whiteSpace: "nowrap",
            }}
          >
            {item.treasured === 1 ? "★ " : ""}{item.content}
          </span>
        ))}
      </div>
      {given.length > 0 && (
        <div style={{ marginTop: "0.4rem" }}>
          {given.map(g => (
            <p key={g.id} className="section-row-meta" style={{ fontSize: "0.75rem", margin: "0.1rem 0" }}>
              → gave &quot;{g.content}&quot; to {g.gifted_to}{g.gifted_at && <> — <ClientTime iso={g.gifted_at} /></>}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function MilestoneSection({ milestones, next, trust }: { milestones: CreatureMilestone[]; next: { id: string; threshold: number } | null; trust: number }) {
  if (milestones.length === 0 && !next) return null;
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div className="section-row-meta" style={{ fontSize: "0.73rem", marginBottom: "0.35rem" }}>milestones</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
        {milestones.map(m => (
          <span
            key={m.milestone_id}
            title={`${m.text ?? ""}${m.witnessed_by ? ` (witnessed by ${m.witnessed_by})` : " (before anyone was counting)"}`}
            style={{
              fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "999px",
              background: "var(--surface, #1a1a1a)", color: "#c084fc", whiteSpace: "nowrap",
            }}
          >
            ✦ {MILESTONE_LABEL[m.milestone_id] ?? m.milestone_id}
          </span>
        ))}
        {next && (
          <span className="section-row-meta" style={{ fontSize: "0.73rem" }}>
            next: {MILESTONE_LABEL[next.id] ?? next.id} at trust {next.threshold.toFixed(2)} (now {trust.toFixed(2)})
          </span>
        )}
      </div>
    </div>
  );
}

function CreatureCard({ detail }: { detail: { creature: Creature } & Partial<CreatureDetail> }) {
  const creature = detail.creature;
  const interactions = detail.interactions ?? [];
  const isPet = creature.kind === "companion_pet";
  const mood = creatureMood(creature);
  const knownBest = (detail.familiarity ?? []).filter(f => f.actor !== "raziel")[0];
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
          {isPet ? "system pet" : "real animal"}
        </span>
      </div>

      {/* Species + mood + disposition + live state */}
      {creature.species && (
        <p className="section-row-meta" style={{ margin: 0, fontSize: "0.78rem" }}>{creature.species}</p>
      )}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
        {mood && <span style={{ fontSize: "0.85rem" }}>mood: <strong>{mood}</strong></span>}
        {creature.disposition && (
          <span style={{ fontSize: "0.85rem" }}>disposition: <strong>{creature.disposition}</strong></span>
        )}
        {creature.state && creature.state !== "content" && (
          <span style={{ fontSize: "0.85rem" }}>right now: <strong>{creature.state}</strong></span>
        )}
        {creature.tier && <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>{creature.tier}</span>}
      </div>

      {creature.bio && (
        <p className="section-row-meta" style={{ fontSize: "0.82rem", marginTop: "0.3rem" }}>{creature.bio}</p>
      )}

      {/* Trust + drives */}
      <Bar label="trust" value={creature.trust} color="var(--accent)" />
      <DriveBars creature={creature} />

      {knownBest && (
        <p className="section-row-meta" style={{ fontSize: "0.75rem", marginTop: "0.35rem" }}>
          knows {knownBest.actor} best ({knownBest.tendings} tendings)
        </p>
      )}

      {/* Tend in place — feed/play/talk/give as raziel */}
      <TendButtons creatureId={creature.id} />

      {/* Inner life (pet only): milestones + nest */}
      {isPet && (
        <MilestoneSection
          milestones={detail.milestones ?? []}
          next={detail.next_milestone ?? null}
          trust={creature.trust}
        />
      )}
      {isPet && <NestSection nest={detail.nest ?? []} />}

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
          interaction and cools when untended. drives are live; the nest is what he keeps. tend them right here.
        </p>
      </div>

      {creatures.length === 0 ? (
        <p className="empty">No creatures yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {creatures.map((c, i) => (
            <CreatureCard
              key={c.id}
              detail={{ ...(details[i] ?? { interactions: [] }), creature: { ...c, ...(details[i]?.creature ?? {}) } }}
            />
          ))}
        </div>
      )}
    </>
  );
}
