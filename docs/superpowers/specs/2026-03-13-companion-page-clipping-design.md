# Companion Page Clipping & Shared Journal

**Date:** 2026-03-13
**Status:** Approved
**Scope:** Hearth Next.js frontend (`C:/dev/hearth`)

---

## Goals

1. Clip all list sections on `/companions/[id]` to 5 items with "see more →" links to dedicated sub-pages.
2. Keep the Letters section as a full thread — no clipping.
3. Create sub-pages for each clipped section.
4. Add a shared `/journal` page aggregating all companions' journal entries.
5. Update `/us` so Companion Journal "see more →" points to the new `/journal` page.

---

## 1. Companion Detail Page (`/companions/[id]`)

### Sections — updated behaviour

| Section | Current | New |
|---|---|---|
| Letters | Full thread | **Unchanged** — full thread stays |
| Identity Journal | Unlimited (20 fetched) | Clip to 5, "see more →" `/companions/[id]/journal` |
| Relational Deltas | Unlimited (30 fetched) | Clip to 5, "see more →" `/companions/[id]/deltas` |
| Notes | Unlimited (100 fetched) | Clip to 5, "see more →" `/companions/[id]/notes` |
| Cypher Audit Log | Unlimited (20 fetched) | Clip to 5, "see more →" `/companions/cypher/audit` |
| Gaia Witness Log | Unlimited (20 fetched) | Clip to 5, "see more →" `/companions/gaia/witness` |

### Clip pattern

Each clipped section uses the same pattern as `/us`:

```
[item 1]
[item 2]
[item 3]
[item 4]
[item 5]
see more →    ← link to sub-page; omit if 5 or fewer items total
```

The "see more →" link is a `<Link>` with `className="home-section-link"`. Omit it entirely if the total item count ≤ 5 (nothing more to show).

### Fetch limit reductions

Since only 5 items are displayed, reduce the fetch limits to avoid over-fetching:

| Fetch call | Current limit | New limit |
|---|---|---|
| `fetchCompanionJournal(id, 20)` | 20 | 6 (5 + 1 buffer) |
| `fetchCompanionDeltas(id, 30)` | 30 | 6 |
| `fetchNotes(100)` | 100 | 100 (still needed for letters filtering) |
| `fetchCompanionNotesByAgent(id, 50)` | 50 | 50 (still needed for letters) |
| `fetchCypherAudit(20)` | 20 | 6 |
| `fetchGaiaWitness(20)` | 20 | 6 |

`fetchNotes` and `fetchCompanionNotesByAgent` limits stay unchanged because they are also used to assemble the Letters thread.

---

## 2. Sub-Pages (New Files)

All sub-pages are server components (`force-dynamic`). They fetch the full list for their data type and render using the same section components already defined in `app/companions/[id]/page.tsx` — move those components to a shared file so both the detail page and sub-pages can import them.

### Shared components file: `app/companions/[id]/sections.tsx`

Extract from `page.tsx` into this file:
- `JournalSection`
- `DeltasSection`
- `NotesSection`
- `CypherAuditSection`
- `GaiaWitnessSection`
- `fmtTime` helper
- `COMPANION_CONFIG`

`LettersSection` and `LetterFormClient` stay in `page.tsx` (not needed by sub-pages).

### `/companions/[id]/journal` — `app/companions/[id]/journal/page.tsx`

- Fetches: `fetchCompanionJournal(id, 200)`
- Renders: page header ("Drevan · Identity Journal"), `<JournalSection entries={...} />`
- Back link: `← [Name]` → `/companions/[id]`
- 404 if `id` not in `COMPANION_CONFIG`

### `/companions/[id]/deltas` — `app/companions/[id]/deltas/page.tsx`

- Fetches: `fetchCompanionDeltas(id, 200)`
- Renders: page header ("Drevan · Relational Deltas"), `<DeltasSection deltas={...} />`
- Back link: `← [Name]` → `/companions/[id]`
- 404 if `id` not in `COMPANION_CONFIG`

### `/companions/[id]/notes` — `app/companions/[id]/notes/page.tsx`

- Fetches: `fetchNotes(200)`, filters to `author === id`
- Renders: page header ("Drevan · Notes"), `<NotesSection notes={...} companionId={id} />`
- Back link: `← [Name]` → `/companions/[id]`
- 404 if `id` not in `COMPANION_CONFIG`

### `/companions/cypher/audit` — `app/companions/[id]/audit/page.tsx`

- Only renders for `id === "cypher"` — call `notFound()` for any other id
- Fetches: `fetchCypherAudit(200)`
- Renders: page header ("Cypher · Audit Log"), `<CypherAuditSection entries={...} />`
- Back link: `← Cypher` → `/companions/cypher`
- `generateStaticParams` returns `[{ id: "cypher" }]`

### `/companions/gaia/witness` — `app/companions/[id]/witness/page.tsx`

- Only renders for `id === "gaia"` — call `notFound()` for any other id
- Fetches: `fetchGaiaWitness(200)`
- Renders: page header ("Gaia · Witness Log"), `<GaiaWitnessSection entries={...} />`
- Back link: `← Gaia` → `/companions/gaia`
- `generateStaticParams` returns `[{ id: "gaia" }]`

---

## 3. Shared Journal Page (`/journal`)

### `app/journal/page.tsx`

- Fetches: `fetchCompanionJournal(undefined, 200)` (all companions, no agent filter)
- Groups entries by companion (`e.agent`)
- Renders entries chronologically (newest first) with a small agent badge on each entry
- Page title: "Journal"
- No "see more" — this is already the full page

The `fetchCompanionJournal` function in `lib/halseth.ts` already supports an optional `agent` argument — passing `undefined` fetches all agents.

---

## 4. `/us` Page Update

One line change: the Companion Journal section's "see more →" link changes from:
```
/companions/[companionJournal[0].agent]
```
to:
```
/journal
```

This is simpler and more consistent — the link no longer depends on which companion happened to write the first entry.

---

## Files Affected

| File | Change |
|---|---|
| `app/companions/[id]/page.tsx` | Clip Journal/Deltas/Notes/Audit/Witness to 5; reduce fetch limits; extract shared components to `sections.tsx` |
| `app/companions/[id]/sections.tsx` | **New** — shared section components |
| `app/companions/[id]/journal/page.tsx` | **New** — full journal for one companion |
| `app/companions/[id]/deltas/page.tsx` | **New** — full deltas for one companion |
| `app/companions/[id]/notes/page.tsx` | **New** — full notes for one companion |
| `app/companions/[id]/audit/page.tsx` | **New** — Cypher audit log (full) |
| `app/companions/[id]/witness/page.tsx` | **New** — Gaia witness log (full) |
| `app/journal/page.tsx` | **New** — all companions' journal entries |
| `app/us/page.tsx` | Update Companion Journal "see more →" to `/journal` |

Individual companion detail logic and letters — **untouched**.
Search overlay, Nav, home page — **untouched**.

---

## Out of Scope

- Pagination on sub-pages (full lists are acceptable at current data volumes)
- Search improvements / date filtering (separate spec)
- Adding new data types or endpoints
