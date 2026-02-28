export type PresenceData = {
  system: {
    name: string;
    owner: string;
  };
  session: {
    id: string;
    front_state: string | null;
    active_anchor: string | null;
    facet: string | null;
    depth: number | null;
    hrv_range: "low" | "mid" | "high" | null;
    emotional_frequency: string | null;
    created_at: string;
    open: true;
  } | null;
  last_handover: {
    id: string;
    active_anchor: string | null;
    motion_state: "in_motion" | "at_rest" | "floating";
    created_at: string;
  } | null;
  companions: Array<{
    id: string;
    display_name: string;
    role: string;
  }>;
};

export async function fetchPresence(): Promise<PresenceData> {
  const base = process.env.HALSETH_URL;
  if (!base) throw new Error("HALSETH_URL is not set");

  const res = await fetch(`${base}/presence`, {
    // Revalidate every 30 seconds so the dashboard stays fresh.
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error(`Halseth /presence returned ${res.status}`);
  return res.json() as Promise<PresenceData>;
}
