import { type BridgeData } from "@/lib/halseth";
import { SharedGoalsClient, SharedListsClient, BridgeStatusClient } from "./client";

export const revalidate = 30;

async function fetchBridge(): Promise<BridgeData | null> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/bridge`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function SharedEvents({ events }: { events: BridgeData["events"] }) {
  if (events.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Upcoming Together</div>
        <p className="empty">No shared events.</p>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-title">Upcoming Together</div>
      <div className="task-list">
        {events.map((e) => (
          <div key={e.id} className="task-row">
            <span className="task-title">{e.title}</span>
            <span className="task-due">{formatTime(e.start_time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function UsPage() {
  const bridge = await fetchBridge();

  if (!bridge) {
    return (
      <main className="page">
        <header className="header">
          <div className="header-top"><h1>Us</h1></div>
        </header>
        <div className="error-card">
          <strong>Bridge data unavailable</strong>
          <p style={{ marginTop: "0.4rem", fontSize: "0.88rem" }}>
            Could not reach partner bridge. Check HALSETH_URL.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="header">
        <div className="header-top"><h1>Us</h1></div>
      </header>
      <SharedGoalsClient tasks={bridge.tasks} />
      <SharedEvents events={bridge.events} />
      <SharedListsClient lists={bridge.lists} />
      <BridgeStatusClient sharing={bridge.sharing} />
    </main>
  );
}
