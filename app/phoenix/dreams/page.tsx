export const dynamic = "force-dynamic";

import { fetchMindDreams } from "@/lib/halseth";
import type { WmDream } from "@/lib/halseth";
import DreamsClient from "./DreamsClient";

const COMPANIONS = ["drevan", "cypher", "gaia"] as const;
type CompanionId = (typeof COMPANIONS)[number];

export default async function PhoenixDreamsPage() {
  const results = await Promise.allSettled(
    COMPANIONS.map((id) => fetchMindDreams(id, 10)),
  );

  const dreamsByCompanion: Record<CompanionId, WmDream[]> = {
    drevan: results[0].status === "fulfilled" ? results[0].value : [],
    cypher: results[1].status === "fulfilled" ? results[1].value : [],
    gaia:   results[2].status === "fulfilled" ? results[2].value : [],
  };

  const totalUnexamined = Object.values(dreamsByCompanion).reduce(
    (sum, arr) => sum + arr.filter((d) => !d.examined_at).length,
    0,
  );

  return (
    <>
      <header className="page-header">
        <div className="page-header-row">
          <h1 className="page-title">Dreams</h1>
          {totalUnexamined > 0 && (
            <span
              className="badge"
              style={{
                background: "#6366f122",
                color: "#818cf8",
                border: "1px solid #6366f144",
              }}
            >
              {totalUnexamined} unexamined
            </span>
          )}
        </div>
      </header>

      <DreamsClient dreamsByCompanion={dreamsByCompanion} />
    </>
  );
}
