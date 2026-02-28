export type PresenceData = {
  system: {
    name: string;
    owner: string;
  };
  house: {
    current_room: string | null;
    companion_mood: string | null;
    companion_activity: string | null;
    spoon_count: number;
    love_meter: number;
    updated_at: string;
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
    spine: string;
    last_real_thing: string | null;
    open_threads: string[];
    active_anchor: string | null;
    motion_state: "in_motion" | "at_rest" | "floating";
    created_at: string;
  } | null;
  tasks: Array<{
    id: string;
    title: string;
    priority: "low" | "normal" | "high" | "urgent";
    status: string;
    due_at: string | null;
    assigned_to: string | null;
  }>;
  wounds_count: number;
  recent_notes: Array<{
    id: string;
    author: string;
    content: string;
    note_type: string;
    created_at: string;
  }>;
  recent_dreams: Array<{
    id: string;
    content: string;
    created_at: string;
  }>;
  latest_biometrics: {
    hrv_resting: number | null;
    resting_hr: number | null;
    sleep_hours: number | null;
    sleep_quality: string | null;
    steps: number | null;
    active_energy: number | null;
    stress_score: number | null;
    recorded_at: string;
  } | null;
  personality: {
    valence: Record<string, number>;
    initiated_by: Record<string, number>;
    total_deltas: number;
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
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error(`Halseth /presence returned ${res.status}`);
  return res.json() as Promise<PresenceData>;
}
