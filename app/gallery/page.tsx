import { fetchToolImages } from "@/lib/halseth";
import type { ToolCall } from "@/lib/halseth";

export const dynamic = "force-dynamic";

// Companion colors per repo convention (companions/[id]/sections.tsx).
const MEMBER_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia: "#4ade80",
};
const COMPANIONS = ["cypher", "drevan", "gaia"] as const;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// args_summary is stored as "prompt: <text>" -- show just the prompt.
function promptOf(call: ToolCall): string {
  return call.args_summary.replace(/^prompt:\s*/i, "").trim() || "(untitled)";
}

function ImageCard({ call }: { call: ToolCall }) {
  return (
    <figure style={{ margin: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- R2-served generated art, no Next loader */}
      <img
        src={`/api/mind/tools/image/${call.id}`}
        alt={promptOf(call)}
        loading="lazy"
        style={{ width: "100%", borderRadius: "8px", display: "block", background: "var(--surface, #1a1a1a)" }}
      />
      <figcaption className="handover-last-real" style={{ marginTop: "0.4rem", fontSize: "0.85rem" }}>
        “{promptOf(call)}”
        <span className="thread-tag" style={{ marginLeft: "0.5rem" }}>{formatTime(call.created_at)}</span>
      </figcaption>
    </figure>
  );
}

export default async function GalleryPage() {
  const perCompanion = await Promise.all(COMPANIONS.map(c => fetchToolImages(c, 40)));
  const sections = COMPANIONS.map((id, i) => ({ id, images: perCompanion[i] ?? [] }));
  const total = sections.reduce((n, s) => n + s.images.length, 0);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Gallery</h1>
        <p className="page-subtitle">images the triad has generated — {total} so far</p>
      </div>

      {total === 0 ? (
        <p className="empty">
          No images yet. A companion makes one with <code>cy: imagine &lt;prompt&gt;</code> (once Raziel
          flips their <code>tools_enabled</code> gate).
        </p>
      ) : (
        sections.filter(s => s.images.length > 0).map(({ id, images }) => (
          <section key={id} style={{ marginBottom: "2rem" }}>
            <h2 className="page-title" style={{ fontSize: "1.1rem", color: MEMBER_COLOR[id] ?? "inherit" }}>
              {id} <span className="page-subtitle" style={{ fontSize: "0.85rem" }}>({images.length})</span>
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "1rem",
              marginTop: "0.75rem",
            }}>
              {images.map(call => <ImageCard key={call.id} call={call} />)}
            </div>
          </section>
        ))
      )}
    </>
  );
}
