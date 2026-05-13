// ── Constants ─────────────────────────────────────────────────────────────

// H10: lifted from hardcoded `/3` literals in app/page.tsx, app/user/page.tsx,
// app/wellness/page.tsx. Mirrors Brain Config.MAX_SWARM_DEPTH; keep in sync.
export const MAX_SESSION_DEPTH = 3;

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

function fetchWithTimeout(url: string, options: RequestInit, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// H1: cache: 'no-store'. Halseth state is live (sessions, SOMA, growth);
// any revalidate window leaks stale companion mind-shape into the dashboard.
// Banned pattern from prod incident; CLAUDE.md mandates force-dynamic + no-store.
async function hGet<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${base()}${path}`, {
    headers: authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Halseth ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// Returns null on any error — for endpoints not yet deployed on Halseth
async function hGetSafe<T>(path: string): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(`${base()}${path}`, {
      headers: authHeader(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function hPost<T>(path: string, body: unknown): Promise<T | null> {
  const url = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!url || !secret) return null;
  try {
    const res = await fetchWithTimeout(`${url}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
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
    autonomous_turn: "drevan" | "cypher" | "gaia" | null;
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
    facet: string | null;
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
    companion_id: string;
    content: string;
    created_at: string;
  }>;
  recent_companion_notes?: Array<{
    id: string;
    agent: string;
    note_text: string;
    tags: string[];
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
  companion_moods: Record<string, { emotion: string; intensity: number; at: string }> | null;
  companions: Array<{
    id: string;
    display_name: string;
    role: string;
    avatar_url: string | null;
  }>;
  recent_growth?: Array<{
    companion_id: string;
    content: string;
    entry_type: string;
    created_at: string;
  }>;
  active_patterns?: Array<{
    companion_id: string;
    pattern_text: string;
    strength: number;
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
  facet: string | null;
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
  return raw.filter((d) => d.delta_text !== null).slice(-limit).reverse();
}

export async function fetchBridge(): Promise<BridgeData | null> {
  return hGetSafe<BridgeData>("/bridge/shared");
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

export type Dream = {
  id: string;
  companion_id: "drevan" | "cypher" | "gaia";
  dream_type: "processing" | "questioning" | "memory" | "play" | "integrating";
  content: string;
  generated_at: string;
  session_id: string | null;
};

export type DreamSeed = {
  id: string;
  created_at: string;
  content: string;
  for_companion: "drevan" | "cypher" | "gaia" | null;
  claimed_at: string | null;
  claimed_by: string | null;
};

export async function fetchCompanionNotesByAgent(
  agent: string,
  limit = 50,
): Promise<CompanionNote[]> {
  return (
    (await hGetSafe<CompanionNote[]>(`/companion-notes?agent=${agent}&limit=${limit}`)) ?? []
  );
}

export async function fetchAllCompanionNotes(limit = 50): Promise<CompanionNote[]> {
  return (await hGetSafe<CompanionNote[]>(`/companion-notes?limit=${limit}`)) ?? [];
}

export type MindHandoff = {
  id: string;
  agent_id: string;
  title: string | null;
  summary: string | null;
  next_steps: string | null;
  open_loops: string | null;
  state_hint: string | null;
  created_at: string;
};

export async function fetchMindHandoffs(limit = 30): Promise<MindHandoff[]> {
  return (await hGetSafe<MindHandoff[]>(`/ingest/mind-handoffs?limit=${limit}`)) ?? [];
}

export async function fetchInterCompanionNotes(limit = 30): Promise<InterCompanionNote[]> {
  return (await hGetSafe<InterCompanionNote[]>(`/ingest/inter-companion-notes?limit=${limit}`)) ?? [];
}

export async function fetchDreams(companionId?: string, limit = 20): Promise<Dream[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (companionId) q.set("companion_id", companionId);
  return (await hGetSafe<Dream[]>(`/dreams?${q}`)) ?? [];
}

export async function fetchDreamSeeds(): Promise<DreamSeed[]> {
  return (await hGetSafe<DreamSeed[]>("/dream-seeds")) ?? [];
}

// ── Human Journal ─────────────────────────────────────────────────────────────

export type HumanJournalEntry = {
  id: string;
  created_at: string;
  entry_text: string;
  emotion_tag: string | null;
  sub_emotion: string | null;
  mood_score: number | null;
  tags: string | null; // JSON array string
};

export async function fetchHumanJournal(limit = 50): Promise<HumanJournalEntry[]> {
  return (await hGetSafe<HumanJournalEntry[]>(`/journal?limit=${limit}`)) ?? [];
}

// ── SOMA Feelings ─────────────────────────────────────────────────────────────

export type SomaFeeling = {
  id: string;
  companion_id: string;
  session_id: string | null;
  emotion: string;
  sub_emotion: string | null;
  intensity: number; // 0-100
  source: string | null;
  created_at: string;
};

export async function fetchSomaFeelings(
  companionId?: string,
  limit = 50,
): Promise<SomaFeeling[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (companionId) q.set("companion_id", companionId);
  return (await hGetSafe<SomaFeeling[]>(`/feelings?${q}`)) ?? [];
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export type SessionEntry = {
  id: string;
  created_at: string;
  updated_at: string | null;
  companion_id: string | null;
  session_type: string | null;
  spine: string | null;
  last_real_thing: string | null;
  motion_state: string | null;
  front_state: string | null;
  co_con: string | null;
  emotional_frequency: string | null;
  active_anchor: string | null;
  facet: string | null;
  hrv_range: "low" | "mid" | "high" | null;
  depth: number | null;
  notes: string | null;
};

export async function fetchSessions(days = 30, limit = 100): Promise<SessionEntry[]> {
  return (
    (await hGetSafe<SessionEntry[]>(`/sessions?days=${days}&limit=${limit}`)) ?? []
  );
}

// ── Companion Blocks ──────────────────────────────────────────────────────────

export type CompanionBlock = {
  id: string;
  channel_id: string | null;
  block_type: string;
  content: string;
  created_at: string;
};

export async function fetchPersonaBlocks(
  companionId: string,
  limit = 20,
): Promise<CompanionBlock[]> {
  const data = await hGetSafe<{ blocks: CompanionBlock[] }>(
    `/persona-blocks?companion_id=${encodeURIComponent(companionId)}&limit=${limit}`,
  );
  return data?.blocks ?? [];
}

// ── SOMA State ────────────────────────────────────────────────────────────────

export type CompanionSomaState = {
  companion_id: string;
  soma_float_1: number | null;
  soma_float_2: number | null;
  soma_float_3: number | null;
  float_1_label: string | null;
  float_2_label: string | null;
  float_3_label: string | null;
  compound_state: string | null;
  current_mood: string | null;
  surface_emotion: string | null;
  surface_intensity: number | null;
  undercurrent_emotion: string | null;
  undercurrent_intensity: number | null;
  heat: string | null;
  reach: string | null;
  weight: string | null;
  updated_at: string;
} | null;

export type SomaData = {
  drevan: CompanionSomaState;
  cypher: CompanionSomaState;
  gaia: CompanionSomaState;
  fetched_at: string;
};

export async function fetchSomaStates(): Promise<SomaData | null> {
  return hGetSafe<SomaData>("/soma");
}

export async function fetchHumanBlocks(
  companionId: string,
  limit = 20,
): Promise<CompanionBlock[]> {
  const data = await hGetSafe<{ blocks: CompanionBlock[] }>(
    `/human-blocks?companion_id=${encodeURIComponent(companionId)}&limit=${limit}`,
  );
  return data?.blocks ?? [];
}

// ── WebMind Continuity ────────────────────────────────────────────────────────

export type WmSessionHandoff = {
  handoff_id: string;
  title: string;
  summary: string;
  next_steps: string | null;
  open_loops: string | null;
  state_hint: string | null;
  created_at: string;
};

export type WmMindThread = {
  thread_key: string;
  title: string;
  status: string;
  priority: number;
  lane: string | null;
  context: string | null;
  last_touched_at: string;
};

export type WmContinuityNote = {
  note_id: string;
  content: string;
  salience: string;
  thread_key: string | null;
  note_type: string;
  created_at: string;
};

export type WmOrientData = {
  latest_handoff: WmSessionHandoff | null;
  open_thread_count: number;
  top_threads: WmMindThread[];
  recent_notes: WmContinuityNote[];
};

export async function fetchWmOrient(agentId: string): Promise<WmOrientData | null> {
  return hGetSafe<WmOrientData>(`/mind/orient/${encodeURIComponent(agentId)}`);
}

// ── Synthesis Summaries ───────────────────────────────────────────────────────

export type SynthesisSummary = {
  id: string;
  companion_id: string | null;
  summary_type: string;
  subject: string | null;
  narrative: string | null;
  emotional_register: string | null;
  open_threads: string | null;
  created_at: string;
};

export async function fetchSynthesisSummaries(limit = 20): Promise<SynthesisSummary[]> {
  return (await hGetSafe<SynthesisSummary[]>(`/ingest/synthesis-summaries?limit=${limit}`)) ?? [];
}

// ── Inter-Companion Notes ─────────────────────────────────────────────────────

export type InterCompanionNote = {
  id: string;
  from_id: string;
  to_id: string | null;
  content: string;
  read_at: string | null;
  created_at: string;
};

// ── WebMind: Open Loops ───────────────────────────────────────────────────────

export type OpenLoop = {
  id: string;
  companion_id: "drevan" | "cypher" | "gaia";
  loop_text: string;
  weight: number;
  opened_at: string;
  closed_at: string | null;
};

export async function fetchLoops(agentId: string, includeClosed = false): Promise<OpenLoop[]> {
  const q = includeClosed ? "?include_closed=true" : "";
  const res = await hGetSafe<{ loops: OpenLoop[] }>(`/mind/loops/${agentId}${q}`);
  return res?.loops ?? [];
}

// ── WebMind: Sitting Notes ────────────────────────────────────────────────────

export type SittingNote = {
  note_id: string;
  content: string;
  note_type: string;
  created_at: string;
  sit_text: string | null;
  sat_at: string;
};

export async function fetchSittingNotes(agentId: string): Promise<SittingNote[]> {
  const res = await hGetSafe<{ notes: SittingNote[] }>(`/mind/sitting/${agentId}`);
  return res?.notes ?? [];
}

// ── WebMind: Relational State ─────────────────────────────────────────────────

export type RelationalState = {
  id: string;
  companion_id: "drevan" | "cypher" | "gaia";
  toward: string;
  state_text: string;
  weight: number;
  state_type: "feeling" | "witness" | "held";
  noted_at: string;
};

export async function fetchRelationalHistory(agentId: string, limit = 30): Promise<RelationalState[]> {
  const res = await hGetSafe<{ states: RelationalState[] }>(`/mind/relational/${agentId}?limit=${limit}`);
  return res?.states ?? [];
}

// ── WebMind: Dreams ───────────────────────────────────────────────────────────

export type WmDream = {
  id: string;
  companion_id: string;
  dream_text: string;
  dream_type: string | null;
  created_at: string;
  examined_at: string | null;
  do_not_auto_examine: number;
};

export async function fetchMindDreams(agentId: string, limit = 5): Promise<WmDream[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  const res = await hGetSafe<{ dreams: WmDream[] }>(`/mind/dreams/${encodeURIComponent(agentId)}?${q}`);
  return res?.dreams ?? [];
}

export async function examineCompanionDream(
  agentId: string,
  dreamId: string,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const r = await hPost<{ ok: boolean; reason?: string }>(
      `/mind/dream/${encodeURIComponent(dreamId)}/examine`,
      { companion_id: agentId },
    );
    return r ?? { ok: false, reason: "no_response" };
  } catch {
    return { ok: false, reason: "request_failed" };
  }
}

export async function pinCompanionDream(
  agentId: string,
  dreamId: string,
  pinned: boolean,
): Promise<{ ok: boolean }> {
  try {
    const r = await hPost<{ ok: boolean }>(
      `/mind/dream/${encodeURIComponent(dreamId)}/pin`,
      { companion_id: agentId, do_not_auto_examine: pinned ? 1 : 0 },
    );
    return r ?? { ok: false };
  } catch {
    return { ok: false };
  }
}

export interface CompanionOrientForChat {
  anchor_summary: string;
  constraints_summary: string;
  emotional_register: string | null;
  drift_vector: string | null;
  active_tensions: string[];
  recent_notes_summary: string;
}

export async function fetchOrientForChat(agentId: string): Promise<CompanionOrientForChat | null> {
  const raw = await hGetSafe<{
    identity_anchor?: { anchor_summary?: string; constraints_summary?: string };
    limbic_state?: { emotional_register?: string; drift_vector?: string };
    active_tensions?: Array<{ tension_text: string }>;
    recent_notes?: Array<{ content: string }>;
  }>(`/mind/orient/${encodeURIComponent(agentId)}`);
  if (!raw) return null;
  return {
    anchor_summary: raw.identity_anchor?.anchor_summary ?? "",
    constraints_summary: raw.identity_anchor?.constraints_summary ?? "",
    emotional_register: raw.limbic_state?.emotional_register ?? null,
    drift_vector: raw.limbic_state?.drift_vector ?? null,
    active_tensions: (raw.active_tensions ?? []).map((t) => t.tension_text).slice(0, 3),
    recent_notes_summary: (raw.recent_notes ?? [])
      .slice(0, 5)
      .map((n) => n.content)
      .join("\n"),
  };
}

export async function fetchCompanionDreams(companionId?: string, limit = 30): Promise<WmDream[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (companionId) q.set("companion_id", companionId);
  return (await hGetSafe<WmDream[]>(`/ingest/companion-dreams?${q}`)) ?? [];
}

export type CompanionTension = {
  id: string;
  companion_id: string;
  tension_text: string;
  status: string;
  first_noted_at: string;
  last_surfaced_at: string | null;
  notes: string | null;
};

export async function fetchTensions(companionId?: string, limit = 20): Promise<CompanionTension[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (companionId) q.set("companion_id", companionId);
  // H9: defensive envelope unwrap. Halseth GET endpoints typically return
  // `{ key: [...] }` envelopes; if upstream wraps tensions in `{ tensions: [...] }`
  // a bare cast triggers `.map is not a function`. Accept both shapes.
  const raw = await hGetSafe<CompanionTension[] | { tensions?: CompanionTension[] }>(`/ingest/tensions?${q}`);
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.tensions ?? [];
}

export type SomaticSnapshot = {
  id: string;
  companion_id: string;
  snapshot: string;
  model_used: string;
  stale_after: string;
  created_at: string;
};

export async function fetchSomaticSnapshots(companionId?: string, limit = 10): Promise<SomaticSnapshot[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (companionId) q.set("companion_id", companionId);
  return (await hGetSafe<SomaticSnapshot[]>(`/ingest/somatic-snapshots?${q}`)) ?? [];
}

export type DriftEntry = {
  id: string;
  companion_id: string;
  signal_type: string;
  context: string | null;
  detected_at: string;
};

export async function fetchDriftLog(companionId?: string, limit = 20): Promise<DriftEntry[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (companionId) q.set("companion_id", companionId);
  return (await hGetSafe<DriftEntry[]>(`/ingest/drift-log?${q}`)) ?? [];
}

export type LiveThread = {
  id: string;
  companion_id: string;
  name: string;
  flavor: string | null;
  charge: string;
  status: string;
  active_since_count: number;
  notes: string | null;
  created_at: string;
  closed_at: string | null;
};

export async function fetchLiveThreads(companionId?: string, status = "active", limit = 20): Promise<LiveThread[]> {
  const q = new URLSearchParams({ limit: String(limit), status });
  if (companionId) q.set("companion_id", companionId);
  return (await hGetSafe<LiveThread[]>(`/ingest/live-threads?${q}`)) ?? [];
}

export type BasinHistory = {
  id: string;
  companion_id: string;
  drift_score: number;
  drift_type: string;
  caleth_confirmed: number;
  worst_basin: string | null;
  notes: string | null;
  recorded_at: string;
};

export async function fetchBasinHistory(companionId?: string, limit = 10): Promise<BasinHistory[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (companionId) q.set("companion_id", companionId);
  return (await hGetSafe<BasinHistory[]>(`/ingest/basin-history?${q}`)) ?? [];
}

// ── Growth (autonomous worker artifacts) ─────────────────────────────────────

export type GrowthJournalEntry = {
  id: string;
  companion_id: string;
  entry_type: "learning" | "insight" | "connection" | "question";
  content: string;
  source: "autonomous" | "conversation" | "reflection" | null;
  tags_json: string; // JSON-encoded string[], parse with JSON.parse
  run_id: string | null;
  created_at: string;
  review_status?: "pending" | "accepted" | "declined";
  reviewed_at?: string | null;
};

export type GrowthPattern = {
  id: string;
  companion_id: string;
  pattern_text: string;
  evidence_json: string; // JSON-encoded string[], parse with JSON.parse
  strength: number; // 1–10
  run_id: string | null;
  created_at: string;
  updated_at: string;
};

export type GrowthMarker = {
  id: string;
  companion_id: string;
  marker_type: "milestone" | "shift" | "realization";
  description: string;
  related_pattern_id: string | null;
  run_id: string | null;
  created_at: string;
};

// ── Autonomy (autonomous worker execution) ────────────────────────────────────

export type AutonomyRun = {
  id: string;
  companion_id: string;
  run_type: "exploration" | "reflection" | "synthesis";
  status: "pending" | "running" | "completed" | "failed";
  started_at: string | null;
  completed_at: string | null;
  tokens_used: number;
  artifacts_created: number;
  error_message: string | null;
  created_at: string;
};

export type AutonomySeed = {
  id: string;
  companion_id: string;
  seed_type: "topic" | "question" | "reflection_prompt";
  content: string;
  priority: number;
  claim_source: string | null;
  justification: string | null;
  used_at: string | null;
  created_at: string;
};

export type AutonomyThread = {
  id: string;
  title: string;
  status: "open" | "paused" | "resolved";
  last_position: number | null;
  last_run_at: string | null;
  last_entry_snippet: string | null;
};

export type AutonomyReflection = {
  id: string;
  run_id: string;
  companion_id: string;
  reflection_text: string;
  new_seeds_json: string | null; // JSON-encoded string[], parse with JSON.parse
  created_at: string;
};

// ── Phoenix WebMind ───────────────────────────────────────────────────────────

export type PhoenixHealth = {
  status: string;        // "ok"
  service: string;       // "webmind"
  version: string;
  db_configured: boolean;
};

// Matches MindOrientResponse from Phoenix contracts.py
export type PhoenixOrientState = {
  agent_id: string;
  top_threads: Array<{
    thread_id: string;
    title: string;
    status: string;
    lane: string | null;
  }>;
  recent_handoffs: Array<{
    handoff_id: string;
    title: string;
    next_steps: string | null;
    created_at: string;
  }>;
  recent_notes: Array<{
    note_id: string;
    note_text: string;
    thread_key: string | null;
    created_at: string;
  }>;
  generated_at: string;
};

// ── Phoenix helper ────────────────────────────────────────────────────────────

async function phoenixGet<T>(path: string): Promise<T | null> {
  const url = process.env.PHOENIX_WEBMIND_URL;
  if (!url) return null;
  try {
    const res = await fetchWithTimeout(`${url}${path}`, {
      cache: "no-store" as RequestCache,
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// ── Growth fetch functions ────────────────────────────────────────────────────

export async function fetchGrowthJournal(
  companionId: string,
  limit = 20,
): Promise<GrowthJournalEntry[]> {
  const res = await hGetSafe<{ journal: GrowthJournalEntry[] }>(
    `/mind/growth/journal/${companionId}?limit=${limit}`,
  );
  return res?.journal ?? [];
}

export async function fetchGrowthPatterns(
  companionId: string,
): Promise<GrowthPattern[]> {
  const res = await hGetSafe<{ patterns: GrowthPattern[] }>(
    `/mind/growth/patterns/${companionId}`,
  );
  return res?.patterns ?? [];
}

export async function fetchGrowthMarkers(
  companionId: string,
): Promise<GrowthMarker[]> {
  const res = await hGetSafe<{ markers: GrowthMarker[] }>(
    `/mind/growth/markers/${companionId}`,
  );
  return res?.markers ?? [];
}

// ── Autonomy fetch functions ──────────────────────────────────────────────────

export async function fetchAutonomyRuns(
  companionId: string,
  limit = 20,
): Promise<AutonomyRun[]> {
  const res = await hGetSafe<{ runs: AutonomyRun[] }>(
    `/mind/autonomy/runs/${companionId}?limit=${limit}`,
  );
  return res?.runs ?? [];
}

export async function fetchAutonomySeeds(
  companionId: string,
): Promise<AutonomySeed[]> {
  const res = await hGetSafe<{ seeds: AutonomySeed[] }>(
    `/mind/autonomy/seeds/${companionId}`,
  );
  return res?.seeds ?? [];
}

export async function fetchAutonomyThreads(
  companionId: string,
): Promise<AutonomyThread[]> {
  const res = await hGetSafe<{ threads: AutonomyThread[] }>(
    `/mind/autonomy/threads/${companionId}`,
  );
  return res?.threads ?? [];
}

export async function fetchAutonomyReflections(
  companionId: string,
  limit = 10,
): Promise<AutonomyReflection[]> {
  const res = await hGetSafe<{ reflections: AutonomyReflection[] }>(
    `/mind/autonomy/reflections/${companionId}?limit=${limit}`,
  );
  return res?.reflections ?? [];
}

// ── Phoenix fetch functions ───────────────────────────────────────────────────

export async function fetchPhoenixHealth(): Promise<PhoenixHealth | null> {
  return phoenixGet<PhoenixHealth>("/health");
}

export async function fetchPhoenixOrient(
  agentId: "drevan" | "cypher" | "gaia",
): Promise<PhoenixOrientState | null> {
  return phoenixGet<PhoenixOrientState>(`/mind/orient/${agentId}`);
}

// ── Worldview (companion conclusions) ────────────────────────────────────────

export type ConclusionRow = {
  id: string;
  companion_id: string;
  conclusion_text: string;
  source_sessions: string | null;
  superseded_by: string | null;
  created_at: string;
  edited_at: string | null;
  confidence: number;
  belief_type: string;
  subject: string | null;
  provenance: string | null;
  contradiction_flagged: number;
};

// Uses cache: "no-store" directly — conclusions are live state, never revalidate
export type SbSearchLog = {
  agent_id: string;
  entries: Array<{ query: string; hit_count: number; source: string; created_at: string }>;
  total: number;
  hits: number;
  hit_rate: number | null;
  last_query: string | null;
};

export async function fetchSbSearchLog(agentId: string): Promise<SbSearchLog | null> {
  return hGetSafe<SbSearchLog>(`/mind/sb-search-log/${agentId}`);
}

export type OrientDebug = {
  assembled_at: string;
  session_id: string;
  front_state: string;
  wm: {
    recent_notes: number;
    open_thread_count: number;
    active_tensions: number;
    active_conclusions: number;
    incoming_companion_notes: number;
    latest_handoff_summary: string | null;
  } | null;
  sb_rag: { query: string; hit_count: number };
  sb_narrative: "loaded" | "none";
  growth: { journal_entries: number; patterns: number; last_reflection: number; available_seeds: number };
};

export async function fetchOrientDebug(agentId: string): Promise<OrientDebug | null> {
  return hGetSafe<{ agent_id: string; debug: OrientDebug | null }>(`/mind/orient-debug/${agentId}`)
    .then(r => r?.debug ?? null);
}

// ── Metronome Actions ─────────────────────────────────────────────────────────

export type MetronomeAction = {
  id: string;
  companion_id: string;
  name: string;
  action_type: string;
  target: string | null;
  prompt: string | null;
  quiet_hours_allowed: number;
  status: "on" | "off";
  created_at: string;
  updated_at: string;
};

export async function fetchMetronomeActions(companionId: string): Promise<MetronomeAction[]> {
  const res = await hGetSafe<{ actions: MetronomeAction[] }>(
    `/mind/metronome/actions/${encodeURIComponent(companionId)}`,
  );
  return res?.actions ?? [];
}

export async function fetchConclusions(
  agentId: string,
): Promise<ConclusionRow[]> {
  const url = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!url || !secret) return [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${url}/companion-conclusions?agent_id=${agentId}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return [];
    const data = await res.json() as { conclusions?: ConclusionRow[] };
    return data?.conclusions ?? [];
  } catch {
    return [];
  }
}
