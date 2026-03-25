# Hearth — CLAUDE.md

Hearth is the visual dashboard frontend for three backend systems:

- **Halseth** (`mcp__claude_ai_Halseth__*`) -- personal companion system. Cloudflare Worker + D1. Source at `lib/halseth.ts`. All HTTP calls go through `hGet`/`hGetSafe` helpers. Auth via `HALSETH_SECRET` env var.
- **Nullsafe-Plural** (`mcp__claude_ai_Nullsafe-Plural-v2__*`) -- plural/fronting system. Separate worker.
- **Nullsafe-Second-Brain** -- memory synthesis + semantic search. Local MCP server (stdio). See its own `CLAUDE.md` for full detail.

When working here, consult the Halseth and Nullsafe-Plural MCPs to understand actual data shapes before writing fetch logic. Do not assume response shapes -- check the MCP or worker code first.

Part of the BBH suite -- see root `CLAUDE.md` for cross-project context.

## Architecture

- Next.js App Router, deployed on Vercel (project: `nullsafe-hearth`, team: `neurospicyexe-3819s-projects`)
- All Halseth HTTP calls go server-side through `lib/halseth.ts`
- Client-side mutations proxy through `app/api/*/route.ts` (which add auth headers)
- Env vars: `HALSETH_URL`, `HALSETH_SECRET`, `DASHBOARD_SECRET`, `SYSTEM_OWNER` (optional: `MIND_URL`)
- `DASHBOARD_SECRET` -- passphrase for the dashboard login page. If unset, auth is skipped (local dev).

## Companion-accessible Hearth API

These Hearth routes accept `Authorization: Bearer HALSETH_SECRET` instead of the dashboard cookie.

```
POST /api/companion/house
  Body: { love_meter: number (0-100) }   -- set absolute value
     OR { delta: number }                -- bump relative to current (e.g. { delta: +5 })
```

## Letters / note-passing

Asynchronous notes between Raziel and companions.

- **Raziel → Companion**: POST `/api/notes` with `{ author: "raziel", content: "...", note_type: "letter:drevan" }`
  - note_type must be `letter:drevan`, `letter:cypher`, or `letter:gaia`
- **Companion → Raziel**: use `halseth_companion_note_add` with `tags: ["letter"]`

## Halseth Worker -- HTTP Endpoints

```
GET  /presence          -- main data bundle (auth-gated)
GET  /house             -- house state
POST /house             -- update spoon_count, love_meter, current_room, etc.
GET  /notes?limit=N     -- companion_notes table
POST /notes             -- create note
GET  /biometrics        -- list snapshots
GET  /biometrics/latest -- single latest snapshot
GET  /bridge/shared     -- shared bridge data
POST /bridge/act        -- bridge action
GET  /companions        -- list companions
GET  /companions/:id    -- single companion
GET  /companions/:id/deltas  -- per-companion relational deltas
POST /companions/:id/deltas  -- append delta
```

Endpoints using `hGetSafe` (graceful null on failure):
- `GET /wounds`, `GET /deltas?limit=N`, `GET /handovers?limit=N`
- `GET /routines`, `GET /companion-notes`, `GET /companion-journal`
- `GET /tasks`, `GET /events`, `GET /lists`
- `GET /feelings`, `GET /dreams`, `GET /dream-seeds`
- `GET /cypher-audit`, `GET /gaia-witness`
- `POST /bridge/toggle`

Not yet in halseth (show placeholder): `GET /mind/health`, `/mind/patterns`, `/mind/recent`

## Key Data Shape Notes

- `/presence` returns `open_threads` already parsed as `string[]`
- `GET /notes` returns `{ id, author, content, note_type, created_at }[]` -- NOT the companion journal format
- The companion journal (agent reflections) is a separate table with `agent`, `note_text`, `tags` fields
- `SYSTEM_OWNER` env var must be set in Vercel for the header name to show

## Security

OWASP + vibesec audit run 2026-03-09. Fixes applied same day.
Open findings: `docs/security-audit.md`

Auth flow: `DASHBOARD_SECRET` env var → user visits `/login` → enters passphrase → `POST /api/auth` sets httpOnly `hearth_session` cookie → middleware validates on every request.

## Next.js Patterns

- `params` is a `Promise` in App Router: `const { id: rawId } = await params; const id = rawId.toLowerCase();`
- Sub-pages must declare their own `generateStaticParams` -- not inherited from parent route segments

## Companion Pages

- Shared section components + `COMPANION_CONFIG` (colors, display names) live in `app/companions/[id]/sections.tsx`
- Companion colors: drevan=`var(--accent)`, cypher=`#e2e8f0`, gaia=`#4ade80`, Raziel=`#f59e0b` -- use these everywhere
- Sub-pages exist at `/companions/[id]/journal`, `/deltas`, `/notes`, `/letters`, `/companions/cypher/audit`, `/companions/gaia/witness`
- `fetchCompanionJournal(undefined, 200)` -- pass `undefined` as agent to fetch all companions' entries
- 5-item clip pattern: fetch 6, `.slice(0, 5)` display, `"see more →"` Link with `className="home-section-link"` if `count > 5`

## Search

- `components/SearchOverlay.tsx` -- full-text search UI, triggered by Cmd+K/Ctrl+K from Nav
- `app/api/search/route.ts` -- accepts `?q=` and `?type=all|feelings|journal|dreams|handovers|tasks`

## Vercel

- Live URL: https://nullsafe-hearth-1gvo.vercel.app
- Data pages use `export const dynamic = 'force-dynamic'`
