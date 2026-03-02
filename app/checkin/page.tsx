import BiometricCard from "@/components/BiometricCard";
import { type BiometricSnapshot } from "@/lib/halseth";
import { UplinkFormClient, RoutineStatusClient } from "./client";

export const revalidate = 0; // always fresh

async function fetchBiometrics(): Promise<BiometricSnapshot | null> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/biometrics`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    // /biometrics returns array — take the most recent entry
    return Array.isArray(data) ? (data[0] ?? null) : data;
  } catch {
    return null;
  }
}

async function fetchTodayRoutines(): Promise<Array<{ routine_name: string }>> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return [];
  try {
    const res = await fetch(`${base}/routines`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function CheckinPage() {
  const [biometrics, routines] = await Promise.all([
    fetchBiometrics(),
    fetchTodayRoutines(),
  ]);

  return (
    <main className="page">
      <header className="header">
        <div className="header-top"><h1>Check-in</h1></div>
      </header>
      <UplinkFormClient />
      <RoutineStatusClient initialRoutines={routines} />
      {biometrics && <BiometricCard biometrics={biometrics} />}
    </main>
  );
}
