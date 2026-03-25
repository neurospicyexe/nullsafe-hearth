export const dynamic = "force-dynamic";

import { fetchSomaStates } from "@/lib/halseth";
import SomaClient from "./SomaClient";

export default async function SomaPage() {
  const data = await fetchSomaStates();
  return <SomaClient initialData={data} />;
}
