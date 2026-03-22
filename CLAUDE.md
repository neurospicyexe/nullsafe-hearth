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
GET  /presence          — main data bundle (auth-gated — `HALSETH_SECRET` Bearer required)
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

Full OWASP + vibesec audit run 2026-03-09.

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

## Next.js 15 patterns

- `params` is a `Promise` in App Router: `const { id: rawId } = await params; const id = rawId.toLowerCase();`
- Sub-pages must declare their own `generateStaticParams` — not inherited from parent route segments

## Companion pages

- Shared section components + `COMPANION_CONFIG` (colors, display names) live in `app/companions/[id]/sections.tsx` — import from there
- Companion colors: drevan=`var(--accent)`, cypher=`#e2e8f0`, gaia=`#4ade80`, Raziel=`#f59e0b` — use these everywhere, do NOT invent new colors
- Sub-pages exist at `/companions/[id]/journal`, `/companions/[id]/deltas`, `/companions/[id]/notes`, `/companions/[id]/letters` (full letter thread), `/companions/cypher/audit`, `/companions/gaia/witness`
- `fetchCompanionJournal(undefined, 200)` — pass `undefined` as agent to fetch all companions' entries (used by `/journal`)
- 5-item clip pattern: fetch 6, `.slice(0, 5)` display, `"see more →"` Link with `className="home-section-link"` if `count > 5`

## Search

- `components/SearchOverlay.tsx` — full-text search UI, triggered by Cmd+K/Ctrl+K from Nav
- `app/api/search/route.ts` — search API, accepts `?q=` and `?type=all|feelings|journal|dreams|handovers|tasks`

## Vercel

- Live URL: https://nullsafe-hearth-1gvo.vercel.app
- Data pages use `export const dynamic = 'force-dynamic'` (server-rendered on every request, no CDN caching)

# context-mode — MANDATORY routing rules

You have context-mode MCP tools available. These rules are NOT optional — they protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session.

## BLOCKED commands — do NOT attempt these

### curl / wget — BLOCKED
Any Bash command containing `curl` or `wget` is intercepted and replaced with an error message. Do NOT retry.
Instead use:
- `ctx_fetch_and_index(url, source)` to fetch and index web pages
- `ctx_execute(language: "javascript", code: "const r = await fetch(...)")` to run HTTP calls in sandbox

### Inline HTTP — BLOCKED
Any Bash command containing `fetch('http`, `requests.get(`, `requests.post(`, `http.get(`, or `http.request(` is intercepted and replaced with an error message. Do NOT retry with Bash.
Instead use:
- `ctx_execute(language, code)` to run HTTP calls in sandbox — only stdout enters context

### WebFetch — BLOCKED
WebFetch calls are denied entirely. The URL is extracted and you are told to use `ctx_fetch_and_index` instead.
Instead use:
- `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` to query the indexed content

## REDIRECTED tools — use sandbox equivalents

### Bash (>20 lines output)
Bash is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `ctx_batch_execute(commands, queries)` — run multiple commands + search in ONE call
- `ctx_execute(language: "shell", code: "...")` — run in sandbox, only stdout enters context

### Read (for analysis)
If you are reading a file to **Edit** it → Read is correct (Edit needs content in context).
If you are reading to **analyze, explore, or summarize** → use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context. The raw file content stays in the sandbox.

### Grep (large results)
Grep results can flood context. Use `ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` — Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` — Sandbox execution. Only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` — Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` — Store content in FTS5 knowledge base for later search.

## Subagent routing

When spawning subagents (Agent/Task tool), the routing block is automatically injected into their prompt. Bash-type subagents are upgraded to general-purpose so they have access to MCP tools. You do NOT need to manually instruct subagents about context-mode.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES — never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `ctx_search(source: "label")` later.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `ctx_stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `ctx_doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `ctx_upgrade` MCP tool, run the returned shell command, display as checklist |
