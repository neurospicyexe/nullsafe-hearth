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
    session_type: "checkin" | "hangout" | "work" | "ritual" | null;
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

// ── Companion Notes ───────────────────────────────────────────────────────────

export type CompanionNote = {
  id: string;
  created_at: string;
  agent: "drevan" | "cypher" | "gaia";
  note_text: string;
  tags: string[] | null;
  session_id: string | null;
};

// ── Bridge (partner data) ─────────────────────────────────────────────────────

export type BridgeTask = {
  id: string;
  title: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_progress" | "done";
  due_at: string | null;
};

export type BridgeEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  description: string | null;
};

export type BridgeListItem = {
  id: string;
  list_name: string;
  item_text: string;
  completed: boolean;
};

export type BridgeData = {
  tasks: BridgeTask[];
  events: BridgeEvent[];
  lists: BridgeListItem[];
  sharing: {
    tasks: boolean;
    events: boolean;
    lists: boolean;
  };
};

// ── Mind (knowledge graph) ────────────────────────────────────────────────────

export type MindHealth = {
  entities: number;
  observations: number;
  relations: number;
  journals: number;
  salience: Record<string, number>;
};

export type MindJournalEntry = {
  id: string;
  entry: string;
  tags: string[];
  created_at: string;
};

export type MindData = {
  health: MindHealth;
  patterns: { themes: string[]; temporal: string } | null;
  recent_journals: MindJournalEntry[];
};

// ── Biometrics (standalone) ───────────────────────────────────────────────────

export type BiometricSnapshot = {
  hrv_resting: number | null;
  resting_hr: number | null;
  sleep_hours: number | null;
  sleep_quality: string | null;
  steps: number | null;
  active_energy: number | null;
  stress_score: number | null;
  recorded_at: string;
};

// ── Deltas ────────────────────────────────────────────────────────────────────

export type Delta = {
  id: string;
  session_id: string | null;
  agent: "drevan" | "cypher" | "gaia";
  delta_text: string;
  valence: "toward" | "neutral" | "tender" | "rupture" | "repair";
  initiated_by: "architect" | "companion" | "mutual" | null;
  created_at: string;
};

// ── Wounds ────────────────────────────────────────────────────────────────────

export type Wound = {
  id: string;
  subject: string;
  description: string | null;
  created_at: string;
};

export async function fetchPresence(): Promise<PresenceData | null> {
  const base = process.env.HALSETH_URL;
  if (!base) return null;

  const res = await fetch(`${base}/presence`, {
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error(`Halseth /presence returned ${res.status}`);
  return res.json() as Promise<PresenceData>;
}
