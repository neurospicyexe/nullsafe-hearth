import Link from "next/link";
import BiometricCard from "@/components/BiometricCard";
import StateLogger from "@/components/StateLogger";
import { fetchRoutinesToday, localDay, type BiometricSnapshot } from "@/lib/halseth";

export const dynamic = 'force-dynamic';

function isToday(iso: string): boolean {
  return localDay(iso) === localDay(new Date());
}

async function fetchBiometrics(): Promise<BiometricSnapshot[]> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return [];
  try {
    const res = await fetch(`${base}/biometrics?limit=20`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchTodayRoutines(): Promise<Array<{ routine_name: string; logged_at: string; notes: string | null }>> {
  // Worker returns today's rows oldest-first; the logger shows newest-first.
  const rows = (await fetchRoutinesToday()) ?? [];
  return rows.slice().reverse();
}

export default async function CheckinPage() {
  const [biometrics, routines] = await Promise.all([
    fetchBiometrics(),
    fetchTodayRoutines(),
  ]);

  const latest = biometrics[0] ?? null;
  const todaySnapshots = biometrics.filter((b) => isToday(b.recorded_at));

  return (
    <>
      <div className="page-header" style={{ marginBottom: "3rem" }}>
        <h1 className="page-title">Check-in</h1>
        <p className="page-subtitle">one place — events (meds, water…) and state, logged as many times as the day needs</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", maxWidth: "640px" }}>
        <StateLogger todayRoutines={routines} todaySnapshots={todaySnapshots} />

        <div style={{ fontSize: "0.85rem", color: "var(--muted)", display: "flex", justifyContent: "flex-end" }}>
          <Link href="/user" style={{ color: "var(--accent)", textDecoration: "none" }}>
            biometric history →
          </Link>
        </div>

        {latest && <BiometricCard biometrics={latest} />}
      </div>
    </>
  );
}
