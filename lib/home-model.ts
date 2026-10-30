// Home page model. Pure: no React, no fetching.
import type { SomaData, InboxResponse, Book } from "./halseth";
import { COMPANION_COLOR } from "./shell";
import { parseUtc } from "./spoons";

export type HomeRow = {
  id: "drevan" | "cypher" | "gaia";
  name: string;
  colorVar: string;
  status: string | null;
  statusStale: boolean;
  /** Age of the mood word ("3d"), shown with a stale status: "last said: warm, 3d". */
  statusAge: string;
  seenLabel: string;
  bars: { label: string; pct: number }[];
};

export type LeftItem = {
  id: string;
  who: string;
  colorVar: string | null;
  kind: string;
  when: string;
  preview: string;
  unread: boolean;
  href: string;
};

const COMPANIONS = [
  { id: "drevan", name: "Drevan" },
  { id: "cypher", name: "Cypher" },
  { id: "gaia", name: "Gaia" },
] as const;

const DAY_MS = 86_400_000;

/** "now" under 2m, then Nm, Nh, Nd. Empty when the date does not parse. */
export function ageLabel(utc: string | null | undefined, now: Date): string {
  if (!utc) return "";
  const at = parseUtc(utc);
  if (!at) return "";
  const mins = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000));
  if (mins < 2) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function pct(v: number | null | undefined): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.round(Math.min(1, Math.max(0, v)) * 100);
}

export function buildWhoIsHome(soma: SomaData | null, now: Date): HomeRow[] {
  return COMPANIONS.map(({ id, name }) => {
    const base = { id, name, colorVar: COMPANION_COLOR[id] };
    const s = soma?.[id] ?? null;
    if (!s) return { ...base, status: null, statusStale: false, statusAge: "", seenLabel: "", bars: [] };

    const status = s.current_mood ?? s.compound_state ?? null;
    const setAt = s.current_mood && s.mood_set_at ? parseUtc(s.mood_set_at) : null;
    const statusStale = setAt !== null && now.getTime() - setAt.getTime() > DAY_MS;

    const bars: { label: string; pct: number }[] = [];
    const floats = [
      [s.float_1_label, s.soma_float_1, "float 1"],
      [s.float_2_label, s.soma_float_2, "float 2"],
      [s.float_3_label, s.soma_float_3, "float 3"],
    ] as const;
    for (const [label, value, fallback] of floats) {
      const p = pct(value);
      if (p !== null) bars.push({ label: label ?? fallback, pct: p });
    }

    return {
      ...base,
      status,
      statusStale,
      statusAge: statusStale ? ageLabel(s.mood_set_at, now) : "",
      seenLabel: ageLabel(s.updated_at, now),
      bars,
    };
  });
}

function titleCase(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Display name and color for a letter writer; non-companions ("steward", "guardian") get a neutral color. */
export function agentIdentity(agent: string): { who: string; colorVar: string | null } {
  const c = COMPANIONS.find((x) => x.id === agent);
  return { who: c ? c.name : titleCase(agent), colorVar: c ? COMPANION_COLOR[c.id] : null };
}

export function buildLeftForYou(inbox: InboxResponse | null, now: Date): { items: LeftItem[]; unread: number } {
  if (!inbox) return { items: [], unread: 0 };
  const items = inbox.items.map((it): LeftItem => {
    const { who, colorVar } = agentIdentity(it.agent);
    return {
      id: it.id,
      who,
      colorVar,
      kind: "a letter",
      when: ageLabel(it.created_at, now),
      preview: it.preview,
      unread: !it.read,
      href: `/letters/${it.id}`,
    };
  });
  return { items, unread: inbox.unread_count };
}

/** Most recently read book that is started, under 100%, and not finished. */
export function currentBook(books: Book[]): Book | null {
  let best: Book | null = null;
  let bestAt = -Infinity;
  for (const b of books) {
    if (b.progress_percent === null || b.progress_percent === undefined) continue;
    if (b.progress_percent >= 100 || b.finished_at) continue;
    const at = b.last_read_at ? parseUtc(b.last_read_at)?.getTime() ?? -Infinity : -Infinity;
    if (best === null || at > bestAt) {
      best = b;
      bestAt = at;
    }
  }
  return best;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Thursday evening", from the viewer's local clock. */
export function greeting(now: Date): string {
  const h = now.getHours();
  const part = h < 12 ? "morning" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
  return `${WEEKDAYS[now.getDay()]} ${part}`;
}
