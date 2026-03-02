import type { BridgeData } from "@/lib/halseth";
import UsClient from "./client";

export const revalidate = 30;

async function fetchBridge(): Promise<BridgeData> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) throw new Error("HALSETH_URL not set");

  const res = await fetch(`${base}/bridge`, {
    headers: { ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error(`Halseth /bridge returned ${res.status}`);
  return res.json();
}

export default async function UsPage() {
  let data: BridgeData | null = null;
  let error: string | null = null;

  try {
    data = await fetchBridge();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load";
  }

  return (
    <main className="page">
      <header className="header">
        <div className="header-top">
          <h1>Us</h1>
          <span className="system-owner">bridge</span>
        </div>
      </header>

      {error || !data ? (
        <div className="error-card">
          <strong>Could not load bridge data</strong>
          <p style={{ marginTop: "0.4rem", fontSize: "0.88rem" }}>{error}</p>
        </div>
      ) : (
        <UsClient initial={data} />
      )}
    </main>
  );
}
