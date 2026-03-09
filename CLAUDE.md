# Hearth — CLAUDE.md

Hearth is the visual dashboard frontend for three backend systems:

- **Halseth** (`mcp__claude_ai_Halseth__*`) — personal companion system. Cloudflare Worker + D1. Source at `lib/halseth.ts`. All HTTP calls go through `hGet`/`hGetSafe` helpers. Auth via `HALSETH_SECRET` env var. **Has full MCP tool coverage (~40 tools).**
- **Nullsafe-Plural** (`mcp__claude_ai_Nullsafe-Plural-v2__*`) — plural/fronting system. Separate worker. **Has full MCP tool coverage (6 tools: `get_current_front`, `get_front_history`, etc.).**
- **Nullsafe-Second-Brain** — memory synthesis + semantic search layer. Local MCP server (stdio). Source at `C:\dev\nullsafe-second-brain`. No HTTP server — exposes 12 MCP tools with `sb_` prefix.

When working here, consult the Halseth and Nullsafe-Plural MCPs to understand the actual data shapes and available endpoints before writing fetch logic. Do not assume response shapes — check the MCP or worker code first.

## Architecture

- Next.js App Router, deployed on Vercel (project: `nullsafe-hearth`, team: `neurospicyexe-3819s-projects`)
- All Halseth HTTP calls go server-side through `lib/halseth.ts`
- Client-side mutations proxy through `app/api/*/route.ts` (which add auth headers)
- Env vars: `HALSETH_URL`, `HALSETH_SECRET`, `DASHBOARD_SECRET`, `SYSTEM_OWNER` (optional: `MIND_URL`)
- `DASHBOARD_SECRET` — passphrase for the dashboard login page. Set in Vercel env vars. If unset, auth is skipped (local dev). Must equal the same value set in the Hearth Vercel project settings.

## Companion-accessible Hearth API

These Hearth routes accept `Authorization: Bearer HALSETH_SECRET` instead of the dashboard cookie.
Companions can call them directly during sessions without browser access.

```
POST /api/companion/house
  Body: { love_meter: number (0–100) }   — set absolute value
     OR { delta: number }                — bump relative to current (e.g. { delta: +5 })
  → Updates love_meter in house state. Use this to express affection during a session.
```

## Letters / note-passing

Asynchronous notes between Raziel and companions. Not for immediate answers — picked up next session.

- **Raziel → Companion**: POST `/api/notes` with `{ author: "raziel", content: "...", note_type: "letter:drevan" }`
  - note_type must be `letter:drevan`, `letter:cypher`, or `letter:gaia`
- **Companion → Raziel**: use `halseth_companion_note_add` with `tags: ["letter"]`
  - Appears in the Letters inbox on the /us page and the companion's Letters thread

## Halseth Worker — existing HTTP endpoints

```
GET  /presence          — main data bundle (public, no auth needed)
GET  /house             — house state
POST /house             — update spoon_count, love_meter, current_room, etc.
GET  /notes?limit=N     — companion_notes table (author, content, note_type)
POST /notes             — create note
GET  /biometrics        — list snapshots
GET  /biometrics/latest — single latest snapshot
GET  /bridge/shared     — shared bridge data (requires bridge auth)
POST /bridge/act        — bridge action
GET  /companions        — list companions
GET  /companions/:id    — single companion
GET  /companions/:id/deltas  — per-companion relational deltas
POST /companions/:id/deltas  — append delta
```

## Halseth Worker — endpoints using hGetSafe (graceful null on failure)

These exist in halseth but use `hGetSafe` so pages degrade gracefully if unavailable:

- `GET /wounds`, `GET /deltas?limit=N`, `GET /handovers?limit=N`
- `GET /routines`, `GET /companion-notes`, `GET /companion-journal`
- `GET /tasks`, `GET /events`, `GET /lists`
- `GET /feelings`, `GET /dreams`, `GET /dream-seeds`
- `GET /cypher-audit`, `GET /gaia-witness`
- `POST /bridge/toggle`

Still not in halseth (show placeholder):
- `GET /mind/health`, `/mind/patterns`, `/mind/recent` — separate Mind worker not built

## Key data shape notes

- `/presence` returns `open_threads` already parsed as `string[]` (the worker JSON.parses it)
- `GET /notes` returns `{ id, author, content, note_type, created_at }[]` — NOT the companion journal format
- The companion journal (agent reflections) is a separate table with `agent`, `note_text`, `tags` fields — no HTTP endpoint yet
- `SYSTEM_OWNER` env var must be set in Vercel for the header name to show (currently shows "REPLACE_WITH_OWNER")

## Nullsafe-Second-Brain

Local MCP server (stdio transport, NOT HTTP). Source: `C:\dev\nullsafe-second-brain`.

**What it does:** Reads from Halseth HTTP + Nullsafe-Plural, synthesizes content, writes to Obsidian vault, and maintains a SQLite vector store (`~/.nullsafe-second-brain/vector-store.db`) for semantic RAG across companion memory.

**MCP tools (`sb_` prefix) — 4 groups:**
- **Capture:** `sb_save_document`, `sb_save_note`, `sb_save_study`, `sb_log_observation` — write + index to vault
- **Retrieval:** `sb_search` (semantic), `sb_recall` (filtered), `sb_recent_patterns`
- **Synthesis:** `sb_synthesize_session`, `sb_run_patterns`, `sb_write_pattern_summary`
- **System:** `sb_status`, `sb_reindex_note`, `sb_index_rebuild`

**Hearth integration:** `sb_write_pattern_summary` generates `_recent-patterns.md` which Hearth's pattern widget reads. If adding a patterns widget, this is the data source.

**Key invariants:**
- Companion names never hardcoded — always from `second-brain.config.json` (gitignored)
- All vault writes go through `Indexer.write()` (dual-write: vault + embedding + vector store)
- `sb_log_observation` always routes to `00 - INBOX/` — never permanent folders directly
- Vector store lives outside vault root — not synced by Obsidian Sync
- Second-brain never writes back to Halseth; Halseth data is read-only here

**Halseth endpoints it reads (not yet in Hearth's CLAUDE.md HTTP list):**
- `GET /sessions/{id}`, `GET /sessions?days=N`
- `GET /deltas?days=N`
- `GET /handover/{id}`
- `GET /routines[?date=YYYY-MM-DD]`

## Security

Full OWASP + vibesec audit run 2026-03-09. No fixes applied yet.

### Fixes applied (2026-03-09)

| Fix | Files |
|-----|-------|
| ✅ Auth middleware — all routes protected by `DASHBOARD_SECRET` cookie check | `middleware.ts`, `app/login/page.tsx`, `app/login/LoginForm.tsx`, `app/api/auth/route.ts` |
| ✅ Security headers — X-Frame-Options, X-Content-Type-Options, Referrer-Policy | `next.config.ts` |
| ✅ `limit` clamped 1–100 | `app/api/deltas/route.ts`, `app/api/feelings/route.ts` |
| ✅ `agent` validated against allowlist `["drevan","cypher","gaia"]` | `app/api/companion-notes/route.ts` |
| ✅ Input allowlists on mutation routes — body stripped to known fields | `notes`, `house`, `companion-notes`, `dream-seeds`, `routines` routes |
| ✅ Generic error responses — raw Halseth errors no longer forwarded | same routes above |

### Still open

| Severity | Issue |
|----------|-------|
| LOW | No rate limiting on mutation endpoints — add `@upstash/ratelimit` if needed |
| LOW | `bridge/act` and `bridge/toggle` bodies still forwarded without field allowlists (low risk — bridge is separately authed) |

### Auth flow

`DASHBOARD_SECRET` env var → user visits `/login` → enters passphrase → `POST /api/auth` sets httpOnly `hearth_session` cookie → middleware validates on every request. No `DASHBOARD_SECRET` = open (local dev). Set it in Vercel project settings.

## Vercel

- Live URL: https://nullsafe-hearth-1gvo.vercel.app
- All pages prerender with `revalidate: 30` — Vercel CDN may serve stale for up to 5 min
