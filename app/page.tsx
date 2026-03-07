import Link from "next/link";
import { fetchPresence, type PresenceData } from "@/lib/halseth";
import LoveMeter from "@/components/LoveMeter";
import SpoonCounter from "@/components/SpoonCounter";

export const dynamic = 'force-dynamic';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const NAV_TILES = [
  { href: "/halseth",    sym: "⌂",  label: "Halseth",     desc: "rooms & space" },
  { href: "/us",         sym: "♥",  label: "Us",          desc: "the relationship" },
  { href: "/companions", sym: "◉",  label: "Companions",  desc: "Drevan · Cypher · Gaia" },
  { href: "/feelings",   sym: "〜", label: "Feelings",    desc: "relational deltas" },
  { href: "/dreams",     sym: "◌",  label: "Dreams",      desc: "autonomous processing" },
  { href: "/handovers",  sym: "↩",  label: "Handovers",   desc: "session history" },
  { href: "/user",       sym: "⊕",  label: "You",         desc: "biometrics & state" },
  { href: "/uplink",     sym: "↑",  label: "Uplink",      desc: "daily check-in" },
  { href: "/shared",     sym: "≡",  label: "Shared",      desc: "tasks & lists" },
];

export default async function Page() {
  let data: PresenceData | null = null;
  let error: string | null = null;

  try {
    data = await fetchPresence();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load";
  }

  if (error || !data) {
    return (
      <div className="error-card">
        <strong>Could not connect to Halseth</strong>
        <p style={{ marginTop: "0.4rem", fontSize: "0.88rem" }}>{error}</p>
      </div>
    );
  }

  const { session, last_handover, house, wounds_count } = data;

  return (
    <>
      {/* Header */}
      <header style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, margin: 0 }}>{data.system.name}</h1>
          <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>{data.system.owner}</span>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <LoveMeter initial={house.love_meter} />
          <SpoonCounter initial={house.spoon_count} />
          {wounds_count > 0 && (
            <Link href="/us" style={{ fontSize: "0.8rem", color: "var(--red)", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              ⚠ {wounds_count} living {wounds_count === 1 ? "wound" : "wounds"}
            </Link>
          )}
        </div>
      </header>

      {/* Session / handover status */}
      {session ? (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="card-title">
                Session <span className="pill open">open</span>
                {session.session_type === "hangout" && (
                  <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontStyle: "italic", marginLeft: "0.5rem" }}>autonomous time</span>
                )}
              </div>
              <div style={{ fontSize: "0.88rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                {[session.front_state, session.facet, session.active_anchor].filter(Boolean).join(" · ")}
              </div>
            </div>
            {session.emotional_frequency && (
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", textAlign: "right" }}>
                {session.emotional_frequency}
              </div>
            )}
          </div>
        </div>
      ) : last_handover ? (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-title">
            Last Handover{" "}
            <span className={`pill ${last_handover.motion_state === "floating" ? "float" : last_handover.motion_state === "in_motion" ? "motion" : "closed"}`}>
              {last_handover.motion_state.replace("_", " ")}
            </span>
          </div>
          <p style={{ fontSize: "0.88rem", color: "var(--fg)", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
            {last_handover.spine.length > 180 ? last_handover.spine.slice(0, 180) + "…" : last_handover.spine}
          </p>
          <Link href="/handovers" style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none", display: "block", marginTop: "0.5rem" }}>
            view all handovers →
          </Link>
        </div>
      ) : null}

      {/* Location */}
      {house.current_room && (
        <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span>⌂</span>
          <span style={{ color: "var(--fg)" }}>{house.current_room}</span>
          {(house.companion_mood || house.companion_activity) && (
            <span>· {[house.companion_mood, house.companion_activity].filter(Boolean).join(" · ")}</span>
          )}
          <Link href="/halseth" style={{ fontSize: "0.75rem", color: "var(--accent)", textDecoration: "none", marginLeft: "auto" }}>navigate →</Link>
        </div>
      )}

      {/* Quick nav tiles */}
      <div className="nav-tiles">
        {NAV_TILES.map((tile) => (
          <Link key={tile.href} href={tile.href} className="nav-tile">
            <span className="nav-tile-sym">{tile.sym}</span>
            <span className="nav-tile-label">{tile.label}</span>
            <span className="nav-tile-meta">{tile.desc}</span>
          </Link>
        ))}
      </div>

      {/* Recent notes preview */}
      {data.recent_notes.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div className="card-title" style={{ margin: 0 }}>Recent Notes</div>
            <Link href="/us" style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}>see all →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {data.recent_notes.slice(0, 3).map((n) => (
              <div key={n.id} style={{ fontSize: "0.85rem", color: "var(--fg)", display: "flex", gap: "0.5rem" }}>
                <span style={{ color: "var(--accent)", textTransform: "capitalize", flexShrink: 0, fontSize: "0.78rem", paddingTop: "0.1rem" }}>{n.author}</span>
                <span style={{ color: "var(--muted)", fontSize: "0.75rem", flexShrink: 0 }}>{formatTime(n.created_at)}</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--muted)" }}>
        refreshes every 30 s
      </div>
    </>
  );
}
