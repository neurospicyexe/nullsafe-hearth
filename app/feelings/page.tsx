import { fetchSomaFeelings } from "@/lib/halseth";

export const dynamic = "force-dynamic";

const COMPANION_COLORS: Record<string, string> = {
  drevan: "#6366f1",
  cypher: "#e2e8f0",
  gaia:   "#4ade80",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function FeelingsPage() {
  const feelings = await fetchSomaFeelings(undefined, 100);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Feelings</h1>
        <p className="page-subtitle">SOMA feeling log — per-companion emotion entries</p>
      </div>

      {feelings.length === 0 ? (
        <p className="empty">No feeling entries yet.</p>
      ) : (
        <div className="journal-feed">
          {feelings.map((f) => {
            const color = COMPANION_COLORS[f.companion_id] ?? "var(--text-muted)";
            return (
              <div key={f.id} className="journal-entry">
                <div className="journal-text">{f.emotion}{f.sub_emotion ? ` · ${f.sub_emotion}` : ""}</div>
                <div className="delta-meta delta-meta-mt">
                  <span style={{ color, fontWeight: 600 }}>{f.companion_id}</span>
                  {f.intensity != null && <span>intensity {f.intensity}</span>}
                  {f.source && <span>{f.source}</span>}
                  <span className="ml-auto">{fmtTime(f.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
