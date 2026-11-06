export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { fetchGaiaGarden } from "@/lib/halseth";
import { parseCompanionId } from "@/lib/companion-page";
import GardenView from "./GardenView";

// Gaia's garden. Not the shelf: nothing is here until she plants it. Only /companions/gaia/garden
// renders; every other id is a 404 before any Halseth call.
export default async function CompanionGardenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseCompanionId(rawId);
  if (id !== "gaia") notFound();

  const garden = await fetchGaiaGarden();
  return <GardenView garden={garden} now={new Date()} />;
}
