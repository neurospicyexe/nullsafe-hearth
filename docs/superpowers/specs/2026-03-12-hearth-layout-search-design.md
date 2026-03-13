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

**Fix:** Audit `app/page.tsx` and `app/globals.css`. Apply consistent `margin-bottom: 2rem` (or `gap: 2rem` on the parent flex/grid container) between every home page section:
- Header → PresenceSection
- PresenceSection → Companions row
- Companions row → metric grid
- Metric grid → Tasks section
- Tasks section → Recent Notes

No layout changes — only spacing.

---

## 2. Us Page Absorbs Companions

### What changes

- `app/companions/page.tsx` — **deleted** (the list page; individual companion pages at `app/companions/[id]/` are kept)
- `app/us/page.tsx` — **rewritten** to include companion cards at the top
- Nav link previously pointing to `/companions` — **updated to `/us`**

### New `/us` page structure (top to bottom)

| Section | Content | Clip |
|---------|---------|------|
| Strip | Love meter + Active anchor | — |
| **Companions** | Three `CompanionMoodCard` components; clicking a card navigates to `/companions/[id]` | — |
| Recent Feelings | Relational deltas, valence-tagged | 5 items → `see more →` `/feelings` |
| Letters inbox | Companion notes tagged `letter` | 5 items → no dedicated page, just clipped |
| Companion Journal | Journal entries from all companions | 5 items → `see more →` `/companions/[id]` of the most recent author |
| Handovers | Session handover summaries | 3 items → `see more →` `/handovers` |
| Living Wounds | Active wounds | all (usually few) |

### Companion cards on `/us`

Reuse the existing `CompanionMoodCard` component already used on the home page. Each card:
- Shows avatar (image if set, symbol fallback)
- Shows current mood / emotion
- Is wrapped in a `<Link href="/companions/[id]">` — the whole card is clickable

### Data fetching

`/us` already fetches from `fetchPresence()` which returns `companions` and `companion_moods`. No new Halseth endpoints needed.

---

## 3. Global Search Overlay

### Nav change

Add a search icon button (`⌕`) to `components/Nav.tsx`, right-aligned in the nav bar. Clicking it opens the search overlay. Keyboard shortcut: `Cmd/Ctrl+K` also opens it.

### Overlay behaviour

- Full-screen dark modal over the current page
- Autofocuses the text input on open
- `Esc` or clicking the backdrop closes it
- State is local to the overlay component (no URL change, no router push)

### Filter chips

```
All · Feelings · Journal · Dreams · Handovers · Tasks
```

Default: **All**. Selecting a chip narrows results to that type. Chips are single-select.

### Search API route

New file: `app/api/search/route.ts`

- Accepts: `GET /api/search?q=<query>&type=<type>`
- `type` is one of: `all`, `feelings`, `journal`, `dreams`, `handovers`, `tasks`
- Fans out to relevant Halseth endpoints using existing `lib/halseth.ts` fetch helpers
- Merges and returns results grouped by type: `{ feelings: [...], journal: [...], dreams: [...], handovers: [...], tasks: [...] }`
- Each result item has: `id`, `type`, `text` (the searchable/displayable content), `created_at`, `url` (where to navigate on click)
- Client-side filtering: results update as the user types (debounced 300ms)

### Search component

New file: `components/SearchOverlay.tsx` (`'use client'`).

Props: `open: boolean`, `onClose: () => void`

Renders:
- Backdrop div (click → close)
- Modal panel: input + chips + results list
- Each result row: type label + text preview + date + clickable (navigates and closes overlay)
- Loading state while fetching
- "No results" empty state

### Halseth endpoints used for search

| Type | Endpoint | Field searched |
|------|----------|---------------|
| Feelings | `/deltas?limit=200` | `delta_text` |
| Journal | `/companion-journal?limit=200` | `note_text` |
| Dreams | `/dreams?limit=200` | `content` |
| Handovers | `/handovers?limit=100` | `spine` |
| Tasks | `/tasks` | `title` |

Client-side substring match on the fetched data (no Halseth full-text search needed). Results are filtered in the API route by `q` before returning to the client.

---

## 4. Clip Pattern (5-item + "see more")

All list sections across the app follow this pattern:

```
[item 1]
[item 2]
[item 3]
[item 4]
[item 5]
see more →           ← link to full page
```

No infinite scroll anywhere. Pages that currently load everything (`/us`, `/feelings`, `/dreams`, `/journal`) are not changed — only the home-page and `/us` section previews are clipped. The dedicated full pages remain as-is (they already show paginated or full lists).

---

## Files Affected

| File | Change |
|------|--------|
| `app/page.tsx` | Spacing fixes only |
| `app/globals.css` | Spacing + search overlay CSS |
| `app/us/page.tsx` | Add companion cards section, clip all sections to 5 |
| `app/companions/page.tsx` | **Delete** |
| `components/Nav.tsx` | Add search icon + `Cmd+K` listener |
| `components/SearchOverlay.tsx` | **New** — search modal |
| `app/api/search/route.ts` | **New** — search API route |

Individual companion pages (`app/companions/[id]/`) — **untouched**.

---

## Out of Scope

- Pagination on individual full pages (feelings, dreams, journal, handovers) — they already work
- Halseth-side search endpoints — client-side filtering is sufficient for personal data volumes
- Any changes to check-in, tasks, mind, threads, or shared pages
