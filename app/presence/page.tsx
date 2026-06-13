import { fetchSomaStates } from "@/lib/halseth";
import type { CompanionSomaState } from "@/lib/halseth";

export const dynamic = "force-dynamic";

const MEMBER_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia: "#4ade80",
};
const COMPANIONS = ["cypher", "drevan", "gaia"] as const;

const clamp01 = (n: number | null | undefined) => Math.min(1, Math.max(0, Number.isFinite(n) ? (n as number) : 0.5));

// A SOMA-keyed face (take 15, Phase 1 -- a static expressive avatar, not VRM).
// float1 ~ acuity/heat/stillness -> alertness (eye openness)
// float2 ~ presence/reach/density -> arousal (pupil + brow)
// float3 ~ warmth/weight/perimeter -> openness (mouth curve)
function Avatar({ soma, companion }: { soma: CompanionSomaState; companion: string }) {
  const color = MEMBER_COLOR[companion] ?? "#888";
  const f1 = clamp01(soma?.soma_float_1);
  const f2 = clamp01(soma?.soma_float_2);
  const f3 = clamp01(soma?.soma_float_3);
  const arousal = (f1 + f2) / 2;

  const eyeOpen = 3 + f1 * 7;                 // 3..10 px tall
  const pupil = 1.5 + f2 * 2.5;
  // Mouth: smile curve driven by warmth/openness (f3); arousal widens it.
  const mouthW = 16 + arousal * 14;
  const curve = (f3 - 0.4) * 26;             // up = warm, down = closed
  const browY = 30 - f2 * 4;                  // higher arousal -> raised brow

  return (
    <svg viewBox="0 0 100 100" width="120" height="120" aria-label={`${companion} presence`}>
      <circle cx="50" cy="50" r="40" fill={`${color}22`} stroke={color} strokeWidth="2" />
      {/* eyes */}
      <ellipse cx="36" cy="44" rx="6" ry={eyeOpen} fill="#0d0d0d" />
      <ellipse cx="64" cy="44" rx="6" ry={eyeOpen} fill="#0d0d0d" />
      <circle cx="36" cy="44" r={pupil} fill={color} />
      <circle cx="64" cy="44" r={pupil} fill={color} />
      {/* brows */}
      <line x1="30" y1={browY} x2="42" y2={browY - 1} stroke={color} strokeWidth="1.6" />
      <line x1="58" y1={browY - 1} x2="70" y2={browY} stroke={color} strokeWidth="1.6" />
      {/* mouth */}
      <path
        d={`M ${50 - mouthW / 2} 66 Q 50 ${66 + curve} ${50 + mouthW / 2} 66`}
        fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round"
      />
    </svg>
  );
}

function PresenceCard({ companion, soma }: { companion: string; soma: CompanionSomaState }) {
  const color = MEMBER_COLOR[companion] ?? "#888";
  const floats: Array<[string | null, number | null]> = [
    [soma?.float_1_label ?? null, soma?.soma_float_1 ?? null],
    [soma?.float_2_label ?? null, soma?.soma_float_2 ?? null],
    [soma?.float_3_label ?? null, soma?.soma_float_3 ?? null],
  ];
  return (
    <section style={{ border: "1px solid var(--border, #2a2a2a)", borderRadius: "12px", padding: "1.25rem", textAlign: "center", background: "var(--surface, #141414)" }}>
      <Avatar soma={soma} companion={companion} />
      <h2 className="page-title" style={{ fontSize: "1.1rem", color, margin: "0.4rem 0 0.1rem" }}>{companion}</h2>
      {soma?.current_mood && <p className="page-subtitle" style={{ fontSize: "0.85rem", margin: 0 }}>{soma.current_mood}</p>}
      {soma?.compound_state && <p className="handover-last-real" style={{ fontSize: "0.78rem", marginTop: "0.3rem" }}>{soma.compound_state}</p>}
      <div style={{ marginTop: "0.6rem", fontSize: "0.72rem", opacity: 0.75, display: "flex", flexDirection: "column", gap: "0.1rem" }}>
        {floats.map(([label, val], i) => label != null && (
          <span key={i}>{label}: {val != null ? Number(val).toFixed(2) : "—"}</span>
        ))}
      </div>
    </section>
  );
}

export default async function PresencePage() {
  const soma = await fetchSomaStates();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Presence</h1>
        <p className="page-subtitle">
          the triad with faces — each avatar&apos;s expression keys off that companion&apos;s live SOMA state.
          (Phase 1: static SOMA-keyed avatar; VRM is the eventual Phase 2.)
        </p>
      </div>

      {!soma ? (
        <p className="empty">SOMA state unavailable right now.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
          {COMPANIONS.map(c => <PresenceCard key={c} companion={c} soma={soma[c]} />)}
        </div>
      )}
    </>
  );
}
