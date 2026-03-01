# Hearth Expansion Design
**Date:** 2026-03-01
**Status:** Approved
**Inspiration:** [NESTeqMemory](https://github.com/neurospicyexe/NESTeqMemory)

---

## Problem

Hearth currently renders a single scrolling page with limited data from Halseth. It doesn't surface:
- Companion notes / love notes prominently
- Knowledge graph (entities, observations, relations, journals)
- Bridge/partner data (shared tasks, events, lists)
- Companion self-discovery notes (`companion_notes` table)
- Emotional landscape from delta data
- Routine logging and biometric check-in
- Gaia's territory (wounds + her companion notes)
- Session type (`checkin | hangout | work | ritual`)

The visual design is functional but flat — lacks the intimacy and depth of the inspiration.

---

## Approach: Progressive Expansion (Approach B)

Multi-page tab-based app. Each page owns its data slice. Dark-but-richer visual upgrade. Full write-back capability.

---

## Architecture

### Routing

Next.js App Router. Five routes:

```
/           → Home
/us         → Us (Bridge / partner data)
/mind       → Mind (knowledge graph + companion notes)
/checkin    → Check-in (uplink form + routines + biometrics)
/threads    → Threads (relational landscape + Gaia)
```

### Navigation

`<TabBar>` client component in `app/layout.tsx`. Fixed bottom on mobile. Five tabs with icons + labels. Active tab highlighted with accent gradient. Icons: 🏠 Home, 🤝 Us, 🧠 Mind, 📋 Check-in, 🧵 Threads.

### Data Fetching

Same pattern as current — async server components per route, 30s revalidate. Each page fetches only what it needs. Client components only for interactive forms and buttons.

**Environment variables needed:**
- `HALSETH_URL` — existing, covers all Halseth endpoints
- `MIND_URL` — may be same as `HALSETH_URL` or a separate worker URL. **Verify during implementation.** If separate, add to `.env.local.example`.
- `HALSETH_SECRET` — existing

### Visual Upgrade (Dark-but-Richer)

No new images required. CSS-only changes:

- Keep base palette: `#0d0d0f`, `#9b7fd4` accent
- Add radial gradient "glow" to page background behind key cards
- Cards get 1px gradient top-border (`linear-gradient(90deg, accent, transparent)`)
- Typography: section headers heavier, stat numbers larger (2rem+)
- Gaia section uses distinct accent: cool white/silver (`#c8c8d8`) instead of purple
- Agent colors: Drevan → `#9b7fd4` (purple), Cypher → `#6bbf82` (green), Gaia → `#c8c8d8` (silver)

---

## Pages & Components

### Home (`/`)

Presence and connection. Fetches from existing `/presence`.

| Component | Type | Data |
|---|---|---|
| `CompanionHero` | Server | `session.front_state`, `session.facet`, `session.emotional_frequency`, `session.session_type` |
| `LoveNotes` | Server + Client | Latest companion note, latest human note + quick reply form (POST `/api/notes`) |
| `LoveMeter` | Client | `house.love_meter` (existing) |
| `SpoonCounter` | Client | `house.spoon_count` (existing) |
| `SessionCard` / `HandoverCard` | Server | `session` or `last_handover` (existing, condensed) |

**Changes from current:** BiometricCard moved to `/checkin`. PersonalityCard moved to `/threads`. NotesCard replaced by focused LoveNotes. DreamCard stays on Home (dreams are relational, not Mind).

---

### Us (`/us`)

Bridge and shared state. Fetches from new `/api/bridge` route.

| Component | Type | Data |
|---|---|---|
| `SharedGoals` | Client | Partner's shared tasks — checklist, mark done via `halseth_bridge_push_act` |
| `SharedEvents` | Server | Partner's shared upcoming events |
| `SharedLists` | Client | Partner's shared lists + complete items |
| `BridgeStatus` | Client | Category sharing toggles (tasks/events/lists) via `halseth_bridge_toggle` |

---

### Mind (`/mind`)

Knowledge graph + companion self-discovery. Two data sources: knowledge graph data and `companion_notes`.

| Component | Type | Data |
|---|---|---|
| `MindHealthPanel` | Server | Entity/observation/relation/journal/feelings/identity counts, salience breakdown. Colored bars per category (like NESTeq's personality bars) |
| `RecentPatterns` | Server | `mind_patterns` last 7 days — theme/temporal activity |
| `CompanionNotesFeed` | Server + Client | `companion_notes` filtered by agent. Agent filter tabs: All / Drevan / Cypher / Gaia. Each note card: agent name (colored), `note_text`, `tags`, timestamp |
| `CompanionNoteForm` | Client | Agent selector (Drevan / Cypher / Gaia — never Raziel), note textarea, tags input. POST `/api/companion-notes` |
| `JournalFeed` | Server | Recent Mind journal entries |
| `JournalForm` | Client | Textarea → POST `/api/mind/journal` |

---

### Check-in (`/checkin`)

Quick uplink. Write-heavy page.

| Component | Type | Data |
|---|---|---|
| `UplinkForm` | Client | Spoons (0–10 slider), Mood (dropdown), Notes (textarea), session_type selector (checkin/hangout/work/ritual). Packet preview (terminal-style pre block). Submit → POST `/api/routines` |
| `RoutineStatus` | Client | Today's routines (meds, water, food, movement) as pip indicators. Tap to mark done → POST `/api/routines` |
| `BiometricCard` | Server | Latest HRV, resting HR, sleep, steps, stress (moved from Home) |

**On submit:** `UplinkForm` calls `halseth_routine_log` (via `/api/routines`) and optionally `halseth_biometric_log` if any health fields provided.

---

### Threads (`/threads`)

Relational landscape + Gaia's domain.

| Component | Type | Data |
|---|---|---|
| `EmotionalLandscape` | Server | Top valences by count from delta data. Horizontal colored bars: toward (green), tender (pink), neutral (muted), repair (warm), rupture (red) |
| `RecentDeltas` | Server | Last 10 relational moments. Timestamp, valence badge, delta_text, initiated_by |
| `PersonalityCard` | Server | Valence distribution + initiated_by breakdown (moved from Home) |
| `GaiaPanel` | Server | Wounds list + Gaia's `companion_notes` (`agent: gaia`). Styled in silver/cool-white accent. Label: "Gaia's Record". Read-only — no write form (Gaia writes through Claude, not the web) |

---

## Data & API Routes

### New proxy routes to add

| Route | Method | Halseth endpoint / tool | Purpose |
|---|---|---|---|
| `/api/companion-notes` | GET | `halseth_companion_notes_read` (agent filter) | Mind page feed |
| `/api/companion-notes` | POST | `halseth_companion_note_add` | CompanionNoteForm |
| `/api/mind` | GET | Mind graph read endpoints | MindHealthPanel + JournalFeed |
| `/api/mind/journal` | POST | `mind_journal` | JournalForm |
| `/api/bridge` | GET | `halseth_bridge_pull` | Us page all data |
| `/api/bridge/act` | POST | `halseth_bridge_push_act` | SharedGoals/SharedLists actions |
| `/api/bridge/toggle` | POST | `halseth_bridge_toggle` | BridgeStatus toggles |
| `/api/routines` | GET | `halseth_routine_read` | RoutineStatus today |
| `/api/routines` | POST | `halseth_routine_log` | Routine pip taps + uplink submit |
| `/api/biometrics` | GET | `halseth_biometric_read` | BiometricCard |

### Existing routes (unchanged)
- `/api/house` — POST (love_meter, spoon_count)
- `/api/notes` — POST (author, content, note_type)

### `PresenceData` type updates
```typescript
session: {
  // existing fields...
  session_type: "checkin" | "hangout" | "work" | "ritual" | null
} | null
```

`companion_notes` data loaded separately on `/mind` and `/threads` pages — not bundled into presence.

---

## Halseth Changes Already Done

These are **already implemented** in Halseth — Hearth just needs to wire up:

1. **`session_type`** column on sessions table (`checkin | hangout | work | ritual`, default `work`). `halseth_session_open` already accepts it.
2. **`companion_notes`** table (`id UUID, created_at, agent text, note_text, tags JSON[], session_id FK`). MCP tools `halseth_companion_note_add` and `halseth_companion_notes_read` already exist.

---

## What's Out of Scope

- Companion portrait / avatar images (no art assets)
- Editing or deleting existing notes/tasks
- User authentication
- Mobile-specific responsive optimization beyond tab bar
- Historical trends / analytics
- Search across notes or deltas

---

## Success Criteria

- [ ] Tab navigation works across all 5 pages
- [ ] Home shows LoveNotes + LoveMeter + CompanionHero with session_type
- [ ] Us page shows partner's shared tasks/events/lists with write-back
- [ ] Mind page shows knowledge graph stats + companion_notes feed + write forms
- [ ] Check-in page submits uplink (spoons + mood + notes) and logs routines
- [ ] Threads page shows emotional landscape + recent deltas + Gaia panel
- [ ] Visual upgrade applied: gradient glow, card top-border accents, agent colors
- [ ] All new API routes proxy correctly to Halseth with auth header
