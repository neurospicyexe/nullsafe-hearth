# Hearth UI — Layout, Search & Page Consolidation

**Date:** 2026-03-12
**Status:** Approved
**Scope:** Hearth Next.js frontend (`C:/dev/hearth`)

---

## Goals

1. Fix cramped spacing on the home page.
2. Merge the dead-end `/companions` list page into `/us` so relational content lives in one place.
3. Add a global search overlay accessible from the nav bar on every page.
4. Replace infinite scroll with 5-item clips + "see more →" throughout.

---

## 1. Home Page Spacing Fix

**Problem:** The metric grid (room/HRV/sleep cells) and the Companions mood row sit flush against each other with no visual breathing room. Other sections have similar cramping.

**Fix:** In `app/page.tsx`, ensure every home section wrapper has `marginBottom: "2rem"`. This applies to **all** sections present on the page, including any not listed below — the rule is universal:
- Header
- PresenceSection
- Companions row (`.home-section`)
- Metric grid (`.metric-grid`)
- Tasks section (`.home-section`)
- Recent Notes section (`.home-section`)
- Biometrics section if present

No layout changes — spacing only. If a section already has `marginBottom` set inline, update the value to `2rem`.

---

## 2. Us Page Absorbs Companions

### Nav changes (`components/Nav.tsx`)

The `NAV` array currently has both `/us` (label "Us") and `/companions` (label "Companions") as separate entries. Make these two changes:
1. Remove the `/companions` entry entirely.
2. Add a search button to the nav (see Section 3 — do not add a nav entry for search; it is a button, not a route).

The `/us` entry stays as-is (href, label, sym unchanged).

### Delete `app/companions/page.tsx`

The list-level companions page is deleted. Individual companion detail pages at `app/companions/[id]/page.tsx` and `app/companions/[id]/client.tsx` are **untouched**.

### Rewrite `app/us/page.tsx`

Sections rendered top-to-bottom in this exact order:

| # | Section | Content | Clip |
|---|---------|---------|------|
| 1 | Page header | Title "Us", subtitle | — |
| 2 | Strip | Love meter + Active anchor + Wounds count | — |
| 3 | **Companions** | Three `CompanionMoodCard` components; each card wrapped in `<Link href="/companions/[id]">` | — |
| 4 | Living Wounds | Full list of wounds (usually few) | — |
| 5 | Recent Feelings | Relational deltas, valence-tagged | 5 items → `see more →` `/feelings` |
| 6 | Letters inbox | Companion notes tagged `letter` | 5 items, no dedicated page — just clipped, no "see more" link |
| 7 | Companion Journal | Journal entries from all companions | 5 items → `see more →` `/companions` fallback: if no entries, omit the link |
| 8 | Handovers | Session handover summaries | 3 items → `see more →` `/handovers` |

**Section 7 "see more" fallback:** If `companionJournal` is empty, render an empty state (`"No journal entries yet."`) with no link. If entries exist, the "see more →" link goes to `/companions/[companionJournal[0].agent]` — note that `agent` in the journal response is the companion's route ID (e.g., `"drevan"`, `"cypher"`, `"gaia"`), not a display name, so this URL will always resolve to a valid detail page. If `companionJournal[0].agent` is undefined, omit the link entirely.

**Fetch limit update:** Change `fetchAllCompanionNotes(50)` to `fetchAllCompanionNotes(6)` — only 5 are shown (the 6th is a buffer for the filter).

### Companion cards on `/us`

Reuse `CompanionMoodCard` (already imported on home page). Each card:
- Shows avatar (image if set, symbol fallback) and current mood
- Is wrapped in `<Link href={"/companions/" + c.id}>` — the whole card is clickable
- Data comes from `fetchPresence()` which already returns `companions` and `companion_moods` — no new endpoints needed

---

## 3. Global Search Overlay

### Nav button (`components/Nav.tsx`)

Add a search icon button after the nav links in both the sidebar and bottom bar. This is a `<button>` (not a `<Link>`), styled to match the nav aesthetic. Clicking it sets `searchOpen` state to `true`.

`Nav.tsx` becomes a client component (`'use client'` — already is). It holds `searchOpen` state and renders `<SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />`.

Keyboard shortcut: attach a `keydown` listener in a `useEffect` — `Cmd+K` / `Ctrl+K` sets `searchOpen` to `true`.

### New component: `components/SearchOverlay.tsx` (`'use client'`)

**Props:** `open: boolean`, `onClose: () => void`

**Renders when `open` is true:**
- Fixed full-screen backdrop (dark, semi-transparent) — clicking it calls `onClose`
- Centered modal panel containing:
  - Text `<input>` — autofocused via `useEffect` when `open` becomes true
  - Filter chips row: **All · Feelings · Journal · Dreams · Handovers · Tasks** — single-select, default `all`
  - Results list (see below)
  - `Esc` keydown handler calls `onClose`

**Results behaviour:**
- Debounce input 300ms before fetching
- On input change (after debounce): `GET /api/search?q=<value>&type=<chip>`
- While fetching: show a subtle loading indicator (e.g., `"searching…"` in muted text)
- On success: render results grouped by type, each group has a small label (`FEELINGS`, `JOURNAL`, etc.)
- Each result row: type badge + text preview (truncated to 1 line) + formatted date — entire row is clickable, navigates to `result.url` and calls `onClose`
- Empty state: `"No results"` in muted text
- If `q` is empty: show nothing (no results, no loading)

**CSS classes** (add to `app/globals.css`):
`.search-backdrop`, `.search-panel`, `.search-input`, `.search-chips`, `.search-chip`, `.search-chip.active`, `.search-results`, `.search-result-group`, `.search-result-group-label`, `.search-result-row`, `.search-result-text`, `.search-result-meta`, `.search-empty`, `.search-loading`

### New API route: `app/api/search/route.ts`

**Method:** GET only

**Query params:**
- `q` (string, required) — search term; if missing or empty, return `400 { error: "q is required" }`
- `type` (string, optional) — one of `all | feelings | journal | dreams | handovers | tasks`; defaults to `all` if omitted or unrecognised

**Implementation:**
- Use `hGetSafe` from `lib/halseth.ts` for all Halseth fetches (returns `null` on error — treat null as empty array for that type)
- Fan out only to endpoints relevant to `type` (skip others)
- Filter results client-side by substring match of `q` (case-insensitive) against the field listed below
- Return `200` with shape:

```ts
{
  feelings:  Array<{ id: string; type: "feeling";  text: string; created_at: string; url: string }>;
  journal:   Array<{ id: string; type: "journal";  text: string; created_at: string; url: string; agent: string }>;
  dreams:    Array<{ id: string; type: "dream";    text: string; created_at: string; url: string }>;
  handovers: Array<{ id: string; type: "handover"; text: string; created_at: string; url: string }>;
  tasks:     Array<{ id: string; type: "task";     text: string; created_at: string; url: string }>;
}
```

**On error** (Halseth unreachable, env vars missing): return `500 { error: "Search unavailable" }`. Individual endpoint failures are silent (that type returns `[]`).

**Halseth endpoints and fields:**

| Type | Endpoint | Text field | `url` value |
|------|----------|-----------|-------------|
| feelings | `/deltas?limit=200` | `delta_text` | `/feelings` |
| journal | `/companion-journal?limit=200` | `note_text` | `/companions/[agent]` |
| dreams | `/dreams?limit=200` | `content` | `/dreams` |
| handovers | `/handovers?limit=100` | `spine` | `/handovers` |
| tasks | `/tasks` | `title` | `/tasks` |

---

## 4. Clip Pattern

All list sections on `/us` follow this pattern — no infinite scroll:

```
[item 1]
[item 2]
[item 3]
[item 4]
[item 5]
see more →    ← link to full page (omit if no dedicated page exists)
```

Dedicated full pages (`/feelings`, `/dreams`, `/handovers`, `/tasks`) are not changed — they continue to show full lists.

---

## Files Affected

| File | Change |
|------|--------|
| `app/page.tsx` | Spacing fixes only — `marginBottom: "2rem"` on all sections |
| `app/globals.css` | Search overlay CSS classes (`.search-*`) |
| `app/us/page.tsx` | Full rewrite — add companion cards, reorder sections, clip all feeds |
| `app/companions/page.tsx` | **Delete** |
| `components/Nav.tsx` | Remove `/companions` entry; add search button + `SearchOverlay` + `Cmd+K` handler |
| `components/SearchOverlay.tsx` | **New** |
| `app/api/search/route.ts` | **New** |

Individual companion pages (`app/companions/[id]/`) — **untouched**.
Check-in, tasks, mind, threads, shared, dreams, feelings pages — **untouched**.

---

## Out of Scope

- Pagination on individual full pages
- Halseth-side full-text search endpoints
- Changes to any page not listed in "Files Affected"
