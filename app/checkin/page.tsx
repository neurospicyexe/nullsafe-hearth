import Link from "next/link";
import BiometricCard from "@/components/BiometricCard";
import BiometricForm from "@/components/BiometricForm";
import UplinkForm from "@/components/UplinkForm";
import { type BiometricSnapshot } from "@/lib/halseth";
import { RoutineStatusClient } from "./client";

export const dynamic = 'force-dynamic';

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
    <>
      <div className="page-header" style={{ marginBottom: "3rem" }}>
        <h1 className="page-title">Check-in</h1>
        <p className="page-subtitle">daily state — meds, pain, mood, spoons, routines</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", maxWidth: "640px" }}>
        <RoutineStatusClient initialRoutines={routines} />

        <div>
          <h2 className="section-title">Uplink</h2>
          <UplinkForm />
          <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--muted)", display: "flex", justifyContent: "flex-end" }}>
            <Link href="/user" style={{ color: "var(--accent)", textDecoration: "none" }}>
              biometric history →
            </Link>
          </div>
        </div>

        <div>
          <h2 className="section-title">Biometrics</h2>
          <BiometricForm />
        </div>

        {biometrics && <BiometricCard biometrics={biometrics} />}
      </div>
    </>
  );
}
