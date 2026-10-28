"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { MapNode, MemoryMap, MapReader } from "@/lib/halseth";
import PinButton from "@/components/PinButton";

// The memory map (docs/PLAN-memory-map-2026-10-28.md, M2): force layout on a canvas, pan + pinch zoom
// from force-graph. Colour = whose it is (node owner, edge writer), so Raziel's connections and each
// companion's read as theirs. Tap a node for its words, its connections, and a pin.

const OWNERS = ["raziel", "cypher", "drevan", "gaia"] as const;
const OWNER_NAME: Record<string, string> = { raziel: "Raziel", cypher: "Cypher", drevan: "Drevan", gaia: "Gaia", system: "the house" };
const FALLBACK: Record<string, string> = { raziel: "#f59e0b", cypher: "#e2e8f0", drevan: "#8b7cf6", gaia: "#4ade80", system: "#64748b" };

type GNode = MapNode & { x?: number; y?: number; degree: number };
type GLink = { source: string; target: string; type: string; writer: string };

function readColors(): Record<string, string> {
  if (typeof window === "undefined") return FALLBACK;
  const css = getComputedStyle(document.documentElement);
  const pick = (v: string, k: string) => css.getPropertyValue(v).trim() || FALLBACK[k]!;
  return { raziel: pick("--raziel", "raziel"), cypher: pick("--cypher", "cypher"), drevan: pick("--drevan", "drevan"), gaia: pick("--gaia", "gaia"), system: FALLBACK.system! };
}

const ageOf = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export default function MapClient({ map, reader }: { map: MemoryMap; reader: MapReader }) {
  const box = useRef<HTMLDivElement>(null);
  const graph = useRef<any>(null);
  const [selected, setSelected] = useState<GNode | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Unconnected things hide by default: measured 10-28, 82 of 105 nodes in the everyone view had no
  // connection yet and buried the real clusters. The count stays visible so the gap is not hidden.
  const [showLonely, setShowLonely] = useState(false);

  const data = useMemo(() => {
    const degree = new Map<string, number>();
    for (const e of map.edges) {
      degree.set(e.src, (degree.get(e.src) ?? 0) + 1);
      degree.set(e.dst, (degree.get(e.dst) ?? 0) + 1);
    }
    const ownerOf = (n: MapNode) => n.owner ?? "system";
    const all: GNode[] = map.nodes
      .filter((n) => !hidden.has(ownerOf(n)))
      .map((n) => ({ ...n, degree: degree.get(n.key) ?? 0 }));
    const lonely = all.filter((n) => n.degree === 0).length;
    const nodes = showLonely ? all : all.filter((n) => n.degree > 0);
    const keep = new Set(nodes.map((n) => n.key));
    const links: GLink[] = map.edges
      .filter((e) => keep.has(e.src) && keep.has(e.dst))
      .map((e) => ({ source: e.src, target: e.dst, type: e.type, writer: e.writer }));
    return { nodes, links, lonely };
  }, [map, hidden, showLonely]);

  useEffect(() => {
    let alive = true;
    let ro: ResizeObserver | null = null;
    (async () => {
      const { default: ForceGraph } = await import("force-graph");
      if (!alive || !box.current) return;
      const colors = readColors();
      const color = (who: string | null | undefined) => colors[who ?? "system"] ?? colors.system!;
      const g = new ForceGraph(box.current)
        .backgroundColor("rgba(0,0,0,0)")
        .nodeId("key")
        .linkSource("source")
        .linkTarget("target")
        .nodeLabel((n: any) => `${n.kind}: ${n.label}`)
        .linkColor((l: any) => `${color(l.writer)}66`)
        .linkWidth(1)
        .linkDirectionalArrowLength(3)
        .linkDirectionalArrowRelPos(0.9)
        .cooldownTicks(120)
        .nodeCanvasObject((n: any, ctx: CanvasRenderingContext2D, scale: number) => {
          const r = n.seed ? 5 : 3 + Math.min(4, Math.sqrt(n.degree));
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = color(n.owner);
          ctx.fill();
          if (n.pinned) {
            ctx.lineWidth = 1.5 / scale;
            ctx.strokeStyle = "#fbbf24";
            ctx.beginPath();
            ctx.arc(n.x, n.y, r + 2.5, 0, 2 * Math.PI);
            ctx.stroke();
          }
          if (scale > 1.8 || n.degree >= 3) {
            const t = n.label.length > 28 ? n.label.slice(0, 27) + "…" : n.label;
            ctx.font = `${10 / scale}px sans-serif`;
            ctx.fillStyle = "rgba(226,232,240,0.85)";
            ctx.textAlign = "center";
            ctx.fillText(t, n.x, n.y + r + 9 / scale);
          }
        })
        .nodePointerAreaPaint((n: any, paint: string, ctx: CanvasRenderingContext2D) => {
          ctx.fillStyle = paint;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 9, 0, 2 * Math.PI);
          ctx.fill();
        })
        .onNodeClick((n: any) => setSelected(n as GNode))
        .onBackgroundClick(() => setSelected(null));
      graph.current = g;
      const fit = () => {
        if (!box.current) return;
        g.width(box.current.clientWidth).height(box.current.clientHeight);
      };
      fit();
      ro = new ResizeObserver(fit);
      ro.observe(box.current);
      g.graphData({ nodes: data.nodes.map((n) => ({ ...n })), links: data.links.map((l) => ({ ...l })) });
      g.onEngineStop(() => g.zoomToFit(400, 40));
    })();
    return () => {
      alive = false;
      ro?.disconnect();
      graph.current?._destructor?.();
      graph.current = null;
    };
    // The graph is built once per mount; data changes are pushed by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    graph.current?.graphData({ nodes: data.nodes.map((n) => ({ ...n })), links: data.links.map((l) => ({ ...l })) });
  }, [data]);

  const neighbours = useMemo(() => {
    if (!selected) return [];
    const byKey = new Map(map.nodes.map((n) => [n.key, n]));
    return map.edges
      .filter((e) => e.src === selected.key || e.dst === selected.key)
      .map((e) => ({ e, other: byKey.get(e.src === selected.key ? e.dst : e.src) }))
      .filter((x): x is { e: (typeof map.edges)[number]; other: MapNode } => !!x.other)
      .slice(0, 12);
  }, [selected, map]);

  const toggleOwner = (o: string) =>
    setHidden((h) => {
      const next = new Set(h);
      next.has(o) ? next.delete(o) : next.add(o);
      return next;
    });

  const pinnable = selected && (selected.table === "companion_conclusions" || selected.table === "wm_continuity_notes") && selected.owner && selected.owner !== "raziel";

  return (
    <div className="map-shell">
      <div className="map-legend">
        {OWNERS.map((o) => (
          <button key={o} type="button" className={`map-chip${hidden.has(o) ? " off" : ""}`} onClick={() => toggleOwner(o)} aria-pressed={!hidden.has(o)}>
            <span className={`map-dot map-dot-${o}`} />
            {OWNER_NAME[o]}
          </button>
        ))}
        {data.lonely > 0 && (
          <button type="button" className={`map-chip${showLonely ? "" : " off"}`} onClick={() => setShowLonely((v) => !v)} aria-pressed={showLonely}>
            {showLonely ? "Hide" : "Show"} {data.lonely} not connected yet
          </button>
        )}
        <span className="map-count">
          {data.nodes.length} things, {data.links.length} connections{map.truncated ? " (trimmed)" : ""}
        </span>
      </div>

      <div ref={box} className="map-canvas" />

      {selected && (
        <aside className="map-panel card">
          <div className="map-panel-head">
            <span className="badge">{selected.kind}</span>
            <span className="map-panel-who">
              {OWNER_NAME[selected.owner ?? "system"] ?? selected.owner} {ageOf(selected.created_at) && `· ${ageOf(selected.created_at)}`}
            </span>
            <button type="button" className="map-close" onClick={() => setSelected(null)} aria-label="Close">
              ×
            </button>
          </div>
          <p className="map-panel-text">{selected.text ?? selected.label}</p>
          {pinnable && (
            <PinButton
              companionId={selected.owner!}
              kind={selected.table === "companion_conclusions" ? "conclusion" : "note"}
              id={selected.id}
              pinned={selected.pinned}
            />
          )}
          {neighbours.length > 0 && (
            <ul className="map-links">
              {neighbours.map(({ e, other }) => (
                <li key={`${e.src}|${e.dst}|${e.type}`}>
                  <span className={`map-dot map-dot-${e.writer}`} />
                  <span className="map-link-type">{e.type.replace(/_/g, " ")}</span> {other.label}
                </li>
              ))}
            </ul>
          )}
          <Link className="map-explore" href={`/map?reader=${reader}&center=${encodeURIComponent(`${selected.table}:${selected.id}`)}&hops=2`}>
            Show everything connected to this →
          </Link>
        </aside>
      )}
    </div>
  );
}
