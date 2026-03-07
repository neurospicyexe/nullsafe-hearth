# Hearth — CLAUDE.md

Hearth is the visual dashboard frontend for two backend systems:

- **Halseth** (`mcp__claude_ai_Halseth__*`) — personal companion system. Cloudflare Worker + D1. Source at `lib/halseth.ts`. All HTTP calls go through `hGet`/`hGetSafe` helpers. Auth via `HALSETH_SECRET` env var.
- **Nullsafe-Plural** (`mcp__claude_ai_Nullsafe-Plural-v2__*`) — plural/fronting system. Separate worker.

When working here, consult the Halseth and Nullsafe-Plural MCPs to understand the actual data shapes and available endpoints before writing fetch logic. Do not assume response shapes — check the MCP or worker code first.

## Architecture

- Next.js App Router, deployed on Vercel (project: `nullsafe-hearth`, team: `neurospicyexe-3819s-projects`)
- All Halseth HTTP calls go server-side through `lib/halseth.ts`
- Client-side mutations proxy through `app/api/*/route.ts` (which add auth headers)
- Env vars: `HALSETH_URL`, `HALSETH_SECRET`, `SYSTEM_OWNER` (optional: `MIND_URL`)

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

## Halseth Worker — endpoints NOT YET deployed (use hGetSafe, return null gracefully)

- `GET /wounds` — living wounds list
- `GET /deltas?limit=N` — cross-companion relational deltas
- `GET /handovers?limit=N` — handover packets
- `GET /routines`, `POST /routines`
- `POST /bridge/toggle`
- `GET /companion-notes` — companion journal (agent, note_text, tags)
- `GET /mind/health`, `/mind/patterns`, `/mind/recent` — separate Mind worker

Pages that depend on these show "Awaiting Halseth /X endpoint." placeholders — that is intentional.

## Key data shape notes

- `/presence` returns `open_threads` already parsed as `string[]` (the worker JSON.parses it)
- `GET /notes` returns `{ id, author, content, note_type, created_at }[]` — NOT the companion journal format
- The companion journal (agent reflections) is a separate table with `agent`, `note_text`, `tags` fields — no HTTP endpoint yet
- `SYSTEM_OWNER` env var must be set in Vercel for the header name to show (currently shows "REPLACE_WITH_OWNER")

## Vercel

- Live URL: https://nullsafe-hearth-1gvo.vercel.app
- All pages prerender with `revalidate: 30` — Vercel CDN may serve stale for up to 5 min
