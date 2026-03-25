export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchCypherAudit } from "@/lib/halseth";
import { CypherAuditSection } from "../sections";

export function generateStaticParams() {
  return [{ id: "cypher" }];
}

export default async function CompanionAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = rawId.toLowerCase();
  if (id !== "cypher") notFound();

  const auditEntries = await fetchCypherAudit(200);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/companions/cypher" className="home-section-link">
          ← Cypher
        </Link>
      </div>
      <h1 style={{ marginBottom: "1.5rem" }}>Cypher · Audit Log</h1>
      <CypherAuditSection entries={auditEntries ?? []} />
    </div>
  );
}
