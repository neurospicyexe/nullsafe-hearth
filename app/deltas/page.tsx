import { fetchAllDeltas } from "@/lib/halseth";
import FeelingsClient from "./client";

export const dynamic = "force-dynamic";

export default async function FeelingsPage() {
  const deltas = (await fetchAllDeltas(100)) ?? [];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Feelings</h1>
        <p className="page-subtitle">relational deltas — the shape of what has been felt</p>
      </div>
      <FeelingsClient deltas={deltas} />
    </>
  );
}
