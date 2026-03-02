import { fetchPresence, type Delta, type Wound, type BiometricSnapshot } from "@/lib/halseth";
import PersonalityCard from "@/components/PersonalityCard";
import BiometricCard from "@/components/BiometricCard";

export const revalidate = 60;

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchDeltas(): Promise<Delta[]> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return [];

  try {
    const res = await fetch(`${base}/deltas?limit=20`, {
      headers: { ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchWounds(): Promise<Wound[]> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return [];

  try {
    const res = await fetch(`${base}/wounds`, {
      headers: { ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchBiometrics(): Promise<BiometricSnapshot | null> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return null;

  try {
    const res = await fetch(`${base}/biometrics?limit=1`, {
      headers: { ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data[0] ?? null : data;
  } catch {
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Components ────────────────────────────────────────────────────────────────

function DeltaFeed({ deltas }: { deltas: Delta[] }) {
  if (deltas.length === 0) return null;
  return (
    <div className="card">
      <div className="card-title">Recent Deltas</div>
      <div className="delta-feed">
        {deltas.map((d) => (
          <div key={d.id} className={`delta-entry`}>
            <span className={`valence-badge ${d.valence}`}>{d.valence}</span>
            <span className={`agent-badge ${d.agent}`}>{d.agent}</span>
            <div className="note-text" style={{ marginTop: "0.35rem" }}>{d.delta_text}</div>
            <div className="note-meta">
              {d.initiated_by && <span style={{ opacity: 0.5 }}>{d.initiated_by}</span>}
              <span style={{ marginLeft: "auto" }}>{formatTime(d.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GaiaPanel({ wounds }: { wounds: Wound[] }) {
  return (
    <div className="card gaia-card">
      <div className="card-title">
        <span className="agent-badge gaia">Gaia</span>
        {" "}Living Wounds
      </div>
      {wounds.length === 0 ? (
        <p className="empty">No wounds on record.</p>
      ) : (
        <div className="task-list">
          {wounds.map((w) => (
            <div key={w.id} className="gaia-wound-row">
              <span className="task-title">{w.subject}</span>
              {w.description && (
                <span className="note-text" style={{ opacity: 0.7, fontSize: "0.82rem" }}>
                  {w.description}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ThreadsPage() {
  const [presence, deltas, wounds, biometrics] = await Promise.all([
    fetchPresence().catch(() => null),
    fetchDeltas(),
    fetchWounds(),
    fetchBiometrics(),
  ]);

  return (
    <main className="page">
      <header className="header">
        <div className="header-top">
          <h1>Threads</h1>
          <span className="system-owner">history</span>
        </div>
      </header>

      {/* Biometrics */}
      {biometrics && <BiometricCard biometrics={biometrics} />}

      {/* Relational shape */}
      {presence?.personality && (
        <PersonalityCard personality={presence.personality} />
      )}

      {/* Recent deltas */}
      <DeltaFeed deltas={deltas} />

      {/* Gaia — living wounds (read-only) */}
      <GaiaPanel wounds={wounds} />
    </main>
  );
}
