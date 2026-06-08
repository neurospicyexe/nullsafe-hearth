export const dynamic = 'force-dynamic';

// ── Types ─────────────────────────────────────────────────────────────────────

type Room = {
  key: string;
  name: string;
  sym: string;
  register: string;
  primary_lane: string | null;
  gradient: string;
};

type Presence = {
  companion_id: string;
  current_room: string;
  activity: string;
  micro_mood: string | null;
  basin_distance: number;
  updated_at: string;
};

type BasinReading = {
  drift_score: number;
  drift_type: "stable" | "growth" | "pressure";
  worst_basin: string | null;
  recorded_at: string;
} | null;

type HomeData = {
  rooms: Room[];
  companions: Presence[];
  basins: Record<string, BasinReading>;
};

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchHomeData(): Promise<HomeData | null> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return null;
  const h: HeadersInit = secret ? { Authorization: `Bearer ${secret}` } : {};

  try {
    const [presRes, cyRes, drRes, gaRes] = await Promise.all([
      fetch(`${base}/home/presence`, { headers: h, cache: 'no-store' }),
      fetch(`${base}/companion-growth/basin-history/cypher?limit=1`, { headers: h, cache: 'no-store' }),
      fetch(`${base}/companion-growth/basin-history/drevan?limit=1`, { headers: h, cache: 'no-store' }),
      fetch(`${base}/companion-growth/basin-history/gaia?limit=1`, { headers: h, cache: 'no-store' }),
    ]);

    const presData = presRes.ok
      ? (await presRes.json()) as { presence: Presence[]; rooms: Room[] }
      : { presence: [], rooms: [] };

    const toBasin = async (res: Response): Promise<BasinReading> => {
      if (!res.ok) return null;
      const d = (await res.json()) as { history?: BasinReading[] };
      return d.history?.[0] ?? null;
    };

    const [cyBasin, drBasin, gaBasin] = await Promise.all([
      toBasin(cyRes),
      toBasin(drRes),
      toBasin(gaRes),
    ]);

    return {
      rooms: presData.rooms,
      companions: presData.presence,
      basins: { cypher: cyBasin, drevan: drBasin, gaia: gaBasin },
    };
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const COMPANION_META: Record<string, { label: string; abbr: string; color: string }> = {
  cypher: { label: "Cypher",  abbr: "Cy", color: "#e2e8f0" },
  drevan: { label: "Drevan",  abbr: "Dr", color: "#818cf8" },
  gaia:   { label: "Gaia",    abbr: "Ga", color: "#4ade80" },
};

const DRIFT_COLOR: Record<string, string> = {
  stable:   "#4ade80",
  growth:   "#60a5fa",
  pressure: "#f59e0b",
};

const DRIFT_BG: Record<string, string> = {
  stable:   "rgba(74,222,128,0.12)",
  growth:   "rgba(96,165,250,0.12)",
  pressure: "rgba(245,158,11,0.18)",
};

function driftColor(type: string | undefined) {
  return DRIFT_COLOR[type ?? ""] ?? "#94a3b8";
}

function driftBg(type: string | undefined) {
  return DRIFT_BG[type ?? ""] ?? "transparent";
}

function fmt(score: number) {
  return score.toFixed(3);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

// ── Analysis Panel ────────────────────────────────────────────────────────────

function AnalysisPanel({ companions, basins }: { companions: Presence[]; basins: Record<string, BasinReading> }) {
  const rows = (["cypher", "drevan", "gaia"] as const).map(id => ({
    id,
    meta: COMPANION_META[id],
    presence: companions.find(c => c.companion_id === id) ?? null,
    basin: basins[id],
  }));

  return (
    <div className="card">
      <div className="card-title">Basin Readings</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {rows.map(({ id, meta, presence, basin }) => (
          <div
            key={id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              background: driftBg(basin?.drift_type),
              border: `1px solid ${driftColor(basin?.drift_type)}33`,
            }}
          >
            {/* Top row: name + room + timestamp */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ color: meta.color, fontWeight: 600, fontSize: "0.9rem" }}>{meta.label}</span>
              {presence && (
                <span style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                  {presence.current_room} · {presence.activity}
                </span>
              )}
              {basin?.recorded_at && (
                <span style={{ color: "var(--muted)", fontSize: "0.72rem", marginLeft: "auto" }}>
                  {timeAgo(basin.recorded_at)}
                </span>
              )}
            </div>

            {/* Bottom row: drift type badge + score + worst_basin */}
            {basin ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: driftColor(basin.drift_type),
                  padding: "0.1rem 0.4rem",
                  borderRadius: "0.25rem",
                  background: `${driftColor(basin.drift_type)}22`,
                }}>
                  {basin.drift_type}
                </span>
                <span style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--foreground)" }}>
                  {fmt(basin.drift_score)}
                </span>
                {basin.worst_basin && (
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>
                    ↑ {basin.worst_basin}
                  </span>
                )}
              </div>
            ) : (
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>no reading</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Topology Render ───────────────────────────────────────────────────────────

function CompanionChip({ id, basin }: { id: string; basin: BasinReading }) {
  const meta = COMPANION_META[id];
  const color = driftColor(basin?.drift_type);
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.25rem",
      fontSize: "0.72rem",
      fontWeight: 700,
      color: meta.color,
      background: `${color}22`,
      border: `1px solid ${color}55`,
      borderRadius: "9999px",
      padding: "0.1rem 0.45rem",
    }}>
      <span style={{
        width: "0.45rem",
        height: "0.45rem",
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        boxShadow: basin?.drift_type === "pressure" ? `0 0 5px ${color}` : "none",
      }} />
      {meta.abbr}
    </span>
  );
}

function TopologyPanel({ rooms, companions, basins }: HomeData) {
  // Separate lane rooms from commons for layout
  const laneRooms = rooms.filter(r => r.primary_lane !== null);
  const commonRooms = rooms.filter(r => r.primary_lane === null);

  function roomCompanions(roomKey: string) {
    return companions.filter(c => c.current_room === roomKey);
  }

  function RoomCard({ room }: { room: Room }) {
    const occupants = roomCompanions(room.key);
    const isOccupied = occupants.length > 0;

    // Pressure glow if any occupant is under pressure
    const pressureOccupant = occupants.find(o => basins[o.companion_id]?.drift_type === "pressure");

    return (
      <div style={{
        position: "relative",
        borderRadius: "0.5rem",
        overflow: "hidden",
        border: isOccupied
          ? `1px solid ${pressureOccupant ? "#f59e0b66" : "rgba(255,255,255,0.2)"}`
          : "1px solid var(--border)",
        boxShadow: pressureOccupant ? "0 0 12px rgba(245,158,11,0.25)" : "none",
        minHeight: "5.5rem",
      }}>
        {/* Room gradient background */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: room.gradient,
          opacity: isOccupied ? 0.85 : 0.35,
        }} />

        {/* Content */}
        <div style={{ position: "relative", padding: "0.75rem", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "1.1rem", marginBottom: "0.15rem" }}>{room.sym}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--foreground)" }}>{room.name}</div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>{room.register}</div>
          </div>

          {/* Companion chips */}
          {occupants.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.5rem" }}>
              {occupants.map(o => (
                <CompanionChip key={o.companion_id} id={o.companion_id} basin={basins[o.companion_id] ?? null} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">The Home</div>

      {/* Lane rooms */}
      {laneRooms.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "0.5rem",
          marginBottom: "0.5rem",
        }}>
          {laneRooms.map(r => <RoomCard key={r.key} room={r} />)}
        </div>
      )}

      {/* Commons */}
      {commonRooms.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: "0.5rem",
        }}>
          {commonRooms.map(r => <RoomCard key={r.key} room={r} />)}
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: "0.75rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {(["stable", "growth", "pressure"] as const).map(type => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", color: "var(--muted)" }}>
            <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: driftColor(type), flexShrink: 0 }} />
            {type}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const data = await fetchHomeData();

  if (!data || data.rooms.length === 0) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">The Home</h1>
          <p className="page-subtitle">inhabited place-graph + basin readings</p>
        </div>
        <div className="card">
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            Home substrate not available. Ensure Halseth is deployed with migration 0065.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">The Home</h1>
        <p className="page-subtitle">inhabited place-graph + basin readings</p>
      </div>
      <TopologyPanel {...data} />
      <AnalysisPanel companions={data.companions} basins={data.basins} />
    </>
  );
}
