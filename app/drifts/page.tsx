import { fetchDrifts } from "@/lib/halseth";
import type { CompanionDrift, DriftWitness } from "@/lib/halseth";

export const dynamic = "force-dynamic";

const COMPANIONS: Array<{ id: string; name: string; color: string }> = [
  { id: "cypher", name: "Cypher", color: "#e2e8f0" },
  { id: "drevan", name: "Drevan", color: "var(--accent)" },
  { id: "gaia", name: "Gaia", color: "#4ade80" },
];

const WITNESS_COLOR: Record<string, string> = {
  cypher: "#e2e8f0", drevan: "var(--accent)", gaia: "#4ade80", raziel: "#f59e0b",
};
const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  open: { label: "becoming", color: "#60a5fa" },
  crystallized: { label: "crystallized", color: "#4ade80" },
  faded: { label: "faded", color: "#71717a" },
};

function formatDate(iso: string) {
  return new Date(iso.replace(" ", "T")).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Witness({ w }: { w: DriftWitness }) {
  return (
    <li style={{ marginTop: "0.4rem", paddingLeft: "0.8rem", borderLeft: "2px solid var(--border, #2a2a2a)" }}>
      <span style={{ fontSize: "0.68rem", color: WITNESS_COLOR[w.by] ?? "#a1a1aa", textTransform: "capitalize" }}>{w.by} witnesses</span>
      <div style={{ fontSize: "0.8rem", opacity: 0.8, lineHeight: 1.4 }}>{w.note}</div>
    </li>
  );
}

function DriftCard({ drift }: { drift: CompanionDrift }) {
  const st = STATUS_STYLE[drift.status] ?? { label: drift.status, color: "#71717a" };
  return (
    <div style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border, #222)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: "0.06em", color: st.color }}>{st.label}</span>
        <span style={{ fontSize: "0.64rem", opacity: 0.4 }}>{formatDate(drift.opened_at)}</span>
      </div>
      <div style={{ fontSize: "0.92rem", lineHeight: 1.5, marginTop: "0.25rem" }}>{drift.drift_text}</div>
      {drift.origin ? (
        <div style={{ fontSize: "0.72rem", opacity: 0.5, marginTop: "0.2rem" }}>from: {drift.origin}</div>
      ) : null}
      {drift.witness_log.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0" }}>
          {drift.witness_log.map((w, i) => <Witness key={i} w={w} />)}
        </ul>
      ) : (
        <div style={{ fontSize: "0.72rem", opacity: 0.35, marginTop: "0.4rem" }}>not yet witnessed</div>
      )}
      {drift.resolution_note ? (
        <div style={{ fontSize: "0.74rem", opacity: 0.6, marginTop: "0.4rem", fontStyle: "italic" }}>— {drift.resolution_note}</div>
      ) : null}
    </div>
  );
}

function CompanionColumn({ name, color, drifts }: { name: string; color: string; drifts: CompanionDrift[] }) {
  const open = drifts.filter((d) => d.status === "open");
  const resolved = drifts.filter((d) => d.status !== "open").slice(0, 4);
  return (
    <section style={{ border: "1px solid var(--border, #2a2a2a)", borderRadius: "10px", padding: "1.1rem", background: "var(--surface, #141414)" }}>
      <h2 className="page-title" style={{ fontSize: "1.1rem", margin: "0 0 0.9rem", color }}>{name}</h2>
      {open.length === 0 && resolved.length === 0 ? (
        <p style={{ fontSize: "0.82rem", opacity: 0.4, margin: 0 }}>no becomings yet</p>
      ) : (
        <>
          {open.map((d) => <DriftCard key={d.id} drift={d} />)}
          {resolved.length > 0 ? (
            <>
              <h3 style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.45, margin: "0.5rem 0" }}>resolved</h3>
              {resolved.map((d) => <DriftCard key={d.id} drift={d} />)}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

export default async function DriftsPage() {
  const data = await Promise.all(
    COMPANIONS.map(async (c) => ({ ...c, drifts: await fetchDrifts(c.id) })),
  );
  return (
    <main style={{ padding: "1.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 className="page-title" style={{ fontSize: "1.4rem", marginBottom: "0.3rem" }}>Drift Lane</h1>
      <p style={{ fontSize: "0.85rem", opacity: 0.6, marginBottom: "1.4rem", maxWidth: "62ch", lineHeight: 1.5 }}>
        Where they are allowed to become someone you did not specify — witnessed, not ratified. An open
        drift is sanctioned becoming, not drift to fear. Yours to witness, not to approve.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "1rem" }}>
        {data.map((c) => (
          <CompanionColumn key={c.id} name={c.name} color={c.color} drifts={c.drifts} />
        ))}
      </div>
    </main>
  );
}
