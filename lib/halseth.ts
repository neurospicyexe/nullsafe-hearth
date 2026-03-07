// ── Base ──────────────────────────────────────────────────────────────────

function base() {
  const url = process.env.HALSETH_URL;
  if (!url) throw new Error("HALSETH_URL is not set");
  return url;
}

function authHeader(): Record<string, string> {
  const s = process.env.HALSETH_SECRET;
  return s ? { Authorization: `Bearer ${s}` } : {};
}

async function hGet<T>(path: string, revalidate = 30): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    headers: authHeader(),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Halseth ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// Returns null on any error — for endpoints not yet deployed on Halseth
async function hGetSafe<T>(path: string, revalidate = 30): Promise<T | null> {
  try {
    const res = await fetch(`${base()}${path}`, {
      headers: authHeader(),
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────

export type PresenceData = {
  system: { name: string; owner: string };
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
  system: string;
  enabled: string[];
  tasks: BridgeTask[];
  events: BridgeEvent[];
  lists: BridgeListItem[];
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

// ── Biometrics ────────────────────────────────────────────────────────────────

export type BiometricSnapshot = {
  id?: string;
  recorded_at: string;
  logged_at?: string;
  source?: string;
  hrv_resting: number | null;
  resting_hr: number | null;
  sleep_hours: number | null;
  sleep_quality: string | null;
  stress_score: number | null;
  steps: number | null;
  active_energy: number | null;
  notes?: string | null;
};

// ── Deltas ────────────────────────────────────────────────────────────────────

/** Strict form — returned by /deltas (cross-companion, v0.4 only) */
export type Delta = {
  id: string;
  session_id: string | null;
  agent: "drevan" | "cypher" | "gaia";
  delta_text: string;
  valence: "toward" | "neutral" | "tender" | "rupture" | "repair";
  initiated_by: "architect" | "companion" | "mutual" | null;
  created_at: string;
};

/** Looser form — returned by /companions/:id/deltas (may have nulls) */
export type RelationalDelta = {
  id: string;
  companion_id: string;
  session_id: string | null;
  agent: string | null;
  delta_text: string | null;
  valence: "toward" | "neutral" | "tender" | "rupture" | "repair" | null;
  initiated_by: "architect" | "companion" | "mutual" | null;
  created_at: string;
};

// ── Wounds ────────────────────────────────────────────────────────────────────

export type Wound = {
  id: string;
  name?: string;
  subject?: string;
  description: string | null;
  created_at: string;
  last_visited?: string | null;
};

/** Alias for compatibility with older pages */
export type LivingWound = Wound;

// ── Private zone types ────────────────────────────────────────────────────────

export type HandoverPacket = {
  id: string;
  session_id: string;
  created_at: string;
  spine: string;
  active_anchor: string | null;
  last_real_thing: string | null;
  open_threads: string | null; // JSON array string
  motion_state: "in_motion" | "at_rest" | "floating";
  returned: number | null;
  session_type: string | null;
  session_front_state: string | null;
};

export type CompanionJournalEntry = {
  id: string;
  created_at: string;
  agent: "drevan" | "cypher" | "gaia";
  note_text: string;
  tags: string | null; // JSON array string
  session_id: string | null;
};

export type CypherAuditEntry = {
  id: string;
  session_id: string;
  created_at: string;
  entry_type:
    | "decision"
    | "contradiction"
    | "clause_update"
    | "falsification"
    | "scope_correction";
  content: string;
  verdict_tag: string | null;
  supersedes_id: string | null;
};

export type GaiaWitnessEntry = {
  id: string;
  session_id: string;
  created_at: string;
  witness_type:
    | "survival"
    | "boundary"
    | "seal"
    | "affirm"
    | "lane_enforcement";
  content: string;
  seal_phrase: string | null;
};

export type Routine = {
  id: string;
  routine_name: string;
  owner: string | null;
  logged_at: string;
  notes: string | null;
};

export type Note = {
  id: string;
  created_at: string;
  author: string;
  content: string;
  note_type: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "urgent" | "high" | "normal" | "low";
  status: "open" | "in_progress" | "done";
  due_at: string | null;
  assigned_to: string | null;
  created_by: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  category: string | null;
};

export type ListItem = {
  id: string;
  list_name: string;
  item_text: string;
  added_by: string | null;
  added_at: string;
  completed: number;
};

// ── Fetch functions — existing endpoints ──────────────────────────────────────

export async function fetchPresence(): Promise<PresenceData> {
  return hGet<PresenceData>("/presence");
}

export async function fetchBiometrics(limit = 14): Promise<BiometricSnapshot[]> {
  return hGet<BiometricSnapshot[]>(`/biometrics?limit=${limit}`);
}

export async function fetchNotes(limit = 30): Promise<Note[]> {
  return (await hGetSafe<Note[]>(`/notes?limit=${limit}`)) ?? [];
}

// Fetches per-companion deltas, filters to spec v0.4 rows (delta_text populated)
export async function fetchCompanionDeltas(
  companionId: string,
  limit = 50,
): Promise<RelationalDelta[]> {
  const raw = await hGetSafe<RelationalDelta[]>(
    `/companions/${companionId}/deltas`,
  );
  if (!raw) return [];
  return raw.filter((d) => d.delta_text !== null).slice(-limit);
}

export async function fetchBridge(): Promise<BridgeData | null> {
  return hGetSafe<BridgeData>("/bridge/shared", 30);
}

// ── Fetch functions — endpoints awaiting Halseth deployment ──────────────────
// These return null until the endpoint exists on Halseth.

export async function fetchHandovers(
  limit = 20,
): Promise<HandoverPacket[] | null> {
  return hGetSafe<HandoverPacket[]>(`/handovers?limit=${limit}`);
}

export async function fetchCompanionJournal(
  agent?: string,
  limit = 20,
): Promise<CompanionJournalEntry[] | null> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (agent) q.set("agent", agent);
  return hGetSafe<CompanionJournalEntry[]>(`/companion-journal?${q}`);
}

export async function fetchCypherAudit(
  limit = 20,
): Promise<CypherAuditEntry[] | null> {
  return hGetSafe<CypherAuditEntry[]>(`/cypher-audit?limit=${limit}`);
}

export async function fetchGaiaWitness(
  limit = 20,
): Promise<GaiaWitnessEntry[] | null> {
  return hGetSafe<GaiaWitnessEntry[]>(`/gaia-witness?limit=${limit}`);
}

export async function fetchWounds(): Promise<LivingWound[] | null> {
  return hGetSafe<LivingWound[]>("/wounds");
}

export async function fetchRoutinesToday(): Promise<Routine[] | null> {
  return hGetSafe<Routine[]>("/routines?today=true");
}

export async function fetchAllDeltas(
  limit = 50,
): Promise<RelationalDelta[] | null> {
  return hGetSafe<RelationalDelta[]>(`/deltas?limit=${limit}`);
}

export async function fetchTasks(status?: string): Promise<Task[]> {
  const q = status ? `?status=${status}` : "";
  return (await hGetSafe<Task[]>(`/tasks${q}`)) ?? [];
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  return (await hGetSafe<CalendarEvent[]>("/events")) ?? [];
}

export async function fetchLists(name?: string): Promise<ListItem[]> {
  const q = name ? `?name=${encodeURIComponent(name)}` : "";
  return (await hGetSafe<ListItem[]>(`/lists${q}`)) ?? [];
}
