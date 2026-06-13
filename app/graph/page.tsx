import { fetchMemoryGraph } from "@/lib/halseth";
import type { GraphNode, GraphEdge } from "@/lib/halseth";

export const dynamic = "force-dynamic";

const MEMBER_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia: "#4ade80",
};
const COMPANIONS = ["cypher", "drevan", "gaia"] as const;

const W = 900;
const H = 640;
const CLUSTER_CENTERS: Record<string, { x: number; y: number }> = {
  cypher: { x: W * 0.27, y: H * 0.34 },
  drevan: { x: W * 0.73, y: H * 0.34 },
  gaia:   { x: W * 0.50, y: H * 0.74 },
};

// Deterministic positions: each companion's nodes ring their cluster center.
function layout(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  for (const c of COMPANIONS) {
    const cn = nodes.filter(n => n.companion_id === c);
    const center = CLUSTER_CENTERS[c]!;
    const radius = Math.min(170, 50 + cn.length * 7);
    cn.forEach((n, i) => {
      const angle = (i / Math.max(1, cn.length)) * Math.PI * 2;
      pos.set(n.id, { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
    });
  }
  return pos;
}

export default async function GraphPage() {
  const { nodes, edges } = await fetchMemoryGraph(60);
  const pos = layout(nodes);
  const colorOf = (id: string) => MEMBER_COLOR[nodes.find(n => n.id === id)?.companion_id ?? ""] ?? "#888";

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Graph</h1>
        <p className="page-subtitle">
          the constellation of what-prehends-what — each growth memory linked to the ones it reached
          back to. {nodes.length} memories, {edges.length} threads. coloured by companion.
        </p>
      </div>

      {nodes.length === 0 ? (
        <p className="empty">No prehension links yet — the graph fills as the triad builds on its own earlier insights.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: `${W}px`, background: "var(--surface, #0f0f0f)", borderRadius: "10px" }}>
            <g stroke="#ffffff22" strokeWidth={1}>
              {edges.map((e: GraphEdge, i) => {
                const a = pos.get(e.from), b = pos.get(e.to);
                if (!a || !b) return null;
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={`${colorOf(e.from)}55`} />;
              })}
            </g>
            <g>
              {nodes.map(n => {
                const p = pos.get(n.id);
                if (!p) return null;
                return (
                  <circle key={n.id} cx={p.x} cy={p.y} r={5} fill={MEMBER_COLOR[n.companion_id] ?? "#888"}>
                    <title>{`[${n.companion_id}] ${n.label}`}</title>
                  </circle>
                );
              })}
            </g>
            {COMPANIONS.map(c => (
              <text key={c} x={CLUSTER_CENTERS[c]!.x} y={CLUSTER_CENTERS[c]!.y} textAnchor="middle"
                fill={MEMBER_COLOR[c]} fontSize={13} opacity={0.6} fontWeight="bold">{c}</text>
            ))}
          </svg>
        </div>
      )}
    </>
  );
}
