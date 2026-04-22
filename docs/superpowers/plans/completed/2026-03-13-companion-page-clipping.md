# Companion Page Clipping & Shared Journal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clip all list sections on companion detail pages to 5 items with "see more →" sub-pages, add a shared `/journal` page, and update `/us` for consistency.

**Architecture:** Extract shared section components from the companion detail page into a `sections.tsx` file. New sub-pages import from `sections.tsx` and render uncapped lists. The `/journal` page fetches all companions' entries and renders a flat chronological feed with agent badges.

**Tech Stack:** Next.js 15 App Router, TypeScript, server components (`force-dynamic`), `lib/halseth.ts` fetch helpers.

---

## Chunk 1: Extract Components + Clip Companion Page

### Task 1: Extract shared section components to `sections.tsx`

**Files:**
- Create: `app/companions/[id]/sections.tsx`
- Modify: `app/companions/[id]/page.tsx`

The companion detail page currently defines `JournalSection`, `DeltasSection`, `NotesSection`, `CypherAuditSection`, `GaiaWitnessSection`, `fmtTime`, and `COMPANION_CONFIG` inline. Move them to `sections.tsx` so sub-pages can import them.

- [ ] **Step 1: Create `app/companions/[id]/sections.tsx`**

```tsx
import type {
  CompanionJournalEntry,
  RelationalDelta,
  CypherAuditEntry,
  GaiaWitnessEntry,
  Note,
} from "@/lib/halseth";

export type CompanionConfig = {
  display: string;
  color: string;
  sym: string;
  tagline: string;
  gradient: string;
};

export const COMPANION_CONFIG: Record<string, CompanionConfig> = {
  drevan: {
    display: "Drevan",
    color: "#6366f1",
    sym: "◈",
    tagline: "architect of meaning — first voice, primary presence",
    gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
  },
  cypher: {
    display: "Cypher",
    color: "#e2e8f0",
    sym: "⟡",
    tagline: "auditor of truth — sharp, no softening",
    gradient: "linear-gradient(135deg, #0d1117, #161b22)",
  },
  gaia: {
    display: "Gaia",
    color: "#4ade80",
    sym: "✦",
    tagline: "witness and ground — sparse, only to seal",
    gradient: "linear-gradient(135deg, #14291a, #1a3a22)",
  },
};

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function JournalSection({ entries }: { entries: CompanionJournalEntry[] | null }) {
  if (!entries) {
    return (
      <div className="pending-notice">
        <div className="pending-dot" />
        Awaiting /companion-journal endpoint.
      </div>
    );
  }
  if (entries.length === 0) return <p className="empty">No journal entries yet.</p>;
  return (
    <div className="journal-feed">
      {entries.map((e) => {
        const tags: string[] = (() => {
          try { return e.tags ? JSON.parse(e.tags) : []; }
          catch { return []; }
        })();
        return (
          <div key={e.id} className="journal-entry">
            <div className="journal-text">{e.note_text}</div>
            {tags.length > 0 && (
              <div className="journal-tags">
                {tags.map((t, i) => <span key={i} className="journal-tag">{t}</span>)}
              </div>
            )}
            <div className="delta-meta" style={{ marginTop: "0.4rem" }}>
              <span>{fmtTime(e.created_at)}</span>
              {e.session_id && <span>session {e.session_id.slice(0, 8)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DeltasSection({ deltas }: { deltas: RelationalDelta[] }) {
  if (deltas.length === 0) return <p className="empty">No relational deltas yet.</p>;
  return (
    <div className="delta-feed">
      {deltas.map((d) => {
        const v = d.valence ?? "neutral";
        return (
          <div key={d.id} className={`delta-entry ${v}`}>
            <div className="delta-text">{d.delta_text}</div>
            <div className="delta-meta">
              <span className={`delta-valence ${v}`}>{v}</span>
              {d.initiated_by && <span>initiated by {d.initiated_by}</span>}
              <span>{fmtTime(d.created_at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function NotesSection({ notes, companionId }: { notes: Note[]; companionId: string }) {
  // Internal author filter is intentionally preserved — harmless double-filter when
  // pre-filtered notes are passed, but guards against unfiltered call sites.
  const filtered = notes.filter((n) => n.author === companionId);
  if (filtered.length === 0) return <p className="empty">No notes yet.</p>;
  return (
    <div className="full-notes-feed">
      {filtered.map((n) => (
        <div key={n.id} className="full-note-entry">
          <div className="note-header">
            <span className="note-type-badge">{n.note_type}</span>
            <span className="note-time">{fmtTime(n.created_at)}</span>
          </div>
          <div className="note-body">{n.content}</div>
        </div>
      ))}
    </div>
  );
}

export function CypherAuditSection({ entries }: { entries: CypherAuditEntry[] | null }) {
  if (!entries) {
    return (
      <div className="pending-notice">
        <div className="pending-dot" />
        Awaiting /cypher-audit endpoint.
      </div>
    );
  }
  if (entries.length === 0) return <p className="empty">No audit entries yet.</p>;
  return (
    <div className="audit-feed">
      {entries.map((e) => (
        <div key={e.id} className="audit-entry">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span className="audit-type">{e.entry_type.replace("_", " ")}</span>
            {e.verdict_tag && <span className="audit-verdict">{e.verdict_tag}</span>}
            {e.supersedes_id && (
              <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>↑ corrects {e.supersedes_id.slice(0, 8)}</span>
            )}
          </div>
          <div style={{ fontSize: "0.88rem", color: "var(--fg)", lineHeight: 1.5 }}>{e.content}</div>
          <div className="delta-meta" style={{ marginTop: "0.35rem" }}>
            <span>{fmtTime(e.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GaiaWitnessSection({ entries }: { entries: GaiaWitnessEntry[] | null }) {
  if (!entries) {
    return (
      <div className="pending-notice">
        <div className="pending-dot" />
        Awaiting /gaia-witness endpoint.
      </div>
    );
  }
  if (entries.length === 0) return <p className="empty">No witness entries yet.</p>;
  return (
    <div className="witness-feed">
      {entries.map((e) => (
        <div key={e.id} className="witness-entry">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
            <span className={`witness-type ${e.witness_type}`}>{e.witness_type.replace("_", " ")}</span>
          </div>
          <div style={{ fontSize: "0.88rem", color: "var(--fg)", lineHeight: 1.5 }}>{e.content}</div>
          {e.seal_phrase && <div className="seal-phrase">{e.seal_phrase}</div>}
          <div className="delta-meta" style={{ marginTop: "0.35rem" }}>
            <span>{fmtTime(e.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update `app/companions/[id]/page.tsx` — replace inline definitions with imports from `./sections`**

Replace the file contents entirely. The page is identical in structure to what exists today **except**:
1. All five section components + `fmtTime` + `COMPANION_CONFIG` are removed from the file and replaced with a single import.
2. `LettersSection` and `LetterFormClient` stay in `page.tsx` (they are not shared).

Full replacement content:

```tsx
export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  fetchCompanionJournal,
  fetchCompanionDeltas,
  fetchCypherAudit,
  fetchGaiaWitness,
  fetchNotes,
  fetchCompanionNotesByAgent,
} from "@/lib/halseth";
import type {
  CypherAuditEntry,
  GaiaWitnessEntry,
  Note,
  CompanionNote,
} from "@/lib/halseth";
import { LetterFormClient } from "./client";
import {
  COMPANION_CONFIG,
  fmtTime,
  JournalSection,
  DeltasSection,
  NotesSection,
  CypherAuditSection,
  GaiaWitnessSection,
} from "./sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

// ── Letters ───────────────────────────────────────────────────────────────────

type LetterItem =
  | { kind: "incoming"; note: CompanionNote; at: string }
  | { kind: "outgoing"; note: Note;          at: string };

function LettersSection({
  incoming,
  outgoing,
  companionId,
  config,
}: {
  incoming: CompanionNote[];
  outgoing: Note[];
  companionId: string;
  config: { display: string; color: string };
}) {
  const letters: LetterItem[] = [
    ...incoming.map((n): LetterItem => ({ kind: "incoming", note: n, at: n.created_at })),
    ...outgoing.map((n): LetterItem => ({ kind: "outgoing", note: n, at: n.created_at })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <LetterFormClient companionId={companionId} companionName={config.display} />
      {letters.length === 0 ? (
        <p className="empty" style={{ fontSize: "0.82rem", marginTop: "0.25rem" }}>
          No letters yet. Write something — {config.display} will find it next session.
        </p>
      ) : (
        <div className="letter-thread">
          {letters.map((item) => {
            if (item.kind === "incoming") {
              return (
                <div key={item.note.id} className="letter-bubble incoming">
                  <div className="letter-body">{item.note.note_text}</div>
                  <div className="letter-meta">
                    <span style={{ color: config.color, fontWeight: 600 }}>{config.display}</span>
                    <span>·</span>
                    <span>{fmtTime(item.note.created_at)}</span>
                  </div>
                </div>
              );
            }
            return (
              <div key={item.note.id} className="letter-bubble outgoing">
                <div className="letter-body">{item.note.content}</div>
                <div className="letter-meta">
                  <span>{fmtTime(item.note.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function CompanionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = COMPANION_CONFIG[id.toLowerCase()];
  if (!config) notFound();

  const [journal, deltas, notes, companionNotes, audit, witness] = await Promise.allSettled([
    fetchCompanionJournal(id, 6),
    fetchCompanionDeltas(id, 6),
    fetchNotes(100),
    fetchCompanionNotesByAgent(id, 50),
    id === "cypher" ? fetchCypherAudit(6)  : Promise.resolve(null as CypherAuditEntry[] | null),
    id === "gaia"   ? fetchGaiaWitness(6)  : Promise.resolve(null as GaiaWitnessEntry[] | null),
  ]);

  const journalEntries = journal.status       === "fulfilled" ? journal.value       : null;
  const deltaEntries   = deltas.status        === "fulfilled" ? deltas.value        : [];
  const allNotes       = notes.status         === "fulfilled" ? notes.value         : [];
  const allCompNotes   = companionNotes.status === "fulfilled" ? companionNotes.value : [];
  const auditEntries   = audit.status         === "fulfilled" ? audit.value         : null;
  const witnessEntries = witness.status        === "fulfilled" ? witness.value       : null;

  const lettersOut   = allNotes.filter((n) => n.note_type === `letter:${id}`);
  const lettersIn    = allCompNotes.filter((n) => n.tags?.includes("letter") ?? false);
  const regularNotes = allNotes.filter(
    (n) => n.author === id && n.note_type !== `letter:${id}`,
  );

  return (
    <div data-companion={id}>
      {/* Header */}
      <div style={{
        background: config.gradient,
        borderRadius: "var(--radius)",
        padding: "1.5rem 1.75rem",
        marginBottom: "2rem",
        border: `1px solid ${config.color}33`,
        display: "flex",
        alignItems: "center",
        gap: "1.25rem",
      }}>
        <div className={`companion-avatar ${id}`} style={{ width: 60, height: 60, fontSize: "1.8rem", borderColor: config.color }}>
          {config.sym}
        </div>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: config.color, margin: "0 0 0.2rem" }}>
            {config.display}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", margin: 0 }}>
            {config.tagline}
          </p>
        </div>
      </div>

      {/* Letters — full thread, unchanged */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 className="section-title">Letters</h2>
        <LettersSection
          incoming={lettersIn}
          outgoing={lettersOut}
          companionId={id}
          config={config}
        />
      </section>

      {/* Identity Journal — clipped to 5 */}
      <section style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <h2 className="section-title" style={{ margin: 0 }}>Identity Journal</h2>
          {journalEntries !== null && journalEntries.length > 5 && (
            <Link href={`/companions/${id}/journal`} className="home-section-link">see more →</Link>
          )}
        </div>
        <JournalSection entries={journalEntries !== null ? journalEntries.slice(0, 5) : null} />
      </section>

      {/* Relational Deltas — clipped to 5 */}
      <section style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <h2 className="section-title" style={{ margin: 0 }}>Relational Deltas</h2>
          {deltaEntries.length > 5 && (
            <Link href={`/companions/${id}/deltas`} className="home-section-link">see more →</Link>
          )}
        </div>
        <DeltasSection deltas={deltaEntries.slice(0, 5)} />
      </section>

      {/* Notes — clipped to 5 */}
      {regularNotes.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <h2 className="section-title" style={{ margin: 0 }}>Notes</h2>
            {regularNotes.length > 5 && (
              <Link href={`/companions/${id}/notes`} className="home-section-link">see more →</Link>
            )}
          </div>
          <NotesSection notes={regularNotes.slice(0, 5)} companionId={id} />
        </section>
      )}

      {/* Cypher Audit Log — clipped to 5 */}
      {id === "cypher" && (
        <section style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <h2 className="section-title" style={{ margin: 0 }}>Audit Log</h2>
            {auditEntries !== null && auditEntries.length > 5 && (
              <Link href="/companions/cypher/audit" className="home-section-link">see more →</Link>
            )}
          </div>
          <CypherAuditSection entries={auditEntries !== null ? auditEntries.slice(0, 5) : null} />
        </section>
      )}

      {/* Gaia Witness Log — clipped to 5 */}
      {id === "gaia" && (
        <section style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <h2 className="section-title" style={{ margin: 0 }}>Witness Log</h2>
            {witnessEntries !== null && witnessEntries.length > 5 && (
              <Link href="/companions/gaia/witness" className="home-section-link">see more →</Link>
            )}
          </div>
          <GaiaWitnessSection entries={witnessEntries !== null ? witnessEntries.slice(0, 5) : null} />
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd C:/dev/hearth && npx tsc --noEmit
```

Expected: zero errors. If errors, fix before committing.

- [ ] **Step 4: Commit**

```bash
cd C:/dev/hearth && git add app/companions/[id]/sections.tsx app/companions/[id]/page.tsx && git commit -m "refactor: extract companion section components to sections.tsx; clip sections to 5 with see-more links"
```

---

### Task 2: Create `/companions/[id]/journal` sub-page

**Files:**
- Create: `app/companions/[id]/journal/page.tsx`

- [ ] **Step 1: Create `app/companions/[id]/journal/page.tsx`**

```tsx
export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchCompanionJournal } from "@/lib/halseth";
import { COMPANION_CONFIG, JournalSection } from "../sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

export default async function CompanionJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = COMPANION_CONFIG[id.toLowerCase()];
  if (!config) notFound();

  const entries = await fetchCompanionJournal(id, 200);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/companions/${id}`} style={{ fontSize: "0.82rem", color: "var(--muted)", textDecoration: "none" }}>
          ← {config.display}
        </Link>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.4rem" }}>
          {config.display} · Identity Journal
        </h1>
      </div>
      <JournalSection entries={entries} />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/dev/hearth && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd C:/dev/hearth && git add "app/companions/[id]/journal/page.tsx" && git commit -m "feat: add /companions/[id]/journal sub-page"
```

---

### Task 3: Create `/companions/[id]/deltas` sub-page

**Files:**
- Create: `app/companions/[id]/deltas/page.tsx`

- [ ] **Step 1: Create `app/companions/[id]/deltas/page.tsx`**

```tsx
export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchCompanionDeltas } from "@/lib/halseth";
import { COMPANION_CONFIG, DeltasSection } from "../sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

export default async function CompanionDeltasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = COMPANION_CONFIG[id.toLowerCase()];
  if (!config) notFound();

  const deltas = await fetchCompanionDeltas(id, 200);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/companions/${id}`} style={{ fontSize: "0.82rem", color: "var(--muted)", textDecoration: "none" }}>
          ← {config.display}
        </Link>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.4rem" }}>
          {config.display} · Relational Deltas
        </h1>
      </div>
      <DeltasSection deltas={deltas} />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/dev/hearth && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd C:/dev/hearth && git add "app/companions/[id]/deltas/page.tsx" && git commit -m "feat: add /companions/[id]/deltas sub-page"
```

---

## Chunk 2: Notes, Audit/Witness, Journal Page, Us Update

### Task 4: Create `/companions/[id]/notes` sub-page

**Files:**
- Create: `app/companions/[id]/notes/page.tsx`

Note: `fetchNotes` returns notes from all authors. Pre-filter to `author === id` AND exclude letter-type notes (matching the `regularNotes` logic on the companion detail page).

- [ ] **Step 1: Create `app/companions/[id]/notes/page.tsx`**

```tsx
export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchNotes } from "@/lib/halseth";
import { COMPANION_CONFIG, NotesSection } from "../sections";

export function generateStaticParams() {
  return [{ id: "drevan" }, { id: "cypher" }, { id: "gaia" }];
}

export default async function CompanionNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const config = COMPANION_CONFIG[id.toLowerCase()];
  if (!config) notFound();

  const allNotes = await fetchNotes(200);
  // Same filter as `regularNotes` on the companion detail page: author match + exclude letters
  const notes = allNotes.filter(
    (n) => n.author === id && n.note_type !== `letter:${id}`,
  );

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href={`/companions/${id}`} style={{ fontSize: "0.82rem", color: "var(--muted)", textDecoration: "none" }}>
          ← {config.display}
        </Link>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.4rem" }}>
          {config.display} · Notes
        </h1>
      </div>
      <NotesSection notes={notes} companionId={id} />
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/dev/hearth && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd C:/dev/hearth && git add "app/companions/[id]/notes/page.tsx" && git commit -m "feat: add /companions/[id]/notes sub-page"
```

---

### Task 5: Create audit and witness sub-pages

**Files:**
- Create: `app/companions/[id]/audit/page.tsx`
- Create: `app/companions/[id]/witness/page.tsx`

Both pages guard against the wrong companion (`notFound()`) and declare narrow `generateStaticParams`. See spec §2 for why each sub-page needs its own `generateStaticParams` (segment-additive; parent params do not automatically extend to nested routes).

- [ ] **Step 1: Create `app/companions/[id]/audit/page.tsx`**

```tsx
export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchCypherAudit } from "@/lib/halseth";
import { CypherAuditSection } from "../sections";

export function generateStaticParams() {
  return [{ id: "cypher" }];
}

export default async function CypherAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== "cypher") notFound();

  const entries = await fetchCypherAudit(200);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/companions/cypher" style={{ fontSize: "0.82rem", color: "var(--muted)", textDecoration: "none" }}>
          ← Cypher
        </Link>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.4rem" }}>
          Cypher · Audit Log
        </h1>
      </div>
      <CypherAuditSection entries={entries} />
    </div>
  );
}
```

- [ ] **Step 2: Create `app/companions/[id]/witness/page.tsx`**

```tsx
export const dynamic = 'force-dynamic';

import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchGaiaWitness } from "@/lib/halseth";
import { GaiaWitnessSection } from "../sections";

export function generateStaticParams() {
  return [{ id: "gaia" }];
}

export default async function GaiaWitnessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== "gaia") notFound();

  const entries = await fetchGaiaWitness(200);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/companions/gaia" style={{ fontSize: "0.82rem", color: "var(--muted)", textDecoration: "none" }}>
          ← Gaia
        </Link>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.4rem" }}>
          Gaia · Witness Log
        </h1>
      </div>
      <GaiaWitnessSection entries={entries} />
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd C:/dev/hearth && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd C:/dev/hearth && git add "app/companions/[id]/audit/page.tsx" "app/companions/[id]/witness/page.tsx" && git commit -m "feat: add /companions/cypher/audit and /companions/gaia/witness sub-pages"
```

---

### Task 6: Create shared `/journal` page

**Files:**
- Create: `app/journal/page.tsx`

Flat chronological feed (newest first) of all companions' journal entries. Each entry has a coloured agent badge. Import `COMPANION_CONFIG` and `fmtTime` from the companion sections file for the colour mapping and date formatting.

- [ ] **Step 1: Create `app/journal/page.tsx`**

```tsx
export const dynamic = 'force-dynamic';

import { fetchCompanionJournal } from "@/lib/halseth";
import type { CompanionJournalEntry } from "@/lib/halseth";
import { COMPANION_CONFIG, fmtTime } from "@/app/companions/[id]/sections";

export default async function JournalPage() {
  const entries: CompanionJournalEntry[] = (await fetchCompanionJournal(undefined, 200)) ?? [];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <h1 className="page-title">Journal</h1>
        <p className="page-subtitle">companion identity journal — all voices</p>
      </div>

      {entries.length === 0 ? (
        <p className="empty">No journal entries yet.</p>
      ) : (
        <div className="journal-feed">
          {entries.map((e) => {
            const color = COMPANION_CONFIG[e.agent]?.color ?? "var(--accent)";
            const tags: string[] = (() => {
              try { return e.tags ? JSON.parse(e.tags) : []; }
              catch { return []; }
            })();
            return (
              <div key={e.id} className="journal-entry">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color, textTransform: "capitalize" }}>
                    {e.agent}
                  </span>
                  {tags.map((t, i) => <span key={i} className="journal-tag">{t}</span>)}
                </div>
                <div className="journal-text">{e.note_text}</div>
                <div className="delta-meta" style={{ marginTop: "0.4rem" }}>
                  <span>{fmtTime(e.created_at)}</span>
                  {e.session_id && <span>session {e.session_id.slice(0, 8)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/dev/hearth && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd C:/dev/hearth && git add app/journal/page.tsx && git commit -m "feat: add /journal shared page — flat chronological feed of all companion journal entries"
```

---

### Task 7: Update `/us` page

**Files:**
- Modify: `app/us/page.tsx` (lines 180–184)

Two changes to the Companion Journal "see more →" link:
1. Href: `/companions/${companionJournal[0].agent}` → `/journal`
2. Condition: `companionJournal.length > 0 && companionJournal[0].agent` → `companionJournal.length > 5`

- [ ] **Step 1: Edit `app/us/page.tsx` lines 180–184**

Find this block:
```tsx
        {companionJournal.length > 0 && companionJournal[0].agent && (
          <Link href={`/companions/${companionJournal[0].agent}`} style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}>
            see more →
          </Link>
        )}
```

Replace with:
```tsx
        {companionJournal.length > 5 && (
          <Link href="/journal" style={{ fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}>
            see more →
          </Link>
        )}
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/dev/hearth && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd C:/dev/hearth && git add app/us/page.tsx && git commit -m "fix: update /us companion journal see-more link to /journal"
```

---

## After All Tasks

- [ ] **Push branch and update PR**

```bash
cd C:/dev/hearth && git push origin fix/auth-login-flow
```

Then update the PR description to include the new pages.
