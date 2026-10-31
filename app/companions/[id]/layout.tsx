import { notFound } from "next/navigation";
import { parseCompanionId } from "@/lib/companion-page";
import CompanionSubnav from "./CompanionSubnav";

// Lowercases + validates the id once for every /companions/<id>/** route, so no page under it
// ever renders (or calls Halseth) for anything but drevan, cypher or gaia.
export default async function CompanionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseCompanionId(rawId);
  if (!id) notFound();
  return (
    <>
      <CompanionSubnav id={id} />
      {children}
    </>
  );
}
