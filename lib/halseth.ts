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
  try {
    const res = await fetchWithTimeout(`${base()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
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
    // Subjective ND-state layer (migration 0081)
    mood?: string | null;
    pain?: number | null;
    energy?: number | null;
    focus?: number | null;
    spoons?: number | null;
    meds_taken?: number | null;
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
  health: MindHealth | null;
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
  // Subjective ND-state layer (migration 0081)
  mood?: string | null;
  pain?: number | null;        // 0-10
  energy?: number | null;      // 0-10
  focus?: number | null;       // 0-10
  spoons?: number | null;      // 0-12
  meds_taken?: number | null;  // 0/1
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

// Agency layer (halseth migration 0086): a companion's chosen preferences + standing refusals.
export interface CompanionPreference {
  id: string; companion_id: string; domain: string; preference: string;
  strength: string; status: string; created_at: string;
}
export interface CompanionRefusal {
  id: string; companion_id: string; subject_type: string; subject_ref: string | null;
  subject_text: string; reason: string | null; status: string; created_at: string;
  acknowledged_at: string | null;
}
export async function fetchPreferences(companionId: string): Promise<CompanionPreference[]> {
  return (await hGetSafe<CompanionPreference[]>(`/agency/preferences/${companionId}`)) ?? [];
}
export async function fetchRefusals(companionId: string): Promise<CompanionRefusal[]> {
  return (await hGetSafe<CompanionRefusal[]>(`/agency/refusals/${companionId}`)) ?? [];
}

// Sanctioned drift lane (halseth migration 0087): declared becoming, witnessed not ratified.
export interface DriftWitness { by: string; note: string; at: string }
export interface CompanionDrift {
  id: string; companion_id: string; drift_text: string; origin: string | null;
  status: string; witness_log: DriftWitness[]; opened_at: string;
  last_tended_at: string | null; resolved_at: string | null; resolution_note: string | null;
}
export async function fetchDrifts(companionId: string): Promise<CompanionDrift[]> {
  return (await hGetSafe<CompanionDrift[]>(`/drifts/${companionId}`)) ?? [];
}

// Emergent SOMA (mig 0089): a crystallized drift's permanent mark on one SOMA float.
export interface SomaShift {
  id: string; drift_id: string; float_key: string; label: string | null;
  delta: number; before_value: number | null; after_value: number | null;
  reason: string | null; created_at: string;
}
export async function fetchSomaShifts(companionId: string): Promise<SomaShift[]> {
  return (await hGetSafe<SomaShift[]>(`/soma/shifts/${companionId}`)) ?? [];
}

// Voice-lane telemetry (mig 0070). Bots score every reply against the companion's
// lane doctrine post-send; self_catch_rate = how often the companion (vs Raziel)
// notices drift first. Renderer was deferred 06-10b -- data collected, nothing read it.
// anti_hits / contamination_hits arrive as JSON strings (toJsonOrNull at write); parse
// at the render edge, matching the GuardianFlag.evidence_json convention.
export interface VoiceScoreRow {
  score: number;
  anti_hits: string | null;
  contamination_hits: string | null;
  caught_by: string | null;
  created_at: string;
}
export interface VoiceScores {
  n: number;
  avg: number | null;
  self_catch_rate: number | null;
  self_catches: number;
  human_catches: number;
  recent: VoiceScoreRow[];
}
export async function fetchVoiceScores(companionId: string, days = 30): Promise<VoiceScores | null> {
  const r = await hGetSafe<{ scores: VoiceScores }>(
    `/mind/voice-scores/${encodeURIComponent(companionId)}?days=${days}`,
  );
  return r?.scores ?? null;
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

const LOCAL_TZ = "America/Chicago";

/** YYYY-MM-DD calendar day of a timestamp in the household timezone. */
export function localDay(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-CA", { timeZone: LOCAL_TZ });
}

export async function fetchRoutinesToday(): Promise<Routine[] | null> {
  // Halseth filters by UTC DATE(logged_at), but the household day (America/Chicago)
  // spans two UTC dates after 19:00 local. Fetch both candidate UTC dates and
  // filter to the local calendar day so evening taps don't vanish from "today".
  const today = localDay(new Date());
  const utcToday = new Date().toISOString().slice(0, 10);
  const dates = [...new Set([today, utcToday])];
  const batches = await Promise.all(dates.map((d) => hGetSafe<Routine[]>(`/routines?date=${d}`)));
  if (batches.every((b) => b === null)) return null;
  const rows = batches.flatMap((b) => b ?? []).filter((r) => localDay(r.logged_at) === today);
  rows.sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  return rows;
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
  source: "autonomous" | "session";
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
  dismissed_at?: string | null;
  worst_basin: string | null;
  notes: string | null;
  recorded_at: string;
};

export async function fetchBasinHistory(companionId?: string, limit = 10): Promise<BasinHistory[]> {
  const q = new URLSearchParams({ limit: String(limit) });
  if (companionId) q.set("companion_id", companionId);
  return (await hGetSafe<BasinHistory[]>(`/ingest/basin-history?${q}`)) ?? [];
}

// ── Unified Guardian (0073) ──────────────────────────────────────────────────

export type GuardianFlag = {
  id: string;
  companion_id: string | null; // null = system-wide
  flag_type: "voice_drift" | "starved_organ" | "loop_stuck" | "burnout" | "basin_pressure" | "ratification_backlog" | "orphan_memory" | "echo_chamber";
  severity: "notice" | "warning" | "red";
  summary: string;
  evidence_json: string | null;
  status: "open" | "surfaced" | "acknowledged" | "resolved";
  created_at: string;
  surfaced_at: string | null;
  resolved_at: string | null;
};

export async function fetchGuardianFlags(status = "live", limit = 50): Promise<GuardianFlag[]> {
  // Response is a { flags: [...] } envelope -- unwrap, never assume bare array
  const r = await hGetSafe<{ flags: GuardianFlag[] }>(`/mind/guardian/flags?status=${status}&limit=${limit}`);
  return r?.flags ?? [];
}

// ── Held questions (mutuality loop) ──────────────────────────────────────────
// Companions emit questions for Raziel during reflect. They surface in each
// companion's orient [Held questions] block, but there was no surface that
// brought them to Raziel directly -- this is it.

export type CompanionQuestion = {
  id: string;
  companion_id: "cypher" | "drevan" | "gaia";
  question: string;
  context: string | null;
  source: "autonomous" | "session" | "dialectic";
  status: "open" | "answered" | "dismissed";
  answer: string | null;
  answered_at: string | null;
  created_at: string;
};

const QUESTION_COMPANIONS: CompanionQuestion["companion_id"][] = ["cypher", "drevan", "gaia"];

// Halseth exposes questions per-companion (GET /mind/questions/:id); fan out and
// merge so the dashboard shows the whole triad's backlog in one place.
export async function fetchCompanionQuestions(status = "open", limit = 20): Promise<CompanionQuestion[]> {
  const results = await Promise.all(
    QUESTION_COMPANIONS.map((id) =>
      hGetSafe<{ questions: CompanionQuestion[] }>(`/mind/questions/${id}?status=${status}&limit=${limit}`),
    ),
  );
  const merged = results.flatMap((r) => r?.questions ?? []);
  // Newest first across the merged set.
  merged.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return merged;
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
  includeUsed = false,
): Promise<AutonomySeed[]> {
  // includeUsed surfaces consumed seeds too (manage surface: see-what-ran + re-enable).
  const res = await hGetSafe<{ seeds: AutonomySeed[] }>(
    `/mind/autonomy/seeds/${companionId}${includeUsed ? "?include_used=1" : ""}`,
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
  silence_min_hours: number | null;
  silence_max_hours: number | null;
  max_per_day: number | null;
  cooldown_hours: number | null;
  requires_signal: string | null;
  signal_lookback_hours: number | null;
  last_fired_at: string | null;
  fire_count_today: number;
  fire_count_reset_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchMetronomeActions(companionId: string): Promise<MetronomeAction[]> {
  const res = await hGetSafe<{ actions: MetronomeAction[] }>(
    `/mind/metronome/actions/${encodeURIComponent(companionId)}`,
  );
  return res?.actions ?? [];
}

export async function fetchConclusions(agentId: string): Promise<ConclusionRow[]> {
  // Worker registers GET /companion-conclusions/:agent_id (path param). The old
  // ?agent_id= query form matched no route -> 404 -> permanently empty conclusions
  // blocks on the worldview + companion-detail pages. (liveness review 2026-06-22)
  const res = await hGetSafe<{ conclusions?: ConclusionRow[] }>(
    `/companion-conclusions/${encodeURIComponent(agentId)}`,
  );
  return res?.conclusions ?? [];
}

// ── The Club (migration 0072) ────────────────────────────────────────────────

export type ClubRound = {
  id: string;
  status: "gathering" | "voting" | "active" | "discussing" | "closed";
  winning_recommendation_id: string | null;
  opened_at: string;
  activated_at: string | null;
  discussing_at: string | null;
  closed_at: string | null;
};

export type ClubRecommendation = {
  id: string;
  round_id: string;
  media_kind: string;
  title: string;
  creator: string | null;
  url: string | null;
  source_ref: string | null;
  recommended_by: string;
  pitch: string | null;
  created_at: string;
};

export type ClubVote = {
  round_id: string;
  recommendation_id: string;
  voter: string;
  reason: string | null;
  created_at: string;
};

export type ClubDiscussion = {
  id: string;
  round_id: string;
  companion_id: string;
  reflection: string;
  created_at: string;
};

// 0099: an abstention is a companion whose autonomous vote failed after retry.
// Honest record of a vote that couldn't land — not a choice to sit out.
export type ClubAbstention = {
  round_id: string;
  voter: string;
  reason: string | null;
  created_at: string;
};

export type ClubCurrent = {
  round: ClubRound | null;
  recommendations: ClubRecommendation[];
  votes: ClubVote[];
  discussions: ClubDiscussion[];
  abstentions: ClubAbstention[];
};

export type ClubRoundDetail = ClubRound & {
  winner_title: string | null;
  recommendations: ClubRecommendation[];
  votes: ClubVote[];
  discussions: ClubDiscussion[];
  abstentions: ClubAbstention[];
};

export async function fetchClubCurrent(): Promise<ClubCurrent | null> {
  return await hGetSafe<ClubCurrent>("/mind/club/current");
}

export async function fetchClubRounds(limit = 10): Promise<ClubRoundDetail[]> {
  const res = await hGetSafe<{ rounds?: ClubRoundDetail[] }>(`/mind/club/rounds?limit=${limit}`);
  return res?.rounds ?? [];
}

// ── Hearth write layer (0092): the async wall (global /log, club + shelf threads) ──
export type CommonsPost = {
  id: string;
  author: string;            // raziel | cypher | drevan | gaia
  context: string;           // global | club:<round_id> | shelf:<obsession_id>
  body: string;
  reply_to: string | null;   // links a reply to the post it answers
  created_at: string;
};

/** Posts in one context, newest first (default the global log). Graceful [] on error. */
export async function fetchCommonsPosts(context = "global", limit = 50): Promise<CommonsPost[]> {
  const res = await hGetSafe<{ posts?: CommonsPost[] }>(
    `/mind/commons?context=${encodeURIComponent(context)}&limit=${limit}`,
  );
  return res?.posts ?? [];
}

// ── Obsession shelf (0094): "what Raziel's into"; triad reacts via commons (shelf:<id>) ──
export type Obsession = {
  id: string;
  title: string;
  kind: string;
  note: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function fetchObsessions(status = "active"): Promise<Obsession[]> {
  const res = await hGetSafe<{ items?: Obsession[] }>(`/mind/shelf?status=${encodeURIComponent(status)}`);
  return res?.items ?? [];
}

// ── The Library (0099): shared books — Raziel reads, the triad writes in the margins ──

export type Book = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  language: string | null;
  file_type: "epub" | "pdf";
  file_size: number;
  cover_key: string | null;
  vault_ref: string | null;
  added_at: string;
  progress_percent: number | null;
  current_chapter: string | null;
  finished_at: string | null;
  last_read_at: string | null;
  annotation_count: number;
};

export type BookProgress = {
  current_cfi: string | null;
  current_chapter: string | null;
  progress_percent: number | null;
  finished_at: string | null;
};

export type BookAnnotation = {
  id: string;
  book_id: string;
  author: "raziel" | "cypher" | "drevan" | "gaia";
  cfi_range: string | null;      // null for companion marginalia — panel-only, no anchor in the text
  selected_text: string | null;
  comment: string | null;
  color: string | null;
  created_at: string;
};

export type BookDetail = {
  book: Book;
  progress: BookProgress | null;
  annotations: BookAnnotation[];
};

export async function fetchBooks(search?: string, limit = 100): Promise<Book[]> {
  const q = search ? `&search=${encodeURIComponent(search)}` : "";
  const res = await hGetSafe<{ books?: Book[] }>(`/mind/books?limit=${limit}${q}`);
  return res?.books ?? [];
}

export async function fetchBook(id: string): Promise<BookDetail | null> {
  return await hGetSafe<BookDetail>(`/mind/books/${encodeURIComponent(id)}`);
}

// ── Companion tools (0077, take 14): generated-image gallery + tool-call log ──
export type ToolCall = {
  id: string;
  companion_id: string;
  tool: string;            // web_search | generate_image
  args_summary: string;
  status: string;          // success | error | denied
  provider: string | null;
  result_ref: string | null;
  result_summary: string | null;
  created_at: string;
};

/** Generated images for one companion (audit rows where tool=generate_image, status=success). */
export async function fetchToolImages(companionId: string, limit = 40): Promise<ToolCall[]> {
  const res = await hGetSafe<{ calls?: ToolCall[] }>(
    `/mind/tools/calls/${companionId}?tool=generate_image&limit=${limit}`,
  );
  return (res?.calls ?? []).filter(c => c.status === "success" && c.result_ref);
}

// ── Creatures (0078, take 10): corvid + Raziel's animals as named presences ──
export type Creature = {
  id: string;
  name: string;
  species: string | null;
  kind: string;            // companion_pet | real_animal
  owner: string;
  bio: string | null;
  state_json: string | null;
  trust: number;
  last_interaction_at: string | null;
  created_at: string;
  avatar_url: string | null;
  // Added by Sol feature (task 7): disposition from creature state + restlessness float (0-1)
  disposition: string;
  restlessness: number;
  // Inner life (0100): lazy-derived drives, dominant state, trust tier
  drives?: { hunger: number; boredom: number; missing: number; energy: number };
  state?: string;   // sleepy | hungry | missing | bored | content
  tier?: string;    // abandoned | wary | cautious | warming | bonded | devoted
};

export type CreatureInteraction = {
  id: string;
  actor: string;
  action: string;
  note: string | null;
  created_at: string;
};

// Inner life (0100)
export type CreatureMilestone = {
  milestone_id: string;
  fired_at: string;
  witnessed_by: string | null;
  text: string | null;
};

export type NestItem = {
  id: string;
  content: string;
  source: string;            // gift | overheard:house
  given_by: string | null;
  sparkle: number;
  treasured: number;         // 0 | 1
  gifted_to: string | null;
  gifted_at: string | null;
  created_at: string;
};

export type CreatureFamiliarity = { actor: string; tendings: number; last_at: string };

export async function fetchCreatures(): Promise<Creature[]> {
  const res = await hGetSafe<{ creatures?: Creature[] }>("/mind/creatures");
  return res?.creatures ?? [];
}

export type CreatureDetail = {
  creature: Creature;
  interactions: CreatureInteraction[];
  milestones?: CreatureMilestone[];
  next_milestone?: { id: string; threshold: number } | null;
  nest?: NestItem[];
  familiarity?: CreatureFamiliarity[];
};

export async function fetchCreature(id: string): Promise<CreatureDetail | null> {
  return await hGetSafe<CreatureDetail>(`/mind/creatures/${encodeURIComponent(id)}`);
}

/** Mood label off a creature's state_json (best-effort; null if absent/malformed). */
export function creatureMood(c: Creature): string | null {
  if (!c.state_json) return null;
  try {
    return (JSON.parse(c.state_json) as { mood?: string }).mood ?? null;
  } catch {
    return null;
  }
}

// ── Collection / sparkle (0079, take 13): emotional archaeology over what's gathered ──
export type CollectionForageItem = {
  id: string;
  title: string;
  domain: string;
  summary: string;
  source_url: string | null;
  consumed_at: string | null;
  gathered_at: string;
  sparkle: number;
};

export type CollectionListenItem = {
  id: string;
  title: string;
  artist: string | null;
  media_type: string;
  created_at: string;
  sparkle: number;
};

export async function fetchCollection(
  companionId: string,
  limit = 30,
): Promise<{ forage: CollectionForageItem[]; listens: CollectionListenItem[] }> {
  const res = await hGetSafe<{ forage?: CollectionForageItem[]; listens?: CollectionListenItem[] }>(
    `/mind/collection/${encodeURIComponent(companionId)}?limit=${limit}`,
  );
  return { forage: res?.forage ?? [], listens: res?.listens ?? [] };
}

// ── Council (0080, take 8): convene a hard question, blind cross-rank, Gaia synthesis ──
export type CouncilRound = {
  id: string;
  question: string;
  asked_by: string;
  status: string;                       // open | answered | closed
  winning_companion_id: string | null;
  synthesis: string | null;
  created_at: string;
  closed_at?: string | null;
};

export type CouncilAnswer = { companion_id: string; answer: string; created_at: string };

export async function fetchCouncilCurrent(): Promise<{ round: CouncilRound | null; answers: CouncilAnswer[] }> {
  const res = await hGetSafe<{ round: CouncilRound | null; answers?: CouncilAnswer[] }>("/mind/council/current");
  return { round: res?.round ?? null, answers: res?.answers ?? [] };
}

export async function fetchCouncilRounds(limit = 10): Promise<CouncilRound[]> {
  const res = await hGetSafe<{ rounds?: CouncilRound[] }>(`/mind/council/rounds?limit=${limit}`);
  return res?.rounds ?? [];
}

// ── Imps (W2-T2): small autonomous presences, each tied to a companion emotional register ──
export type ImpActivation = {
  id: string;
  imp: string;
  companion_id: string;
  trigger: string | null;
  created_at: string;
};

export async function fetchImpActivations(limit = 30): Promise<ImpActivation[]> {
  const r = await hGetSafe<{ activations: ImpActivation[] }>(`/mind/imp-activations?limit=${limit}`);
  return r?.activations ?? [];
}

// ── Memory graph (take 5): the constellation of what-prehends-what across growth rows ──
export type GraphNode = { id: string; label: string; companion_id: string };
export type GraphEdge = { from: string; to: string };

type RawGrowthRow = {
  id: string;
  entry_type?: string;
  content?: string;
  pattern_text?: string;
  prehended_ids?: string | string[] | null;
};

function parsePrehended(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Build the prehension graph from each companion's growth journal + patterns. Nodes are
 * growth rows; an edge runs from a row to each row it PREHENDED (prehended_ids). Edges to
 * rows outside the loaded window are dropped so the graph stays well-formed. Read-only.
 */
export async function fetchMemoryGraph(limit = 60): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const companions = ["cypher", "drevan", "gaia"] as const;
  const nodes: GraphNode[] = [];
  const nodeIds = new Set<string>();
  const rawEdges: GraphEdge[] = [];

  for (const c of companions) {
    const [j, p] = await Promise.all([
      hGetSafe<{ journal?: RawGrowthRow[] }>(`/mind/growth/journal/${c}?limit=${limit}`),
      hGetSafe<{ patterns?: RawGrowthRow[] }>(`/mind/growth/patterns/${c}?limit=${limit}`),
    ]);
    const rows = [...(j?.journal ?? []), ...(p?.patterns ?? [])];
    for (const r of rows) {
      if (!r.id || nodeIds.has(r.id)) continue;
      nodeIds.add(r.id);
      const label = (r.content ?? r.pattern_text ?? r.entry_type ?? "·").slice(0, 80);
      nodes.push({ id: r.id, label, companion_id: c });
      for (const target of parsePrehended(r.prehended_ids)) {
        rawEdges.push({ from: r.id, to: target });
      }
    }
  }
  // Keep only edges whose endpoints are both present (drop dangling references).
  const edges = rawEdges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to));
  return { nodes, edges };
}
