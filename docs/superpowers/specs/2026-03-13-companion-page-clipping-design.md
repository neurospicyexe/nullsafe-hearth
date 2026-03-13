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

### Fetch limit adjustments

Fetch limits are changed where the function passes a `?limit=` query param to Halseth. Note: `fetchCompanionDeltas` applies the limit as a client-side `.slice()` after fetching all rows — changing its argument reduces the display clip, not the network call. Limits for functions used to assemble the Letters thread stay unchanged.

| Fetch call | Current limit | New limit | Network effect |
|---|---|---|---|
| `fetchCompanionJournal(id, 20)` | 20 | 6 (5 + 1 buffer) | Reduces network fetch |
| `fetchCompanionDeltas(id, 30)` | 30 | 6 | Client-side slice only |
| `fetchNotes(100)` | 100 | 100 | Unchanged — needed for letters |
| `fetchCompanionNotesByAgent(id, 50)` | 50 | 50 | Unchanged — needed for letters |
| `fetchCypherAudit(20)` | 20 | 6 | Reduces network fetch |
| `fetchGaiaWitness(20)` | 20 | 6 | Reduces network fetch |

---

## 2. Sub-Pages (New Files)

All sub-pages are server components (`force-dynamic`). They fetch the full list for their data type and render using the same section components currently defined in `app/companions/[id]/page.tsx` — extract those components to a shared file so both the detail page and sub-pages can import them.

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
- Renders: page header ("[Name] · Identity Journal"), `<JournalSection entries={...} />`
- Back link: `← [Name]` → `/companions/[id]`
- 404 if `id` not in `COMPANION_CONFIG`
- `generateStaticParams` returns `[{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }]`

### `/companions/[id]/deltas` — `app/companions/[id]/deltas/page.tsx`

- Fetches: `fetchCompanionDeltas(id, 200)`
- Renders: page header ("[Name] · Relational Deltas"), `<DeltasSection deltas={...} />`
- Back link: `← [Name]` → `/companions/[id]`
- 404 if `id` not in `COMPANION_CONFIG`
- `generateStaticParams` returns `[{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }]`

### `/companions/[id]/notes` — `app/companions/[id]/notes/page.tsx`

- Fetches: `fetchNotes(200)`, then filters client-side: keep entries where `n.author === id` **and** `n.note_type !== \`letter:${id}\`` (matches the `regularNotes` logic on the main companion page — excludes letter-type notes)
- Renders: page header ("[Name] · Notes"), `<NotesSection notes={filteredNotes} companionId={id} />`
- Back link: `← [Name]` → `/companions/[id]`
- 404 if `id` not in `COMPANION_CONFIG`
- `generateStaticParams` returns `[{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }]`

### `/companions/cypher/audit` — `app/companions/[id]/audit/page.tsx`

- `generateStaticParams` returns `[{ id: "cypher" }]` — this constrains static generation to this one companion. Next.js App Router static params are additive per segment; the parent `[id]/page.tsx` covers all three companions but does not automatically extend to nested routes, so this sub-page must declare its own params.
- Call `notFound()` for any `id` other than `"cypher"` (runtime guard)
- Fetches: `fetchCypherAudit(200)`
- Renders: page header ("Cypher · Audit Log"), `<CypherAuditSection entries={...} />`
- Back link: `← Cypher` → `/companions/cypher`

### `/companions/gaia/witness` — `app/companions/[id]/witness/page.tsx`

- `generateStaticParams` returns `[{ id: "gaia" }]` — same rationale as audit page above
- Call `notFound()` for any `id` other than `"gaia"` (runtime guard)
- Fetches: `fetchGaiaWitness(200)`
- Renders: page header ("Gaia · Witness Log"), `<GaiaWitnessSection entries={...} />`
- Back link: `← Gaia` → `/companions/gaia`

---

## 3. Shared Journal Page (`/journal`)

### `app/journal/page.tsx`

- Fetches: `fetchCompanionJournal(undefined, 200)` — passing `undefined` as the agent fetches all companions' entries. The function signature supports this.
- Renders a **flat chronological list** (newest first). Each entry row shows a small agent badge (e.g. a coloured label with the companion's display name) before the journal text, so the reader can see at a glance who wrote each entry.
- Does not group entries into sections by companion — flat feed with badges is the intended layout.
- Page title: "Journal"
- No "see more" — this is already the full page

---

## 4. `/us` Page Update

Two changes to the Companion Journal section in `app/us/page.tsx`:

**Change 1 — Update the "see more →" href:**
```diff
- <Link href={`/companions/${companionJournal[0].agent}`} ...>
+ <Link href="/journal" ...>
```

**Change 2 — Update the condition guard:**

The current condition is `companionJournal.length > 0 && companionJournal[0].agent`. After the change, the link goes to `/journal` regardless of which companion wrote the first entry, so the `companionJournal[0].agent` check is no longer needed. Replace with the same buffer-of-1 pattern used elsewhere:

```diff
- {companionJournal.length > 0 && companionJournal[0].agent && (
+ {companionJournal.length > 5 && (
```

This hides the "see more →" when there are 5 or fewer entries (consistent with the clip pattern throughout the app).

---

## Files Affected

| File | Change |
|---|---|
| `app/companions/[id]/page.tsx` | Clip Journal/Deltas/Notes/Audit/Witness to 5; adjust fetch limits; import shared components from `sections.tsx` |
| `app/companions/[id]/sections.tsx` | **New** — shared section components extracted from `page.tsx` |
| `app/companions/[id]/journal/page.tsx` | **New** — full journal for one companion |
| `app/companions/[id]/deltas/page.tsx` | **New** — full deltas for one companion |
| `app/companions/[id]/notes/page.tsx` | **New** — full notes for one companion (letter-type notes excluded) |
| `app/companions/[id]/audit/page.tsx` | **New** — Cypher audit log (full); `generateStaticParams` = `[{ id: "cypher" }]` |
| `app/companions/[id]/witness/page.tsx` | **New** — Gaia witness log (full); `generateStaticParams` = `[{ id: "gaia" }]` |
| `app/journal/page.tsx` | **New** — flat chronological feed of all companions' journal entries with agent badges |
| `app/us/page.tsx` | Update Companion Journal link href to `/journal`; update condition guard to `length > 5` |

Individual companion detail logic and letters — **untouched**.
Search overlay, Nav, home page — **untouched**.

---

## Out of Scope

- Pagination on sub-pages (full lists are acceptable at current data volumes)
- Search improvements / date filtering (separate spec)
- Adding new data types or endpoints
