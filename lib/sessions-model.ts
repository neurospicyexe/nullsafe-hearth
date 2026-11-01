import type { SessionEntry, HandoverPacket } from "./halseth";
import { ms } from "./letters-model";

// Care and plural-state fields (hrv_range, emotional_frequency, front_state, notes, depth,
// co_con) are deliberately not carried: the Archive does not show them.
export type ArchiveSession = {
  id: string;
  companion: string | null;
  sessionType: string | null;
  at: string;
  motion: string | null;
  spine: string;
  lastRealThing: string | null;
  body: { spine: string; lastRealThing: string | null; threads: string[]; anchor: string | null } | null;
};

function threadsOf(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const p: unknown = JSON.parse(raw);
    return Array.isArray(p) ? p.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function joinSessions(sessions: SessionEntry[], handovers: HandoverPacket[]): ArchiveSession[] {
  const bySession = new Map<string, HandoverPacket>();
  for (const h of handovers) if (!bySession.has(h.session_id)) bySession.set(h.session_id, h);
  return sessions
    .map((s): ArchiveSession => {
      const h = bySession.get(s.id);
      return {
        id: s.id,
        companion: s.companion_id,
        sessionType: s.session_type,
        at: s.created_at,
        motion: s.motion_state,
        spine: s.spine ?? "",
        lastRealThing: s.last_real_thing,
        body: h
          ? { spine: h.spine, lastRealThing: h.last_real_thing, threads: threadsOf(h.open_threads), anchor: h.active_anchor }
          : null,
      };
    })
    .sort((a, b) => ms(b.at) - ms(a.at));
}
