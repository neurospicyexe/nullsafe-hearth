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
