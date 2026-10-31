import { fetchCreaturesOrNull, fetchCreature, creatureMood } from "@/lib/halseth";
import type { Creature, CreatureInteraction, CreatureDetail, NestItem, CreatureMilestone } from "@/lib/halseth";
import { memberClass } from "@/lib/club-model";
import ClientTime from "@/components/ClientTime";
import TendButtons from "./TendButtons";

export const dynamic = "force-dynamic";

const COMPANION_IDS = new Set(["cypher", "drevan", "gaia"]);

const MILESTONE_LABEL: Record<string, string> = {
  first_approach: "first approach",
  first_hand_feed: "first food from hand",
  chooses_to_stay: "chooses to stay",
  first_treasure: "first treasure",
  shoulder_perch: "shoulder perch",
  first_song: "first song",
  whole_sky: "the whole sky",
};

type Tone = "trust" | "quiet" | "loud" | "urgent" | "energy";

function Bar({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="h-creature-bar">
      <div className="h-creature-bar-head">
        <span>{label}</span><span>{value.toFixed(2)}</span>
      </div>
      <div className="h-creature-bar-track">
        <div className={`h-creature-bar-fill is-${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Drives read as needs: quiet when low, warmer as they get loud. Energy inverts
// (low energy is a roosting crow, not a starving one) so it renders as its own tone.
function driveTone(v: number): Tone {
  return v > 0.7 ? "urgent" : v > 0.45 ? "loud" : "quiet";
}

function DriveBars({ creature }: { creature: Creature }) {
  const d = creature.drives;
  if (!d) return <Bar label="restlessness" value={creature.restlessness ?? 0} tone={driveTone(creature.restlessness ?? 0)} />;
  return (
    <div>
      <Bar label="hunger" value={d.hunger} tone={driveTone(d.hunger)} />
      <Bar label="boredom" value={d.boredom} tone={driveTone(d.boredom)} />
      <Bar label="missing you" value={d.missing} tone={driveTone(d.missing)} />
      <Bar label="energy" value={d.energy} tone="energy" />
    </div>
  );
}

function activityLabel(i: CreatureInteraction): { label: string; cls: string; prefix: string } {
  if (i.actor === "sol" && i.action === "appear") {
    return { prefix: "✦", label: "appeared", cls: "is-sol" }; // Sol's own moment
  }
  if (COMPANION_IDS.has(i.actor)) return { prefix: "→", label: i.action, cls: memberClass(i.actor) };
  if (i.actor === "raziel") return { prefix: "♡", label: i.action, cls: "is-raziel" };
  return { prefix: "·", label: i.action, cls: "is-other" };
}

function NestSection({ nest }: { nest: NestItem[] }) {
  const kept = nest.filter(n => !n.gifted_to);
  const given = nest.filter(n => n.gifted_to).slice(0, 3);
  if (kept.length === 0 && given.length === 0) {
    return (
      <div className="h-creature-section">
        <h3 className="h-creature-h3">the nest</h3>
        <p className="h-creature-quiet">empty: he keeps what he overhears and what he&apos;s given (tend with a give)</p>
      </div>
    );
  }
  const treasured = kept.filter(k => k.treasured === 1).length;
  return (
    <div className="h-creature-section">
      <h3 className="h-creature-h3">
        the nest: {kept.length} kept{treasured > 0 ? `, ${treasured} treasured` : ""}
      </h3>
      <div className="h-creature-chips">
        {/* The count line above already says how many are kept; clipping to 12 under it made the
            rest unreachable on the page that exists to show them. */}
        {kept.map(item => (
          <span
            key={item.id}
            title={`${item.given_by ? `from ${item.given_by}` : item.source}, sparkle ${item.sparkle.toFixed(2)}`}
            className={`h-creature-chip${item.treasured === 1 ? " is-treasured" : ""}`}
            style={{ opacity: 0.4 + Math.min(1, Math.max(0, item.sparkle)) * 0.6 }}
          >
            {item.treasured === 1 ? "★ " : ""}{item.content}
          </span>
        ))}
      </div>
      {given.length > 0 && (
        <ul className="h-creature-given">
          {given.map(g => (
            <li key={g.id}>
              → gave &quot;{g.content}&quot; to {g.gifted_to}{g.gifted_at && <> · <ClientTime iso={g.gifted_at} /></>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MilestoneSection({ milestones, next, trust }: { milestones: CreatureMilestone[]; next: { id: string; threshold: number } | null; trust: number }) {
  if (milestones.length === 0 && !next) return null;
  return (
    <div className="h-creature-section">
      <h3 className="h-creature-h3">milestones</h3>
      <div className="h-creature-chips">
        {milestones.map(m => (
          <span
            key={m.milestone_id}
            title={`${m.text ?? ""}${m.witnessed_by ? ` (witnessed by ${m.witnessed_by})` : " (before anyone was counting)"}`}
            className="h-creature-chip is-moment"
          >
            ✦ {MILESTONE_LABEL[m.milestone_id] ?? m.milestone_id}
          </span>
        ))}
        {next && (
          <span className="h-creature-meta">
            next: {MILESTONE_LABEL[next.id] ?? next.id} at trust {next.threshold.toFixed(2)} (now {trust.toFixed(2)})
          </span>
        )}
      </div>
    </div>
  );
}

function CreatureCard({ creature, detail }: { creature: Creature; detail: CreatureDetail | null }) {
  const interactions = detail?.interactions ?? [];
  const isPet = creature.kind === "companion_pet";
  const mood = creatureMood(creature);
  const knownBest = (detail?.familiarity ?? []).filter(f => f.actor !== "raziel")[0];
  return (
    <article className="h-creature">
      <div className="h-creature-head">
        <div className="h-creature-who">
          {creature.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="h-creature-avatar" src={creature.avatar_url} alt={creature.name} width={40} height={40} />
          )}
          <h2 className="h-creature-name">{creature.name}</h2>
        </div>
        <span className="h-creature-meta">{isPet ? "system pet" : "real animal"}</span>
      </div>

      {creature.species && <p className="h-creature-meta">{creature.species}</p>}
      <div className="h-creature-state">
        {mood && <span>mood: <strong>{mood}</strong></span>}
        {creature.disposition && <span>disposition: <strong>{creature.disposition}</strong></span>}
        {creature.state && creature.state !== "content" && <span>right now: <strong>{creature.state}</strong></span>}
        {creature.tier && <span className="h-creature-meta">{creature.tier}</span>}
      </div>

      {creature.bio && <p className="h-creature-bio">{creature.bio}</p>}

      <Bar label="trust" value={creature.trust} tone="trust" />
      <DriveBars creature={creature} />

      {knownBest && (
        <p className="h-creature-meta">knows {knownBest.actor} best ({knownBest.tendings} tendings)</p>
      )}

      {/* Tend in place: feed/play/talk/give as raziel */}
      <TendButtons creatureId={creature.id} />

      {detail === null ? (
        <p className="h-creature-quiet is-section">Couldn&apos;t load the rest of this card from Halseth.</p>
      ) : (
        <>
          {isPet && (
            <MilestoneSection milestones={detail.milestones ?? []} next={detail.next_milestone ?? null} trust={creature.trust} />
          )}
          {isPet && <NestSection nest={detail.nest ?? []} />}

          <div className="h-creature-section">
            <h3 className="h-creature-h3">
              recent activity
              {creature.last_interaction_at && <> · last <ClientTime iso={creature.last_interaction_at} /></>}
            </h3>
            {interactions.length === 0 ? (
              <p className="h-creature-quiet">none yet</p>
            ) : (
              <ul className="h-creature-feed">
                {interactions.map(i => {
                  const { prefix, label, cls } = activityLabel(i);
                  return (
                    <li key={i.id} className={`h-creature-row ${cls}`}>
                      <span className="h-creature-row-who">{prefix} {i.actor} {label}</span>
                      {/* Notes are the actor's own words (Sol's included): shown as written. */}
                      {i.note && <span className="h-creature-row-note">{i.note}</span>}
                      <span className="h-creature-row-at"><ClientTime iso={i.created_at} /></span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </article>
  );
}

export default async function CreaturesPage() {
  const creatures = await fetchCreaturesOrNull();
  const details = creatures ? await Promise.all(creatures.map(c => fetchCreature(c.id))) : [];

  return (
    <div className="h-creatures">
      <h1 className="h-page-title">Creatures</h1>
      <p className="h-creatures-lede">
        presences who live in the system: the corvid and Raziel&apos;s animals. Trust builds slowly through
        tending and cools when untended. Drives are live; the nest is what he keeps. Tend them right here.
      </p>

      {creatures === null ? (
        <p className="h-creature-quiet">Can&apos;t reach Halseth right now.</p>
      ) : creatures.length === 0 ? (
        <p className="h-creature-quiet">No creatures yet.</p>
      ) : (
        <div className="h-creatures-grid">
          {creatures.map((c, i) => {
            const detail = details[i] ?? null;
            return <CreatureCard key={c.id} creature={{ ...c, ...(detail?.creature ?? {}) }} detail={detail} />;
          })}
        </div>
      )}
    </div>
  );
}
