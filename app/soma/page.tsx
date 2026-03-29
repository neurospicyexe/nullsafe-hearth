export const dynamic = "force-dynamic";

import { fetchSomaStates, fetchTensions, fetchBasinHistory, fetchSomaticSnapshots } from "@/lib/halseth";
import type { CompanionTension, BasinHistory, SomaticSnapshot } from "@/lib/halseth";
import SomaClient from "./SomaClient";

export default async function SomaPage() {
  const [data, tensions, basins, snapshots] = await Promise.allSettled([
    fetchSomaStates(),
    fetchTensions(undefined, 20),
    fetchBasinHistory(undefined, 10),
    fetchSomaticSnapshots(undefined, 6),
  ]);

  return (
    <SomaClient
      initialData={data.status === "fulfilled" ? data.value : null}
      tensions={tensions.status === "fulfilled" ? (tensions.value as CompanionTension[]) : []}
      basins={basins.status === "fulfilled" ? (basins.value as BasinHistory[]) : []}
      snapshots={snapshots.status === "fulfilled" ? (snapshots.value as SomaticSnapshot[]) : []}
    />
  );
}
