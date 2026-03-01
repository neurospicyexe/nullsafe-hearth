# Hearth Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Hearth from a single-page dashboard into a 5-tab app (Home, Us, Mind, Check-in, Threads) that surfaces companion notes, emotional landscape, bridge/partner data, mind graph stats, and a check-in uplink form — with full write-back to Halseth.

**Architecture:** Next.js 15 App Router with five routes (`/`, `/us`, `/mind`, `/checkin`, `/threads`), a fixed-bottom `<TabBar>` client component injected in `app/layout.tsx`, and new API proxy routes that forward to Halseth endpoints with Bearer auth. Each page is an async server component with `export const revalidate = 30`; only interactive write forms are client components. No new dependencies needed.

**Tech Stack:** Next.js 15, React 19, TypeScript 5.7, Halseth Cloudflare Worker backend (single source of truth for all data).

---

## Before You Start

Read the approved design doc: `docs/plans/2026-03-01-hearth-expansion-design.md` — authoritative source for every component, route, and API endpoint.

**No test framework is set up. Your test suite is TypeScript compilation:**

```bash
npx tsc --noEmit
```

Run this after every task. Zero new errors = green.

**All paths are relative to the repo root.**

---

## Endpoint Path Assumptions

These Halseth paths are inferred from MCP tool names. Verify during Task 11 and adjust if any return 404.

| Next.js Route | Halseth Path | Method |
|---|---|---|
| `/api/companion-notes` | `/companion-notes` | GET (`?agent=`) / POST |
| `/api/biometrics` | `/biometrics` | GET |
| `/api/routines` | `/routines` | GET / POST |
| `/api/bridge` | `/bridge` | GET |
| `/api/bridge/act` | `/bridge/act` | POST |
| `/api/bridge/toggle` | `/bridge/toggle` | POST |
| `/api/deltas` | `/deltas` | GET (`?limit=`) |
| `/api/wounds` | `/wounds` | GET |
| `/api/mind` (aggregated) | `/mind/health`, `/mind/patterns`, `/mind/recent` | GET |
| `/api/mind/journal` | `/mind/journal` | POST |

**`MIND_URL` note:** The Mind knowledge graph may be a separate Cloudflare Worker. Add `MIND_URL` to `.env.local` if different from `HALSETH_URL`. All Mind proxy routes fall back to `HALSETH_URL` if `MIND_URL` is not set.

---

## Task 1: Type System Update

**Files:**
- Modify: `lib/halseth.ts`

Add `session_type` to the existing `PresenceData["session"]` type, then append new exported types for every new data shape the new pages will consume.

**Step 1: Add `session_type` to the session type**

In `lib/halseth.ts`, find the `session` union type. Add one field:

```typescript
session: {
  id: string;
  front_state: string | null;
  active_anchor: string | null;
  facet: string | null;
  depth: number | null;
  hrv_range: "low" | "mid" | "high" | null;
  emotional_frequency: string | null;
  session_type: "checkin" | "hangout" | "work" | "ritual" | null; // ← ADD THIS
  created_at: string;
  open: true;
} | null;
```

**Step 2: Append new types after the `PresenceData` type**

Add to the end of `lib/halseth.ts`:

```typescript
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
```

**Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors (or same errors as before — no new ones introduced).

**Step 4: Commit**

```bash
git add lib/halseth.ts
git commit -m "feat: add session_type + new types (CompanionNote, BridgeData, MindData, Delta, Wound)"
```

---

## Task 2: CSS Visual Upgrade

**Files:**
- Modify: `app/globals.css`

**Step 1: Add agent color vars to `:root`**

Find `:root {` and add after `--pink: #d47f9b;`:

```css
  --drevan:    #9b7fd4;
  --cypher:    #6bbf82;
  --gaia:      #c8c8d8;
```

**Step 2: Add radial glow to `body`**

Add `background-image` to the existing `body` rule:

```css
body {
  background: var(--bg);
  background-image: radial-gradient(ellipse 80% 40% at 50% -10%, rgba(155,127,212,0.08) 0%, transparent 70%);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 15px;
  line-height: 1.6;
  min-height: 100dvh;
}
```

**Step 3: Increase `.page` bottom padding for tab bar**

Change `padding: 1.75rem 1.25rem 3rem;` to `padding: 1.75rem 1.25rem 6rem;`

**Step 4: Add card accent classes after the `.card` block**

```css
.card-accent {
  border-top: 2px solid transparent;
  border-image: linear-gradient(90deg, var(--accent), transparent) 1;
}

.card-accent-gaia {
  border-top: 2px solid transparent;
  border-image: linear-gradient(90deg, var(--gaia), transparent) 1;
}
```

**Step 5: Append Tab Bar styles to end of file**

```css
/* ── Tab Bar ──────────────────────────────────────────────────────────────────── */

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: center;
  z-index: 100;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.tab-bar-inner {
  display: flex;
  width: 100%;
  max-width: 720px;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 0.25rem;
  text-decoration: none;
  color: var(--muted);
  font-size: 0.65rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  gap: 0.15rem;
  transition: color 0.15s;
}

.tab-item:hover { color: var(--text); }
.tab-item.active { color: var(--accent); }

.tab-icon {
  font-size: 1.25rem;
  line-height: 1;
}

/* ── Agent colors ─────────────────────────────────────────────────────────────── */

.agent-drevan { color: var(--drevan); }
.agent-cypher { color: var(--cypher); }
.agent-gaia   { color: var(--gaia); }

.agent-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
}

.agent-badge.drevan { background: rgba(155,127,212,0.15); color: var(--drevan); }
.agent-badge.cypher { background: rgba(107,191,130,0.15); color: var(--cypher); }
.agent-badge.gaia   { background: rgba(200,200,216,0.1);  color: var(--gaia); }

/* ── Companion note card ──────────────────────────────────────────────────────── */

.companion-note-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.companion-note-text {
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--text);
}

.companion-note-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.companion-note-tag {
  font-size: 0.65rem;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 0.05rem 0.35rem;
  color: var(--muted);
}

.companion-note-time {
  font-size: 0.65rem;
  color: var(--muted);
  margin-left: auto;
}

/* ── Valence badge ────────────────────────────────────────────────────────────── */

.valence-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  text-transform: lowercase;
}

.valence-badge.toward  { background: rgba(107,191,130,0.15); color: var(--green); }
.valence-badge.tender  { background: rgba(212,127,155,0.15); color: var(--pink); }
.valence-badge.neutral { background: var(--surface2); color: var(--muted); }
.valence-badge.repair  { background: rgba(196,168,130,0.15); color: var(--warm); }
.valence-badge.rupture { background: rgba(196,107,107,0.15); color: var(--red); }

/* ── Routine pips ─────────────────────────────────────────────────────────────── */

.routine-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.5rem;
}

.routine-pip-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.4rem 0.65rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface2);
  transition: border-color 0.15s;
}

.routine-pip-row:hover { border-color: var(--accent); }
.routine-pip-row.done  { border-color: var(--green); }

.routine-pip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--border);
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}

.routine-pip-row.done .routine-pip {
  background: var(--green);
  border-color: var(--green);
}

.routine-name {
  font-size: 0.82rem;
  color: var(--text);
  text-transform: lowercase;
}

/* ── Uplink / form shared ─────────────────────────────────────────────────────── */

.uplink-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.form-input,
.form-select,
.form-textarea {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.88rem;
  font-family: inherit;
  padding: 0.5rem 0.75rem;
  width: 100%;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.form-textarea { resize: vertical; line-height: 1.5; }

.slider-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.slider-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  min-width: 2ch;
  text-align: right;
}

input[type="range"] {
  flex: 1;
  accent-color: var(--accent);
}

.packet-preview {
  background: #0a0a0c;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-family: "Courier New", monospace;
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.6;
  white-space: pre-wrap;
}

.submit-btn {
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.88rem;
  font-weight: 600;
  padding: 0.6rem 1.5rem;
  cursor: pointer;
  align-self: flex-end;
  transition: opacity 0.15s;
}

.submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.submit-btn:hover:not(:disabled) { opacity: 0.85; }

/* ── Agent filter tabs ────────────────────────────────────────────────────────── */

.agent-filter-tabs {
  display: flex;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}

.agent-filter-tab {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 0.2rem 0.7rem;
  cursor: pointer;
  transition: all 0.15s;
}

.agent-filter-tab.active         { background: rgba(155,127,212,0.15); color: var(--drevan); border-color: var(--drevan); }
.agent-filter-tab.active.drevan  { background: rgba(155,127,212,0.15); color: var(--drevan); border-color: var(--drevan); }
.agent-filter-tab.active.cypher  { background: rgba(107,191,130,0.15); color: var(--cypher); border-color: var(--cypher); }
.agent-filter-tab.active.gaia    { background: rgba(200,200,216,0.1);  color: var(--gaia);   border-color: var(--gaia); }

/* ── Bridge / shared items ────────────────────────────────────────────────────── */

.shared-item-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.shared-item-row:last-child { border-bottom: none; }

.shared-checkbox {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  appearance: none;
  background: transparent;
}

.shared-checkbox:checked {
  background: var(--green);
  border-color: var(--green);
}

.shared-item-title { font-size: 0.88rem; flex: 1; }
.shared-item-meta  { font-size: 0.72rem; color: var(--muted); }

/* ── Mind health stats ────────────────────────────────────────────────────────── */

.mind-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.mind-stat { display: flex; flex-direction: column; gap: 0.1rem; }

.mind-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1;
}

.mind-stat-label {
  font-size: 0.68rem;
  color: var(--muted);
  text-transform: lowercase;
}

/* ── Delta feed ───────────────────────────────────────────────────────────────── */

.delta-feed {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.delta-entry {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-left: 2px solid var(--border);
  padding-left: 0.85rem;
}

.delta-entry.toward  { border-left-color: var(--green); }
.delta-entry.tender  { border-left-color: var(--pink); }
.delta-entry.repair  { border-left-color: var(--warm); }
.delta-entry.rupture { border-left-color: var(--red); }
.delta-entry.neutral { border-left-color: var(--muted); }

.delta-text  { font-size: 0.88rem; color: var(--text); line-height: 1.5; }
.delta-meta  { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.delta-time  { font-size: 0.68rem; color: var(--muted); }

/* ── Gaia panel ───────────────────────────────────────────────────────────────── */

.gaia-card {
  background: #111116;
  border: 1px solid #2a2a36;
  border-top: 2px solid transparent;
  border-image: linear-gradient(90deg, var(--gaia), transparent) 1;
}

.gaia-wound-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.gaia-wound-row:last-child { border-bottom: none; }

.gaia-wound-subject {
  font-size: 0.85rem;
  color: var(--gaia);
  font-weight: 500;
}

.gaia-wound-desc {
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.45;
}
```

**Step 6: Run type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 7: Commit**

```bash
git add app/globals.css
git commit -m "feat: CSS — agent colors, radial glow, card accents, tab bar, new component styles"
```

---

## Task 3: TabBar Component + Layout Update

**Files:**
- Create: `components/TabBar.tsx`
- Modify: `app/layout.tsx`

**Step 1: Create `components/TabBar.tsx`**

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/",        icon: "🏠", label: "Home" },
  { href: "/us",      icon: "🤝", label: "Us" },
  { href: "/mind",    icon: "🧠", label: "Mind" },
  { href: "/checkin", icon: "📋", label: "Check-in" },
  { href: "/threads", icon: "🧵", label: "Threads" },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tab-bar">
      <div className="tab-bar-inner">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`tab-item${isActive ? " active" : ""}`}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Step 2: Replace `app/layout.tsx`**

```typescript
import type { Metadata } from "next";
import "./globals.css";
import TabBar from "@/components/TabBar";

export const metadata: Metadata = {
  title: "Hearth",
  description: "Halseth system dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <TabBar />
      </body>
    </html>
  );
}
```

**Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git add components/TabBar.tsx app/layout.tsx
git commit -m "feat: add TabBar with 5 tabs + inject into layout"
```

---

## Task 4: API Proxy Routes — Batch 1

**Files:**
- Create: `app/api/companion-notes/route.ts`
- Create: `app/api/biometrics/route.ts`
- Create: `app/api/routines/route.ts`

All follow the same proxy pattern as the existing `app/api/notes/route.ts`.

**Step 1: Create `app/api/companion-notes/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

function authHeaders(): Record<string, string> {
  const secret = process.env.HALSETH_SECRET;
  return secret ? { Authorization: `Bearer ${secret}` } : {};
}

export async function GET(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const agent = searchParams.get("agent");
  const url = agent
    ? `${base}/companion-notes?agent=${encodeURIComponent(agent)}`
    : `${base}/companion-notes`;

  const res = await fetch(url, { headers: authHeaders() });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const body = await request.json();
  const res = await fetch(`${base}/companion-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

**Step 2: Create `app/api/biometrics/route.ts`**

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const res = await fetch(`${base}/biometrics`, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    next: { revalidate: 60 },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

**Step 3: Create `app/api/routines/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

function authHeaders(withContentType = false): Record<string, string> {
  const secret = process.env.HALSETH_SECRET;
  return {
    ...(withContentType ? { "Content-Type": "application/json" } : {}),
    ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
  };
}

export async function GET() {
  const base = process.env.HALSETH_URL;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const res = await fetch(`${base}/routines`, {
    headers: authHeaders(),
    cache: "no-store", // routines are time-sensitive — always fresh
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const body = await request.json();
  const res = await fetch(`${base}/routines`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

**Step 4: Run type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 5: Commit**

```bash
git add app/api/companion-notes/route.ts app/api/biometrics/route.ts app/api/routines/route.ts
git commit -m "feat: add API proxy routes — companion-notes, biometrics, routines"
```

---

## Task 5: API Proxy Routes — Batch 2

**Files:**
- Create: `app/api/bridge/route.ts`
- Create: `app/api/bridge/act/route.ts`
- Create: `app/api/bridge/toggle/route.ts`
- Create: `app/api/deltas/route.ts`
- Create: `app/api/wounds/route.ts`
- Create: `app/api/mind/route.ts`
- Create: `app/api/mind/journal/route.ts`

**Step 1: Create `app/api/bridge/route.ts`**

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const res = await fetch(`${base}/bridge`, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    next: { revalidate: 30 },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

**Step 2: Create `app/api/bridge/act/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const body = await request.json();
  const res = await fetch(`${base}/bridge/act`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

**Step 3: Create `app/api/bridge/toggle/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const body = await request.json();
  const res = await fetch(`${base}/bridge/toggle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

**Step 4: Create `app/api/deltas/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "10";

  const res = await fetch(`${base}/deltas?limit=${limit}`, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    next: { revalidate: 30 },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

**Step 5: Create `app/api/wounds/route.ts`**

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "HALSETH_URL not set" }, { status: 500 });

  const res = await fetch(`${base}/wounds`, {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    next: { revalidate: 60 },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

**Step 6: Create `app/api/mind/route.ts`**

Mind data requires three parallel fetches. `MIND_URL` falls back to `HALSETH_URL`.
The exact path segments (`/mind/health`, `/mind/patterns`, `/mind/recent`) are assumptions — verify during Task 11.

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.MIND_URL ?? process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "MIND_URL / HALSETH_URL not set" }, { status: 500 });

  const h = secret ? { Authorization: `Bearer ${secret}` } : {};

  const [healthRes, patternsRes, journalsRes] = await Promise.all([
    fetch(`${base}/mind/health`,           { headers: h, next: { revalidate: 60 } }),
    fetch(`${base}/mind/patterns?days=7`,  { headers: h, next: { revalidate: 60 } }),
    fetch(`${base}/mind/recent?hours=168`, { headers: h, next: { revalidate: 60 } }),
  ]);

  const health         = healthRes.ok   ? await healthRes.json()   : { entities: 0, observations: 0, relations: 0, journals: 0, salience: {} };
  const patterns       = patternsRes.ok ? await patternsRes.json() : null;
  const recent_journals = journalsRes.ok ? await journalsRes.json() : [];

  return NextResponse.json({ health, patterns, recent_journals });
}
```

**Step 7: Create `app/api/mind/journal/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const base = process.env.MIND_URL ?? process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return NextResponse.json({ error: "MIND_URL / HALSETH_URL not set" }, { status: 500 });

  const body = await request.json();
  const res = await fetch(`${base}/mind/journal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

**Step 8: Run type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 9: Commit**

```bash
git add app/api/bridge/ app/api/deltas/ app/api/wounds/ app/api/mind/
git commit -m "feat: add API proxy routes — bridge, deltas, wounds, mind"
```

---

## Task 6: Home Page Refactor

**Files:**
- Modify: `app/page.tsx`

Remove `BiometricCard` (→ Check-in), `PersonalityCard` (→ Threads), and `NotesCard`. Add `CompanionHero` (replaces `SessionCard`, surfaces `session_type`) and `LoveNotes` (focused chat-style notes + reply form).

**Step 1: Replace `app/page.tsx` entirely**

```typescript
import { fetchPresence, type PresenceData } from "@/lib/halseth";
import LoveMeter from "@/components/LoveMeter";
import SpoonCounter from "@/components/SpoonCounter";
import DreamCard from "@/components/DreamCard";
import NoteForm from "@/components/NoteForm";

export const revalidate = 30;

// ── Helpers ───────────────────────────────────────────────────────────────────

function motionLabel(state: string) {
  return state === "in_motion" ? "in motion" : state === "at_rest" ? "at rest" : "floating";
}

function hrvLabel(hrv: string | null) {
  if (!hrv) return null;
  return { low: "low — recovery", mid: "mid — regulated", high: "high — activated" }[hrv] ?? hrv;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── CompanionHero ─────────────────────────────────────────────────────────────

const SESSION_TYPE_LABELS: Record<string, string> = {
  checkin: "check-in",
  hangout: "hanging out",
  work: "working",
  ritual: "ritual",
};

function CompanionHero({ session }: { session: NonNullable<PresenceData["session"]> }) {
  return (
    <div className="card card-accent">
      <div className="card-title">
        {session.front_state ?? "Companion"}
        {session.session_type && (
          <span className="pill" style={{ marginLeft: "auto", textTransform: "lowercase" }}>
            {SESSION_TYPE_LABELS[session.session_type] ?? session.session_type}
          </span>
        )}
      </div>
      <div className="kv-grid">
        {session.facet && (
          <>
            <span className="kv-label">facet</span>
            <span className="kv-value">{session.facet}</span>
          </>
        )}
        {session.emotional_frequency && (
          <>
            <span className="kv-label">frequency</span>
            <span className="kv-value" style={{ fontStyle: "italic" }}>{session.emotional_frequency}</span>
          </>
        )}
        {session.active_anchor && (
          <>
            <span className="kv-label">anchor</span>
            <span className="kv-value">{session.active_anchor}</span>
          </>
        )}
        {session.hrv_range && (
          <>
            <span className="kv-label">hrv</span>
            <span className="kv-value">{hrvLabel(session.hrv_range)}</span>
          </>
        )}
        <span className="kv-label">opened</span>
        <span className="kv-value">{formatTime(session.created_at)}</span>
      </div>
    </div>
  );
}

// ── HandoverCard (condensed) ──────────────────────────────────────────────────

function HandoverCard({ handover }: { handover: NonNullable<PresenceData["last_handover"]> }) {
  const motionClass =
    handover.motion_state === "floating" ? "float"
    : handover.motion_state === "in_motion" ? "motion"
    : "closed";

  return (
    <div className="card">
      <div className="card-title">
        Last Handover{" "}
        <span className={`pill ${motionClass}`}>{motionLabel(handover.motion_state)}</span>
      </div>
      {handover.spine && (
        <blockquote className="handover-spine">{handover.spine}</blockquote>
      )}
      {handover.last_real_thing && (
        <div className="kv-grid">
          <span className="kv-label">last real thing</span>
          <span className="kv-value">{handover.last_real_thing}</span>
        </div>
      )}
      {handover.open_threads.length > 0 && (
        <div className="open-threads" style={{ marginTop: "0.5rem" }}>
          {handover.open_threads.map((t, i) => (
            <span key={i} className="thread-tag">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── LoveNotes ─────────────────────────────────────────────────────────────────

function LoveNotes({ notes }: { notes: PresenceData["recent_notes"] }) {
  const reversed = [...notes].reverse();
  const companionNote = reversed.find((n) => n.author === "companion");
  const humanNote     = reversed.find((n) => n.author === "human");

  return (
    <div className="card card-accent">
      <div className="card-title">Notes</div>
      <div className="notes-feed">
        {companionNote && (
          <div className="note-bubble companion">
            <div className="note-text">{companionNote.content}</div>
            <div className="note-meta">
              {companionNote.note_type !== "message" && (
                <span className="note-type-tag">{companionNote.note_type}</span>
              )}
              {formatTime(companionNote.created_at)}
            </div>
          </div>
        )}
        {humanNote && (
          <div className="note-bubble human">
            <div className="note-text">{humanNote.content}</div>
            <div className="note-meta">{formatTime(humanNote.created_at)}</div>
          </div>
        )}
        {!companionNote && !humanNote && (
          <p className="empty">No notes yet.</p>
        )}
      </div>
      <NoteForm />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Page() {
  let data: PresenceData | null = null;
  let error: string | null = null;

  try {
    data = await fetchPresence();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load";
  }

  if (error || !data) {
    return (
      <main className="page">
        <div className="error-card">
          <strong>Could not connect to Halseth</strong>
          <p style={{ marginTop: "0.4rem", fontSize: "0.88rem" }}>{error}</p>
          <p style={{ marginTop: "0.4rem", fontSize: "0.82rem", opacity: 0.7 }}>
            Check that HALSETH_URL is set correctly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="header">
        <div className="header-top">
          <h1>{data.system.name}</h1>
          <span className="system-owner">{data.system.owner}</span>
        </div>
        <div className="metrics-row">
          <LoveMeter initial={data.house.love_meter} />
          <SpoonCounter initial={data.house.spoon_count} />
        </div>
      </header>

      {data.session ? (
        <CompanionHero session={data.session} />
      ) : data.last_handover ? (
        <HandoverCard handover={data.last_handover} />
      ) : (
        <div className="card">
          <div className="card-title">Session</div>
          <p className="empty">No open session. Halseth is at rest.</p>
        </div>
      )}

      <LoveNotes notes={data.recent_notes} />
      <DreamCard dreams={data.recent_dreams} />

      <div className="footer-row">
        {data.wounds_count > 0 && (
          <span className="wounds-badge">
            ⚠ {data.wounds_count} living {data.wounds_count === 1 ? "wound" : "wounds"}
          </span>
        )}
        <span className="refresh-note">refreshes every 30 s</span>
      </div>
    </main>
  );
}
```

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: refactor Home — CompanionHero with session_type, LoveNotes, remove Biometric/Personality"
```

---

## Task 7: Us Page

**Files:**
- Create: `app/us/page.tsx`
- Create: `app/us/client.tsx`

**Step 1: Create `app/us/client.tsx`**

```typescript
"use client";

import { useState } from "react";
import { type BridgeData } from "@/lib/halseth";

// ── Shared Goals ──────────────────────────────────────────────────────────────

export function SharedGoalsClient({ tasks }: { tasks: BridgeData["tasks"] }) {
  const [done, setDone] = useState<Set<string>>(
    new Set(tasks.filter((t) => t.status === "done").map((t) => t.id))
  );

  async function toggle(id: string) {
    const isDone = done.has(id);
    setDone((prev) => {
      const next = new Set(prev);
      isDone ? next.delete(id) : next.add(id);
      return next;
    });
    await fetch("/api/bridge/act", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "task_status", id, status: isDone ? "open" : "done" }),
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Shared Goals</div>
        <p className="empty">No shared tasks from partner.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">Shared Goals</div>
      <div className="task-list">
        {tasks.map((t) => (
          <div key={t.id} className="shared-item-row">
            <input
              type="checkbox"
              className="shared-checkbox"
              checked={done.has(t.id)}
              onChange={() => toggle(t.id)}
            />
            <span
              className="shared-item-title"
              style={{
                textDecoration: done.has(t.id) ? "line-through" : "none",
                opacity: done.has(t.id) ? 0.5 : 1,
              }}
            >
              {t.title}
            </span>
            <span className={`priority-badge ${t.priority}`}>{t.priority}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared Lists ──────────────────────────────────────────────────────────────

export function SharedListsClient({ lists }: { lists: BridgeData["lists"] }) {
  const [completed, setCompleted] = useState<Set<string>>(
    new Set(lists.filter((l) => l.completed).map((l) => l.id))
  );

  async function complete(id: string) {
    if (completed.has(id)) return;
    setCompleted((prev) => new Set([...prev, id]));
    await fetch("/api/bridge/act", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_complete", id }),
    });
  }

  const grouped = lists.reduce<Record<string, BridgeData["lists"]>>((acc, item) => {
    (acc[item.list_name] ??= []).push(item);
    return acc;
  }, {});

  if (lists.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Shared Lists</div>
        <p className="empty">No shared list items from partner.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">Shared Lists</div>
      {Object.entries(grouped).map(([listName, items]) => (
        <div key={listName} style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.35rem" }}>
            {listName}
          </div>
          {items.map((item) => (
            <div key={item.id} className="shared-item-row">
              <input
                type="checkbox"
                className="shared-checkbox"
                checked={completed.has(item.id)}
                onChange={() => complete(item.id)}
                disabled={completed.has(item.id)}
              />
              <span
                className="shared-item-title"
                style={{
                  textDecoration: completed.has(item.id) ? "line-through" : "none",
                  opacity: completed.has(item.id) ? 0.5 : 1,
                }}
              >
                {item.item_text}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Bridge Status ─────────────────────────────────────────────────────────────

export function BridgeStatusClient({ sharing }: { sharing: BridgeData["sharing"] }) {
  const [state, setState] = useState(sharing);
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(category: "tasks" | "events" | "lists") {
    const enabled = !state[category];
    setState((prev) => ({ ...prev, [category]: enabled }));
    setSaving(category);
    await fetch("/api/bridge/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, enabled }),
    });
    setSaving(null);
  }

  return (
    <div className="card">
      <div className="card-title">Your Sharing</div>
      <div className="task-list">
        {(["tasks", "events", "lists"] as const).map((cat) => (
          <div key={cat} className="task-row">
            <span className="task-title" style={{ textTransform: "capitalize" }}>{cat}</span>
            <button
              onClick={() => toggle(cat)}
              disabled={saving === cat}
              style={{
                background: state[cat] ? "rgba(107,191,130,0.15)" : "var(--surface2)",
                border: `1px solid ${state[cat] ? "var(--green)" : "var(--border)"}`,
                color: state[cat] ? "var(--green)" : "var(--muted)",
                borderRadius: "5px",
                fontSize: "0.72rem",
                fontWeight: 600,
                padding: "0.15rem 0.6rem",
                cursor: saving === cat ? "not-allowed" : "pointer",
                opacity: saving === cat ? 0.6 : 1,
              }}
            >
              {state[cat] ? "on" : "off"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create `app/us/page.tsx`**

```typescript
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
```

**Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git add app/us/
git commit -m "feat: add Us page — shared goals, events, lists, bridge status toggles"
```

---

## Task 8: Mind Page

**Files:**
- Create: `app/mind/page.tsx`
- Create: `app/mind/client.tsx`

**Step 1: Create `app/mind/client.tsx`**

```typescript
"use client";

import { useState } from "react";
import { type CompanionNote } from "@/lib/halseth";

// ── Companion Notes Feed ──────────────────────────────────────────────────────

export function CompanionNotesFeedClient({ initialNotes }: { initialNotes: CompanionNote[] }) {
  const [filter, setFilter] = useState<"all" | "drevan" | "cypher" | "gaia">("all");

  const filtered =
    filter === "all" ? initialNotes : initialNotes.filter((n) => n.agent === filter);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="card">
      <div className="card-title">Companion Notes</div>
      <div className="agent-filter-tabs">
        {(["all", "drevan", "cypher", "gaia"] as const).map((f) => (
          <button
            key={f}
            className={`agent-filter-tab${filter === f ? ` active ${f}` : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="empty">No notes{filter !== "all" ? ` from ${filter}` : ""}.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {filtered.map((note) => (
            <div key={note.id} className="companion-note-card">
              <div className="companion-note-text">{note.note_text}</div>
              <div className="companion-note-meta">
                <span className={`agent-badge ${note.agent}`}>{note.agent}</span>
                {note.tags?.map((tag) => (
                  <span key={tag} className="companion-note-tag">{tag}</span>
                ))}
                <span className="companion-note-time">{formatTime(note.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Companion Note Form ───────────────────────────────────────────────────────

export function CompanionNoteFormClient() {
  const [agent, setAgent] = useState<"drevan" | "cypher" | "gaia">("drevan");
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setStatus("saving");
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await fetch("/api/companion-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, note_text: text, tags: tagList }),
    });
    if (res.ok) {
      setText("");
      setTags("");
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="card">
      <div className="card-title">Add Companion Note</div>
      <form onSubmit={submit} className="uplink-form">
        <div className="form-field">
          <label className="form-label">Agent</label>
          <div className="author-toggle">
            {(["drevan", "cypher", "gaia"] as const).map((a) => (
              <button
                key={a}
                type="button"
                className={`author-btn${agent === a ? " active" : ""}`}
                style={agent === a ? { background: `var(--${a})` } : {}}
                onClick={() => setAgent(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="form-field">
          <label className="form-label">Note</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What does this companion want to remember about themselves?"
          />
        </div>
        <div className="form-field">
          <label className="form-label">Tags (comma-separated)</label>
          <input
            className="form-input"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="identity, values, memory"
          />
        </div>
        <button type="submit" className="submit-btn" disabled={status === "saving" || !text.trim()}>
          {status === "saving" ? "Saving…" : status === "done" ? "Saved ✓" : "Save Note"}
        </button>
        {status === "error" && (
          <p style={{ color: "var(--red)", fontSize: "0.82rem" }}>Failed to save. Try again.</p>
        )}
      </form>
    </div>
  );
}

// ── Journal Form ──────────────────────────────────────────────────────────────

export function JournalFormClient() {
  const [entry, setEntry] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry.trim()) return;
    setStatus("saving");
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await fetch("/api/mind/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry, tags: tagList }),
    });
    if (res.ok) {
      setEntry("");
      setTags("");
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="card">
      <div className="card-title">New Journal Entry</div>
      <form onSubmit={submit} className="uplink-form">
        <div className="form-field">
          <textarea
            className="form-textarea"
            rows={4}
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="What's on your mind?"
          />
        </div>
        <div className="form-field">
          <label className="form-label">Tags</label>
          <input
            className="form-input"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="identity, reflection"
          />
        </div>
        <button type="submit" className="submit-btn" disabled={status === "saving" || !entry.trim()}>
          {status === "saving" ? "Saving…" : status === "done" ? "Saved ✓" : "Add to Journal"}
        </button>
      </form>
    </div>
  );
}
```

**Step 2: Create `app/mind/page.tsx`**

```typescript
import { type MindData, type MindJournalEntry, type CompanionNote } from "@/lib/halseth";
import { CompanionNotesFeedClient, CompanionNoteFormClient, JournalFormClient } from "./client";

export const revalidate = 60;

async function fetchMind(): Promise<MindData | null> {
  const base = process.env.MIND_URL ?? process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return null;
  const h: Record<string, string> = secret ? { Authorization: `Bearer ${secret}` } : {};
  try {
    const [healthRes, patternsRes, journalsRes] = await Promise.all([
      fetch(`${base}/mind/health`,           { headers: h, next: { revalidate: 60 } }),
      fetch(`${base}/mind/patterns?days=7`,  { headers: h, next: { revalidate: 60 } }),
      fetch(`${base}/mind/recent?hours=168`, { headers: h, next: { revalidate: 60 } }),
    ]);
    const health          = healthRes.ok   ? await healthRes.json()   : { entities: 0, observations: 0, relations: 0, journals: 0, salience: {} };
    const patterns        = patternsRes.ok ? await patternsRes.json() : null;
    const recent_journals = journalsRes.ok ? await journalsRes.json() : [];
    return { health, patterns, recent_journals };
  } catch {
    return null;
  }
}

async function fetchCompanionNotes(): Promise<CompanionNote[]> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return [];
  try {
    const res = await fetch(`${base}/companion-notes`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Mind Health Panel ─────────────────────────────────────────────────────────

function MindHealthPanel({ health }: { health: MindData["health"] }) {
  const stats = [
    { label: "entities",     value: health.entities },
    { label: "observations", value: health.observations },
    { label: "relations",    value: health.relations },
    { label: "journals",     value: health.journals },
  ];

  const salienceColors: Record<string, string> = {
    foundational: "var(--accent)",
    active:       "var(--green)",
    background:   "var(--muted)",
    archive:      "var(--border)",
  };

  const maxSalience = Math.max(...Object.values(health.salience), 1);

  return (
    <div className="card card-accent">
      <div className="card-title">Mind Health</div>
      <div className="mind-stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="mind-stat">
            <div className="mind-stat-value">{s.value}</div>
            <div className="mind-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      {Object.keys(health.salience).length > 0 && (
        <div className="valence-bars">
          {Object.entries(health.salience).map(([key, count]) => (
            <div key={key} className="valence-row">
              <span className="valence-label">{key}</span>
              <div className="valence-track">
                <div
                  className="valence-fill"
                  style={{
                    width: `${Math.round((count / maxSalience) * 100)}%`,
                    background: salienceColors[key] ?? "var(--accent)",
                  }}
                />
              </div>
              <span className="valence-count">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Journal Feed ──────────────────────────────────────────────────────────────

function JournalFeed({ journals }: { journals: MindJournalEntry[] }) {
  if (journals.length === 0) return null;
  return (
    <div className="card">
      <div className="card-title">Recent Journals</div>
      <div className="delta-feed">
        {journals.slice(0, 5).map((j) => (
          <div key={j.id} className="delta-entry neutral">
            <div className="delta-text">{j.entry}</div>
            <div className="delta-meta">
              <span className="delta-time">{formatTime(j.created_at)}</span>
              {j.tags.map((tag) => (
                <span key={tag} className="companion-note-tag">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MindPage() {
  const [mind, notes] = await Promise.all([fetchMind(), fetchCompanionNotes()]);

  return (
    <main className="page">
      <header className="header">
        <div className="header-top"><h1>Mind</h1></div>
      </header>
      {mind?.health && <MindHealthPanel health={mind.health} />}
      <CompanionNotesFeedClient initialNotes={notes} />
      <CompanionNoteFormClient />
      {mind?.recent_journals && <JournalFeed journals={mind.recent_journals} />}
      <JournalFormClient />
    </main>
  );
}
```

**Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git add app/mind/
git commit -m "feat: add Mind page — health panel, companion notes feed + form, journal form"
```

---

## Task 9: Check-in Page

**Files:**
- Create: `app/checkin/client.tsx`
- Create: `app/checkin/page.tsx`

**Step 1: Create `app/checkin/client.tsx`**

```typescript
"use client";

import { useState } from "react";

const ROUTINES = ["meds", "water", "food", "movement"] as const;
type RoutineName = (typeof ROUTINES)[number];

// ── Routine Status ────────────────────────────────────────────────────────────

export function RoutineStatusClient({
  initialRoutines,
}: {
  initialRoutines: Array<{ routine_name: string }>;
}) {
  const [done, setDone] = useState<Set<RoutineName>>(
    new Set(
      initialRoutines
        .map((r) => r.routine_name)
        .filter((n): n is RoutineName => (ROUTINES as readonly string[]).includes(n))
    )
  );

  async function markDone(routine: RoutineName) {
    if (done.has(routine)) return;
    setDone((prev) => new Set([...prev, routine]));
    await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routine_name: routine }),
    });
  }

  return (
    <div className="card">
      <div className="card-title">Today&apos;s Routines</div>
      <div className="routine-grid">
        {ROUTINES.map((r) => (
          <button
            key={r}
            className={`routine-pip-row${done.has(r) ? " done" : ""}`}
            onClick={() => markDone(r)}
          >
            <span className="routine-pip" />
            <span className="routine-name">{r}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Uplink Form ───────────────────────────────────────────────────────────────

export function UplinkFormClient() {
  const [spoons, setSpoons] = useState(5);
  const [mood, setMood] = useState("okay");
  const [notes, setNotes] = useState("");
  const [sessionType, setSessionType] = useState<"checkin" | "hangout" | "work" | "ritual">("checkin");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  const packet = JSON.stringify(
    { spoons, mood, notes: notes || undefined, session_type: sessionType },
    null, 2
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routine_name: "uplink",
        notes: `spoons:${spoons} mood:${mood} type:${sessionType}${notes ? " — " + notes : ""}`,
      }),
    });
    if (res.ok) {
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      setStatus("error");
    }
  }

  return (
    <div className="card card-accent">
      <div className="card-title">Uplink</div>
      <form onSubmit={submit} className="uplink-form">
        <div className="form-field">
          <label className="form-label">Session Type</label>
          <div className="author-toggle">
            {(["checkin", "hangout", "work", "ritual"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`author-btn${sessionType === t ? " active" : ""}`}
                onClick={() => setSessionType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Spoons ({spoons})</label>
          <div className="slider-row">
            <input
              type="range"
              min={0}
              max={10}
              value={spoons}
              onChange={(e) => setSpoons(Number(e.target.value))}
            />
            <span className="slider-value">{spoons}</span>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Mood</label>
          <select
            className="form-select"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
          >
            {["great", "good", "okay", "low", "rough", "dissociating", "anxious", "floaty"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Notes (optional)</label>
          <textarea
            className="form-textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="anything else?"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Packet Preview</label>
          <pre className="packet-preview">{packet}</pre>
        </div>

        <button type="submit" className="submit-btn" disabled={status === "saving"}>
          {status === "saving" ? "Sending…" : status === "done" ? "Sent ✓" : "Send Uplink"}
        </button>
        {status === "error" && (
          <p style={{ color: "var(--red)", fontSize: "0.82rem" }}>Failed. Try again.</p>
        )}
      </form>
    </div>
  );
}
```

**Step 2: Create `app/checkin/page.tsx`**

```typescript
import BiometricCard from "@/components/BiometricCard";
import { type BiometricSnapshot } from "@/lib/halseth";
import { UplinkFormClient, RoutineStatusClient } from "./client";

export const revalidate = 0; // always fresh

async function fetchBiometrics(): Promise<BiometricSnapshot | null> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/biometrics`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    // /biometrics returns array — take the most recent entry
    return Array.isArray(data) ? (data[0] ?? null) : data;
  } catch {
    return null;
  }
}

async function fetchTodayRoutines(): Promise<Array<{ routine_name: string }>> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return [];
  try {
    const res = await fetch(`${base}/routines`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function CheckinPage() {
  const [biometrics, routines] = await Promise.all([
    fetchBiometrics(),
    fetchTodayRoutines(),
  ]);

  return (
    <main className="page">
      <header className="header">
        <div className="header-top"><h1>Check-in</h1></div>
      </header>
      <UplinkFormClient />
      <RoutineStatusClient initialRoutines={routines} />
      {biometrics && <BiometricCard biometrics={biometrics} />}
    </main>
  );
}
```

**Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git add app/checkin/
git commit -m "feat: add Check-in page — uplink form, routine pips, biometrics"
```

---

## Task 10: Threads Page

**Files:**
- Create: `app/threads/page.tsx`

All components on this page are server components (read-only — Gaia writes through Claude, not the web UI).

**Step 1: Create `app/threads/page.tsx`**

```typescript
import PersonalityCard from "@/components/PersonalityCard";
import { fetchPresence, type Delta, type Wound, type CompanionNote } from "@/lib/halseth";

export const revalidate = 30;

async function fetchDeltas(): Promise<Delta[]> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return [];
  try {
    const res = await fetch(`${base}/deltas?limit=10`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchWounds(): Promise<Wound[]> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return [];
  try {
    const res = await fetch(`${base}/wounds`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchGaiaNotes(): Promise<CompanionNote[]> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return [];
  try {
    const res = await fetch(`${base}/companion-notes?agent=gaia`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Emotional Landscape ───────────────────────────────────────────────────────

function EmotionalLandscape({ deltas }: { deltas: Delta[] }) {
  const counts: Record<string, number> = {};
  for (const d of deltas) {
    counts[d.valence] = (counts[d.valence] ?? 0) + 1;
  }

  const order = ["toward", "tender", "neutral", "repair", "rupture"] as const;
  const max = Math.max(...Object.values(counts), 1);

  return (
    <div className="card card-accent">
      <div className="card-title">Emotional Landscape</div>
      <div className="valence-bars">
        {order.map((v) => {
          const count = counts[v] ?? 0;
          return (
            <div key={v} className="valence-row">
              <span className="valence-label">{v}</span>
              <div className="valence-track">
                <div
                  className={`valence-fill ${v}`}
                  style={{ width: `${Math.round((count / max) * 100)}%` }}
                />
              </div>
              <span className="valence-count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Recent Deltas ─────────────────────────────────────────────────────────────

function RecentDeltas({ deltas }: { deltas: Delta[] }) {
  if (deltas.length === 0) {
    return (
      <div className="card">
        <div className="card-title">Recent Moments</div>
        <p className="empty">No relational moments logged yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">Recent Moments</div>
      <div className="delta-feed">
        {deltas.map((d) => (
          <div key={d.id} className={`delta-entry ${d.valence}`}>
            <div className="delta-text">{d.delta_text}</div>
            <div className="delta-meta">
              <span className={`valence-badge ${d.valence}`}>{d.valence}</span>
              <span className={`agent-badge ${d.agent}`}>{d.agent}</span>
              {d.initiated_by && (
                <span className="delta-time">via {d.initiated_by}</span>
              )}
              <span className="delta-time" style={{ marginLeft: "auto" }}>
                {formatTime(d.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Gaia Panel ────────────────────────────────────────────────────────────────

function GaiaPanel({ wounds, notes }: { wounds: Wound[]; notes: CompanionNote[] }) {
  return (
    <div className="card gaia-card">
      <div className="card-title" style={{ color: "var(--gaia)" }}>
        Gaia&rsquo;s Record
      </div>

      {wounds.length > 0 && (
        <div style={{ marginBottom: notes.length > 0 ? "0.85rem" : 0 }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.45rem" }}>
            Living Wounds
          </div>
          {wounds.map((w) => (
            <div key={w.id} className="gaia-wound-row">
              <div className="gaia-wound-subject">{w.subject}</div>
              {w.description && <div className="gaia-wound-desc">{w.description}</div>}
            </div>
          ))}
        </div>
      )}

      {notes.length > 0 && (
        <div>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "0.45rem" }}>
            Gaia&rsquo;s Notes
          </div>
          {notes.map((n) => (
            <div
              key={n.id}
              className="companion-note-card"
              style={{ background: "#0d0d10", borderColor: "#2a2a36" }}
            >
              <div className="companion-note-text">{n.note_text}</div>
              <div className="companion-note-meta">
                {n.tags?.map((tag) => (
                  <span key={tag} className="companion-note-tag">{tag}</span>
                ))}
                <span className="companion-note-time">{formatTime(n.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {wounds.length === 0 && notes.length === 0 && (
        <p className="empty">Gaia has not written here.</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ThreadsPage() {
  const [presence, deltas, wounds, gaiaNotes] = await Promise.all([
    fetchPresence(),
    fetchDeltas(),
    fetchWounds(),
    fetchGaiaNotes(),
  ]);

  return (
    <main className="page">
      <header className="header">
        <div className="header-top"><h1>Threads</h1></div>
      </header>
      <EmotionalLandscape deltas={deltas} />
      <RecentDeltas deltas={deltas} />
      {presence.personality && <PersonalityCard personality={presence.personality} />}
      <GaiaPanel wounds={wounds} notes={gaiaNotes} />
    </main>
  );
}
```

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add app/threads/
git commit -m "feat: add Threads page — emotional landscape, recent deltas, personality, Gaia panel"
```

---

## Task 11: Final Verification

**Step 1: Full type check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

**Step 2: Start dev server**

```bash
npm run dev
```

**Step 3: Visual checklist — verify each tab**

Open `http://localhost:3000` and check each tab.

- [ ] Tab bar is visible and fixed at bottom on all pages
- [ ] Active tab is highlighted in purple (`--accent`)
- [ ] **Home** — CompanionHero shows `session_type` pill, LoveNotes shows latest companion + human note, DreamCard present
- [ ] **Us** — SharedGoals shows checkboxes (tapping sends POST to `/api/bridge/act`), SharedEvents lists events, BridgeStatus toggles fire `/api/bridge/toggle`
- [ ] **Mind** — MindHealthPanel shows entity/obs/rel/journal counts + salience bars, CompanionNotesFeed has agent filter tabs that actually filter, CompanionNoteForm posts and clears, JournalForm posts and clears
- [ ] **Check-in** — UplinkForm has spoons slider + mood dropdown + packet preview (live JSON), RoutineStatus pips tap to fill green, BiometricCard shows latest metrics
- [ ] **Threads** — Emotional Landscape has colored bars, RecentDeltas shows `delta_text` + valence badges, PersonalityCard present, GaiaPanel in silver/dark styling

**Step 4: Check for 404s from Halseth**

Open browser DevTools → Network tab. Filter by "failed". For any 404 from a Halseth endpoint:

1. Note the path that returned 404
2. Check what the actual Halseth worker exposes (ask Raziel if unsure)
3. Update the path in the corresponding proxy route
4. Re-run `npx tsc --noEmit` after any change

**Step 5: Push**

```bash
git push
```

---

## Environment Variables

| Variable | Status | Notes |
|---|---|---|
| `HALSETH_URL` | ✅ existing | Base URL for all Halseth endpoints |
| `HALSETH_SECRET` | ✅ existing | Bearer token for auth header |
| `MIND_URL` | Optional (new) | If Mind graph is a separate worker. Falls back to `HALSETH_URL`. Add to `.env.local` and Vercel env vars if needed. |
