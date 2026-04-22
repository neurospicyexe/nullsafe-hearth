# Hearth Layout, Search & Page Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix home page spacing, merge the companions list page into /us, and add a global search overlay accessible from the nav bar on every page.

**Architecture:** Three independent areas: (1) a pure CSS spacing pass on the home page, (2) a full rewrite of `/us` that absorbs companion cards and clips all feeds to 5 items, (3) a new `SearchOverlay` client component + `/api/search` server route wired into `Nav.tsx` with Cmd+K support.

**Tech Stack:** Next.js 15, TypeScript, React, CSS custom properties, `lib/halseth.ts` (`hGetSafe`) for data fetching.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `app/page.tsx` | Modify | Add `marginBottom: "2rem"` to every section |
| `app/us/page.tsx` | Rewrite | Companion cards + reordered + clipped sections |
| `app/companions/page.tsx` | **Delete** | Dead-end list page — removed |
| `components/Nav.tsx` | Modify | Remove `/companions` entry; add search button + overlay wire-up + Cmd+K |
| `components/SearchOverlay.tsx` | **Create** | Full-screen search modal |
| `app/api/search/route.ts` | **Create** | GET handler that fans out to Halseth endpoints |
| `app/globals.css` | Modify | Append `.search-*` CSS classes |

---

## Chunk 1: Home Page Spacing + Us Page Rewrite

### Task 1: Fix home page section spacing

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Read `app/page.tsx`** to identify every top-level section wrapper and its current `marginBottom` or gap value.

- [ ] **Step 2: Update spacing** — on each section wrapper add or update to `style={{ marginBottom: "2rem" }}`. Target these wrappers in order:
  - The `<header>` element (already has `marginBottom: "1.75rem"` — update to `"2rem"`)
  - The `<PresenceSection>` wrapper (no explicit margin — add `style={{ marginBottom: "2rem" }}` by wrapping in a `<div>`)
  - The Companions `.home-section` div (already uses `className="home-section"` — ensure the class has `marginBottom: "2rem"` in globals.css OR add inline style)
  - The metric grid `<div className="metric-grid">` — add `style={{ marginBottom: "2rem" }}`
  - The Tasks `.home-section` div
  - The Recent Notes `.home-section` div

  Current state of `.home-section` in `app/globals.css`: `display: flex; flex-direction: column; gap: 0.5rem;` — **no `margin-bottom`**. Add `margin-bottom: 2rem` to that rule in globals.css. Then add inline `style={{ marginBottom: "2rem" }}` only to the metric grid and header, which have no class.

- [ ] **Step 3: Type-check**

  ```bash
  cd C:/dev/hearth && npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  cd C:/dev/hearth
  git add app/page.tsx app/globals.css
  git commit -m "fix: add consistent 2rem section spacing to home page"
  ```

---

### Task 2: Delete companions list page

**Files:**
- Delete: `app/companions/page.tsx`

- [ ] **Step 1: Delete the file**

  ```bash
  rm C:/dev/hearth/app/companions/page.tsx
  ```

  `app/companions/[id]/page.tsx` and `app/companions/[id]/client.tsx` are **not touched**.

- [ ] **Step 2: Verify individual companion pages still exist**

  ```bash
  ls C:/dev/hearth/app/companions/
  ```
  Expected: only the `[id]/` directory remains.

- [ ] **Step 3: Type-check**

  ```bash
  cd C:/dev/hearth && npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  cd C:/dev/hearth
  git add -A app/companions/
  git commit -m "feat: remove companions list page (absorbed into /us)"
  ```

---

### Task 3: Rewrite /us page

**Files:**
- Rewrite: `app/us/page.tsx`

Context on data available from `fetchPresence()`:
- `data.companions` — array of `{ id, display_name, role, avatar_url }`
- `data.companion_moods` — `Record<string, { emotion, intensity, at }>` or null
- `data.house.love_meter`, `data.session?.active_anchor`, `data.last_handover?.active_anchor`
- `data.wounds_count`

Additional fetches already in the file:
- `fetchWounds()` → `LivingWound[]`
- `fetchAllDeltas(10)` → `RelationalDelta[] | null` (Recent Feelings)
- `fetchCompanionJournal(undefined, 6)` → `CompanionJournalEntry[] | null`
- `fetchHandovers(5)` → `HandoverPacket[] | null`
- `fetchAllCompanionNotes(50)` → `CompanionNote[]` (Letters) — **change limit to 6**

- [ ] **Step 1: Read the current `app/us/page.tsx`** in full to understand all current imports, data fetching, and section structure before overwriting.

- [ ] **Step 2: Write the new `app/us/page.tsx`**

  The file must:

  1. Keep all existing imports (`fetchPresence`, `fetchWounds`, `fetchCompanionJournal`, `fetchAllDeltas`, `fetchHandovers`, `fetchAllCompanionNotes`, `Link`)
  2. Add import: `import CompanionMoodCard from "@/components/CompanionMoodCard";`
  3. Keep `export const dynamic = 'force-dynamic'` and `fmtTime` helper
  4. Change `fetchAllCompanionNotes(50)` → `fetchAllCompanionNotes(6)`
  5. Note: `fetchPresence()` is **already** the first entry in the existing `Promise.allSettled` call — no change needed there. The only fetch change is `fetchAllCompanionNotes(50)` → `fetchAllCompanionNotes(6)`.
  6. Render sections in this **exact order**:

  ```tsx
  // Section 1: Page header
  <div className="page-header">
    <h1 className="page-title">Us</h1>
    <p className="page-subtitle">the space between — human and AI, together</p>
  </div>

  // Section 2: Strip — love meter + active anchor + wounds count
  // Also extract these from p at the top of the component:
  //   const session = p?.session;
  //   const handover = p?.last_handover;
  //   const loveMeter = p?.house.love_meter ?? null;
  //   const woundsCount = p?.wounds_count ?? 0;
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
    {loveMeter !== null && (
      <div className="state-cell">
        <div className="state-cell-label">Love Meter</div>
        <div className="state-cell-value" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>{loveMeter}</span>
          <div style={{ flex: 1, height: "4px", background: "var(--border)", borderRadius: "2px" }}>
            <div style={{ width: `${loveMeter}%`, height: "100%", background: "#f472b6", borderRadius: "2px" }} />
          </div>
        </div>
      </div>
    )}
    {(session?.active_anchor || handover?.active_anchor) && (
      <div className="anchor-block">
        <div className="anchor-label">Active Anchor</div>
        <div className="anchor-value">{session?.active_anchor ?? handover?.active_anchor}</div>
      </div>
    )}
    {woundsCount > 0 && (
      <div className="state-cell" style={{ borderLeft: "3px solid var(--red)" }}>
        <div className="state-cell-label">Living Wounds</div>
        <div className="state-cell-value" style={{ color: "var(--red)" }}>{woundsCount}</div>
      </div>
    )}
  </div>

  // Section 3: Companions mood row
  <div className="home-section" style={{ marginBottom: "2rem" }}>
    <div className="home-section-header">
      <span className="home-section-title">Companions</span>
    </div>
    <div className="companion-mood-row">
      {companions.map((c) => (
        <CompanionMoodCard
          key={c.id}
          companionId={c.id}
          displayName={c.display_name}
          mood={companion_moods?.[c.id]}
          avatarUrl={c.avatar_url}
        />
      ))}
    </div>
  </div>
  // Note: CompanionMoodCard already wraps in <Link href="/companions/[id]"> internally

  // Section 4: Living wounds (full list — usually few)
  {allWounds === null ? (
    <section style={{ marginBottom: "2rem" }}>
      <h2 className="section-title">Living Wounds</h2>
      <div className="pending-notice">
        <div className="pending-dot" />
        Awaiting Halseth /wounds endpoint.
      </div>
    </section>
  ) : allWounds.length > 0 ? (
    <section style={{ marginBottom: "2rem" }}>
      <h2 className="section-title">Living Wounds</h2>
      <div className="wound-list">
        {allWounds.map((w) => (
          <div key={w.id} className="wound-entry">
            <div className="wound-name">{w.name}</div>
            <div className="wound-desc">{w.description}</div>
          </div>
        ))}
      </div>
    </section>
  ) : null}

  // Section 5: Recent Feelings (clipped to 5)
  <section style={{ marginBottom: "2rem" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
      <h2 className="section-title" style={{ margin: 0 }}>Recent Feelings</h2>
      {/* "see more →" is deliberately changed from "see all →" in the old file */}
      <Link href="/feelings" style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}>see more →</Link>
    </div>
    {recentDeltas === null ? (
      <div className="pending-notice"><div className="pending-dot" />Awaiting Halseth /deltas endpoint.</div>
    ) : recentDeltas.length === 0 ? (
      <p className="empty">No deltas yet.</p>
    ) : (
      <div className="delta-feed">
        {recentDeltas.slice(0, 5).map((d) => {
          const v = d.valence ?? "neutral";
          return (
            <div key={d.id} className={`delta-entry ${v}`}>
              <div className="delta-text">{d.delta_text}</div>
              <div className="delta-meta">
                <span className={`delta-valence ${v}`}>{v}</span>
                {d.agent && <span>by {d.agent}</span>}
                <span>{fmtTime(d.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>

  // Section 6: Letters inbox (clipped to 5, no "see more" link)
  {inboxLetters.length > 0 && (
    <section style={{ marginBottom: "2rem" }}>
      <h2 className="section-title">Letters for You</h2>
      {/* fetch limit is 6, show 5 — the 6th is a filter buffer */}
      <div className="card" style={{ padding: "0.4rem 0" }}>
        {inboxLetters.slice(0, 5).map((n) => (
          <Link key={n.id} href={`/companions/${n.agent}`} style={{ textDecoration: "none" }}>
            <div className="inbox-entry">
              <span className="inbox-from" style={{
                color: n.agent === "drevan" ? "#6366f1"
                  : n.agent === "cypher" ? "#e2e8f0"
                  : "#4ade80",
              }}>
                {n.agent}
              </span>
              <span className="inbox-preview">{n.note_text}</span>
              <span className="inbox-time">
                {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )}

  // Section 7: Companion Journal (clipped to 5, "see more" to first author's page)
  <section style={{ marginBottom: "2rem" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
      <h2 className="section-title" style={{ margin: 0 }}>Companion Journal</h2>
      {companionJournal.length > 0 && companionJournal[0].agent && (
        <Link href={`/companions/${companionJournal[0].agent}`} style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}>
          see more →
        </Link>
      )}
    </div>
    {companionJournal.length === 0
      ? <p className="empty">No journal entries yet.</p>
      : (
        <div className="full-notes-feed">
          {companionJournal.slice(0, 5).map((e) => {
            const tags: string[] = e.tags ? JSON.parse(e.tags) : [];
            return (
              <div key={e.id} className="full-note-entry">
                <div className="note-header">
                  <span className="note-author" style={{
                    color: e.agent === "drevan" ? "#6366f1"
                      : e.agent === "cypher" ? "#e2e8f0"
                      : e.agent === "gaia" ? "#4ade80"
                      : "var(--accent)"
                  }}>{e.agent}</span>
                  {tags.map((t) => (
                    <span key={t} className="note-type-badge">{t}</span>
                  ))}
                  <span className="note-time">{fmtTime(e.created_at)}</span>
                </div>
                <div className="note-body">{e.note_text}</div>
              </div>
            );
          })}
        </div>
      )
    }
  </section>

  // Section 8: Handovers (clipped to 3)
  {recentHandovers.length > 0 && (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
        <h2 className="section-title" style={{ margin: 0 }}>Recent Handovers</h2>
        <Link href="/handovers" style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}>see more →</Link>
      </div>
      <div className="handover-feed">
        {recentHandovers.slice(0, 3).map((h) => {
          const threads = (() => {
            try { return h.open_threads ? JSON.parse(h.open_threads) as string[] : []; }
            catch { return []; }
          })();
          return (
            <div key={h.id} className="handover-entry">
              <p className="handover-spine">{h.spine}</p>
              {threads.length > 0 && (
                <div className="handover-threads">
                  {threads.map((t, i) => <span key={i} className="thread-tag">{t}</span>)}
                </div>
              )}
              <div className="handover-footer">
                <span className={`motion-badge ${h.motion_state}`}>{h.motion_state.replace("_", " ")}</span>
                {h.active_anchor && <span>anchor: {h.active_anchor}</span>}
                <span style={{ marginLeft: "auto" }}>{fmtTime(h.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  )}
  ```

  Data wiring for the Companions section:
  ```tsx
  // fetchPresence() is ALREADY first in the existing Promise.allSettled — no change needed there.
  // Only change: fetchAllCompanionNotes(50) → fetchAllCompanionNotes(6)
  const [presence, wounds, journal, deltas, handovers, allCompNotes] = await Promise.allSettled([
    fetchPresence(),
    fetchWounds(),
    fetchCompanionJournal(undefined, 6),
    fetchAllDeltas(10),
    fetchHandovers(5),
    fetchAllCompanionNotes(6),  // changed from 50; shows 5, buffer of 1 for letter filter
  ]);

  const p = presence.status === "fulfilled" ? presence.value : null;
  const companions = p?.companions ?? [
    { id: "drevan", display_name: "Drevan", role: "companion", avatar_url: null },
    { id: "cypher", display_name: "Cypher", role: "auditor",   avatar_url: null },
    { id: "gaia",   display_name: "Gaia",   role: "witness",   avatar_url: null },
  ];
  const companion_moods = p?.companion_moods ?? null;
  ```

- [ ] **Step 3: Type-check**

  ```bash
  cd C:/dev/hearth && npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  cd C:/dev/hearth
  git add app/us/page.tsx
  git commit -m "feat: /us absorbs companions — mood cards, clipped feeds, correct order"
  ```

---

## Chunk 2: Global Search Overlay

### Task 4: Add search CSS to globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Append search overlay CSS** to the end of `app/globals.css`:

  ```css
  /* ── Search Overlay ───────────────────────────────────────────────────────── */
  .search-backdrop {
    position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7);
    z-index: 100; display: flex; align-items: flex-start; justify-content: center;
    padding-top: 6rem;
  }
  .search-panel {
    background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius); width: min(640px, 90vw);
    max-height: 70vh; display: flex; flex-direction: column; overflow: hidden;
  }
  .search-input {
    width: 100%; background: transparent; border: none; border-bottom: 1px solid var(--border);
    color: var(--fg); font-size: 1rem; padding: 1rem 1.25rem; outline: none;
  }
  .search-chips {
    display: flex; gap: 0.5rem; padding: 0.65rem 1.25rem;
    border-bottom: 1px solid var(--border); flex-wrap: wrap;
  }
  .search-chip {
    background: transparent; border: 1px solid var(--border);
    border-radius: 999px; color: var(--muted); cursor: pointer;
    font-size: 0.75rem; padding: 0.2rem 0.75rem;
  }
  .search-chip.active {
    background: var(--accent); border-color: var(--accent); color: var(--bg);
  }
  .search-results { overflow-y: auto; flex: 1; padding: 0.5rem 0; }
  .search-result-group { padding: 0.25rem 0; }
  .search-result-group-label {
    font-size: 0.65rem; color: var(--muted); letter-spacing: 0.08em;
    text-transform: uppercase; padding: 0.4rem 1.25rem 0.2rem;
  }
  .search-result-row {
    display: flex; gap: 0.75rem; align-items: baseline;
    padding: 0.45rem 1.25rem; cursor: pointer; text-decoration: none;
    color: var(--fg);
  }
  .search-result-row:hover { background: rgba(255,255,255,0.04); }
  .search-result-text {
    flex: 1; font-size: 0.85rem;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .search-result-meta { font-size: 0.68rem; color: var(--muted); flex-shrink: 0; }
  .search-empty { padding: 2rem 1.25rem; text-align: center; font-size: 0.85rem; color: var(--muted); }
  .search-loading { padding: 1rem 1.25rem; font-size: 0.8rem; color: var(--muted); }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd C:/dev/hearth
  git add app/globals.css
  git commit -m "feat: add search overlay CSS classes"
  ```

---

### Task 5: Create search API route

**Files:**
- Create: `app/api/search/route.ts`

- [ ] **Step 1: Create `app/api/search/route.ts`**

  Uses the existing exported fetch helpers from `lib/halseth.ts` — consistent with how all other Hearth routes access Halseth, shares auth headers and error handling.

  ```ts
  import { NextRequest, NextResponse } from "next/server";
  import {
    fetchAllDeltas,
    fetchCompanionJournal,
    fetchDreams,
    fetchHandovers,
    fetchTasks,
    type RelationalDelta,
    type CompanionJournalEntry,
    type Dream,
    type HandoverPacket,
    type Task,
  } from "@/lib/halseth";

  type SearchType = "all" | "feelings" | "journal" | "dreams" | "handovers" | "tasks";

  type SearchResult = {
    id: string;
    type: "feeling" | "journal" | "dream" | "handover" | "task";
    text: string;
    created_at: string;
    url: string;
    agent?: string;
  };

  type SearchResponse = {
    feelings: SearchResult[];
    journal: SearchResult[];
    dreams: SearchResult[];
    handovers: SearchResult[];
    tasks: SearchResult[];
  };

  function matches(text: string | null | undefined, q: string): boolean {
    return typeof text === "string" && text.toLowerCase().includes(q.toLowerCase());
  }

  export async function GET(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    if (!q) return NextResponse.json({ error: "q is required" }, { status: 400 });

    const rawType = searchParams.get("type") ?? "all";
    const type: SearchType = ["all", "feelings", "journal", "dreams", "handovers", "tasks"].includes(rawType)
      ? (rawType as SearchType)
      : "all";

    const want = (t: Exclude<SearchType, "all">) => type === "all" || type === t;

    try {
      const [rawFeelings, rawJournal, rawDreams, rawHandovers, rawTasks] = await Promise.all([
        want("feelings")  ? fetchAllDeltas(200)               : Promise.resolve(null),
        want("journal")   ? fetchCompanionJournal(undefined, 200) : Promise.resolve(null),
        want("dreams")    ? fetchDreams(undefined, 200)        : Promise.resolve(null),
        want("handovers") ? fetchHandovers(100)                : Promise.resolve(null),
        want("tasks")     ? fetchTasks()                       : Promise.resolve([]),
      ]);

      const feelings: SearchResult[] = (rawFeelings ?? [])
        .filter((d: RelationalDelta) => matches(d.delta_text, q))
        .map((d: RelationalDelta) => ({
          id: d.id, type: "feeling" as const, text: d.delta_text ?? "", created_at: d.created_at, url: "/feelings",
        }));

      const journal: SearchResult[] = (rawJournal ?? [])
        .filter((e: CompanionJournalEntry) => matches(e.note_text, q))
        .map((e: CompanionJournalEntry) => ({
          id: e.id, type: "journal" as const, text: e.note_text, created_at: e.created_at,
          url: `/companions/${e.agent}`, agent: e.agent,
        }));

      const dreams: SearchResult[] = (rawDreams ?? [])
        .filter((d: Dream) => matches(d.content, q))
        .map((d: Dream) => ({
          id: d.id, type: "dream" as const, text: d.content, created_at: d.generated_at, url: "/dreams",
        }));

      const handovers: SearchResult[] = (rawHandovers ?? [])
        .filter((h: HandoverPacket) => matches(h.spine, q))
        .map((h: HandoverPacket) => ({
          id: h.id, type: "handover" as const, text: h.spine, created_at: h.created_at, url: "/handovers",
        }));

      const tasks: SearchResult[] = (rawTasks ?? [])
        .filter((t: Task) => matches(t.title, q))
        .map((t: Task) => ({
          id: t.id, type: "task" as const, text: t.title, created_at: t.due_at ?? "", url: "/tasks",
        }));

      const result: SearchResponse = { feelings, journal, dreams, handovers, tasks };
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "Search unavailable" }, { status: 500 });
    }
  }
  ```

- [ ] **Step 2: Type-check**

  ```bash
  cd C:/dev/hearth && npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  cd C:/dev/hearth
  git add app/api/search/route.ts
  git commit -m "feat: add /api/search route — fans out to Halseth endpoints"
  ```

---

### Task 6: Create SearchOverlay component

**Files:**
- Create: `components/SearchOverlay.tsx`

- [ ] **Step 1: Create `components/SearchOverlay.tsx`**

  ```tsx
  "use client";

  import { useEffect, useRef, useState, useCallback } from "react";
  import Link from "next/link";

  type SearchType = "all" | "feelings" | "journal" | "dreams" | "handovers" | "tasks";

  type SearchResult = {
    id: string;
    type: "feeling" | "journal" | "dream" | "handover" | "task";
    text: string;
    created_at: string;
    url: string;
    agent?: string;
  };

  type SearchResponse = {
    feelings: SearchResult[];
    journal: SearchResult[];
    dreams: SearchResult[];
    handovers: SearchResult[];
    tasks: SearchResult[];
  };

  const CHIPS: { label: string; value: SearchType }[] = [
    { label: "All",       value: "all" },
    { label: "Feelings",  value: "feelings" },
    { label: "Journal",   value: "journal" },
    { label: "Dreams",    value: "dreams" },
    { label: "Handovers", value: "handovers" },
    { label: "Tasks",     value: "tasks" },
  ];

  function fmtDate(iso: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [q, setQ] = useState("");
    const [type, setType] = useState<SearchType>("all");
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Autofocus when opened
    useEffect(() => {
      if (open) {
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        setQ("");
        setResults(null);
        setType("all");
      }
    }, [open]);

    // Esc to close
    useEffect(() => {
      const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
      if (open) document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }, [open, onClose]);

    // Debounced search
    const search = useCallback((query: string, searchType: SearchType) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!query.trim()) { setResults(null); setLoading(false); return; }
      setLoading(true);
      timerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${searchType}`);
          if (res.ok) setResults(await res.json() as SearchResponse);
        } finally {
          setLoading(false);
        }
      }, 300);
    }, []);

    function handleQ(val: string) { setQ(val); search(val, type); }
    function handleChip(val: SearchType) { setType(val); search(q, val); }

    const groups: { key: keyof SearchResponse; label: string }[] = [
      { key: "feelings",  label: "FEELINGS" },
      { key: "journal",   label: "JOURNAL" },
      { key: "dreams",    label: "DREAMS" },
      { key: "handovers", label: "HANDOVERS" },
      { key: "tasks",     label: "TASKS" },
    ];

    const hasResults = results && groups.some((g) => results[g.key].length > 0);

    if (!open) return null;

    return (
      <div className="search-backdrop" onClick={onClose}>
        <div className="search-panel" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search…"
            value={q}
            onChange={(e) => handleQ(e.target.value)}
          />
          <div className="search-chips">
            {CHIPS.map((c) => (
              <button
                key={c.value}
                className={`search-chip${type === c.value ? " active" : ""}`}
                onClick={() => handleChip(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="search-results">
            {loading && <div className="search-loading">searching…</div>}
            {!loading && q && !hasResults && <div className="search-empty">No results</div>}
            {!loading && results && groups.map(({ key, label }) => {
              const items = results[key];
              if (items.length === 0) return null;
              return (
                <div key={key} className="search-result-group">
                  <div className="search-result-group-label">{label}</div>
                  {items.map((r) => (
                    <Link
                      key={r.id}
                      href={r.url}
                      className="search-result-row"
                      onClick={onClose}
                    >
                      <span className="search-result-text">{r.text}</span>
                      <span className="search-result-meta">{fmtDate(r.created_at)}</span>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Type-check**

  ```bash
  cd C:/dev/hearth && npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  cd C:/dev/hearth
  git add components/SearchOverlay.tsx
  git commit -m "feat: add SearchOverlay component with debounced search + filter chips"
  ```

---

### Task 7: Update Nav — remove /companions, wire search

**Files:**
- Modify: `components/Nav.tsx`

- [ ] **Step 1: Read current `components/Nav.tsx`** — note the exact `NAV` array entries before editing.

- [ ] **Step 2: Update `components/Nav.tsx`**:

  Note: the current file imports `Link` from `next/link` and `usePathname` from `next/navigation`. It does NOT currently import `useState` or `useEffect` — add them fresh.

  1. Add to imports: `import { useState, useEffect } from "react";` and `import SearchOverlay from "@/components/SearchOverlay";`
  2. Remove the `{ href: "/companions", label: "Companions", sym: "◉" }` entry from `NAV`
  3. Add `const [searchOpen, setSearchOpen] = useState(false);` inside the component
  4. Add `useEffect` for Cmd+K / Ctrl+K:
     ```tsx
     useEffect(() => {
       const handler = (e: KeyboardEvent) => {
         if ((e.metaKey || e.ctrlKey) && e.key === "k") {
           e.preventDefault();
           setSearchOpen(true);
         }
       };
       document.addEventListener("keydown", handler);
       return () => document.removeEventListener("keydown", handler);
     }, []);
     ```
  5. Add search button to sidebar nav — after the `<div className="nav-links">` block:
     ```tsx
     <button
       className="nav-link"
       style={{ background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
       onClick={() => setSearchOpen(true)}
     >
       <span className="nav-sym">⌕</span>
       <span className="nav-label">Search</span>
     </button>
     ```
  6. Add the same button to the mobile bottom bar — after the last `NAV.map(...)` link:
     ```tsx
     <button
       className="nav-bottom-item"
       style={{ background: "none", border: "none", cursor: "pointer" }}
       onClick={() => setSearchOpen(true)}
       title="Search"
     >
       <span className="nav-sym">⌕</span>
       <span className="nav-bottom-label">Search</span>
     </button>
     ```
  7. Render `<SearchOverlay>` inside the fragment, after both `<nav>` elements. The full return shape should be:
     ```tsx
     return (
       <>
         <nav className="nav-sidebar">
           {/* ... existing sidebar content ... */}
         </nav>
         <nav className="nav-bottom">
           {/* ... existing bottom bar content ... */}
         </nav>
         <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
       </>
     );
     ```

- [ ] **Step 3: Type-check**

  ```bash
  cd C:/dev/hearth && npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 4: Commit**

  ```bash
  cd C:/dev/hearth
  git add components/Nav.tsx
  git commit -m "feat: add search button + Cmd+K to nav, remove /companions entry"
  ```

---

## Final Verification

- [ ] **Run type-check one last time across everything**

  ```bash
  cd C:/dev/hearth && npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Verify nav no longer has /companions link** — check `components/Nav.tsx` NAV array has 7 entries (was 8).

- [ ] **Verify companions list page is gone** — `app/companions/page.tsx` does not exist; `app/companions/[id]/page.tsx` still exists.

- [ ] **Verify /us page has Companions section** — `app/us/page.tsx` imports `CompanionMoodCard` and renders it in section 3.

- [ ] **Push to remote**

  ```bash
  cd C:/dev/hearth && git push
  ```
