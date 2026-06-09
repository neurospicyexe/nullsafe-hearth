import { fetchDreams, fetchCompanionDreams, fetchDreamSeeds } from "@/lib/halseth";
import DreamsClient from "./DreamsClient";

export const dynamic = "force-dynamic";

export default async function DreamsPage() {
  const [dreams, companionDreams, seeds] = await Promise.all([
    fetchDreams(undefined, 50),
    fetchCompanionDreams(undefined, 50),
    fetchDreamSeeds(),
  ]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dreams</h1>
        <p className="page-subtitle">autonomous processing — what surfaces when no one is watching</p>
      </div>
      <DreamsClient
        initialDreams={dreams}
        initialCompanionDreams={companionDreams}
        initialSeeds={seeds}
      />
    </>
  );
}
