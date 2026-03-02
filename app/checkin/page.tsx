import { fetchPresence } from "@/lib/halseth";
import { UplinkFormClient, RoutineChecklistClient } from "./client";

export const revalidate = 0;

async function fetchRoutinesCompleted(): Promise<string[]> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return [];

  try {
    const res = await fetch(`${base}/routines`, {
      headers: { ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Expecting array of { routine_name, ... } for today
    if (Array.isArray(data)) {
      return data.map((r: { routine_name: string }) => r.routine_name);
    }
    return [];
  } catch {
    return [];
  }
}

export default async function CheckinPage() {
  const [presence, completedRoutines] = await Promise.all([
    fetchPresence().catch(() => null),
    fetchRoutinesCompleted(),
  ]);

  const spoons = presence?.house.spoon_count ?? 5;

  return (
    <main className="page">
      <header className="header">
        <div className="header-top">
          <h1>Check-in</h1>
          <span className="system-owner">uplink</span>
        </div>
      </header>

      {/* Spoon uplink + mood note */}
      <div className="card">
        <div className="card-title">Uplink</div>
        <UplinkFormClient initialSpoons={spoons} />
      </div>

      {/* Daily routines */}
      <RoutineChecklistClient completedToday={completedRoutines} />
    </main>
  );
}
