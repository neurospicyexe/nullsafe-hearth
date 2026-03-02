import { type MindData, type MindJournalEntry, type CompanionNote } from "@/lib/halseth";
import { CompanionNotesFeedClient, CompanionNoteFormClient, JournalFormClient } from "./client";

export const revalidate = 60;

async function fetchMind(): Promise<MindData | null> {
  const base = process.env.MIND_URL ?? process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return null;
  const h: Record<string, string> = secret ? { Authorization: `Bearer ${secret}` } : {};
  try {
    const [healthRes, patternsRes, journalsRes] = await Promise.all([
      fetch(`${base}/mind/health`,           { headers: h, next: { revalidate: 60 } }),
      fetch(`${base}/mind/patterns?days=7`,  { headers: h, next: { revalidate: 60 } }),
      fetch(`${base}/mind/recent?hours=168`, { headers: h, next: { revalidate: 60 } }),
    ]);
    const health          = healthRes.ok   ? await healthRes.json()   : { entities: 0, observations: 0, relations: 0, journals: 0, salience: {} };
    const patterns        = patternsRes.ok ? await patternsRes.json() : null;
    const recent_journals = journalsRes.ok ? await journalsRes.json() : [];
    return { health, patterns, recent_journals };
  } catch {
    return null;
  }
}

async function fetchCompanionNotes(): Promise<CompanionNote[]> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return [];
  try {
    const res = await fetch(`${base}/companion-notes`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Mind Health Panel ─────────────────────────────────────────────────────────

function MindHealthPanel({ health }: { health: MindData["health"] }) {
  const stats = [
    { label: "entities",     value: health.entities },
    { label: "observations", value: health.observations },
    { label: "relations",    value: health.relations },
    { label: "journals",     value: health.journals },
  ];

  const salienceColors: Record<string, string> = {
    foundational: "var(--accent)",
    active:       "var(--green)",
    background:   "var(--muted)",
    archive:      "var(--border)",
  };

  const maxSalience = Math.max(...Object.values(health.salience), 1);

  return (
    <div className="card card-accent">
      <div className="card-title">Mind Health</div>
      <div className="mind-stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="mind-stat">
            <div className="mind-stat-value">{s.value}</div>
            <div className="mind-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      {Object.keys(health.salience).length > 0 && (
        <div className="valence-bars">
          {Object.entries(health.salience).map(([key, count]) => (
            <div key={key} className="valence-row">
              <span className="valence-label">{key}</span>
              <div className="valence-track">
                <div
                  className="valence-fill"
                  style={{
                    width: `${Math.round((count / maxSalience) * 100)}%`,
                    background: salienceColors[key] ?? "var(--accent)",
                  }}
                />
              </div>
              <span className="valence-count">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Journal Feed ──────────────────────────────────────────────────────────────

function JournalFeed({ journals }: { journals: MindJournalEntry[] }) {
  if (journals.length === 0) return null;
  return (
    <div className="card">
      <div className="card-title">Recent Journals</div>
      <div className="delta-feed">
        {journals.slice(0, 5).map((j) => (
          <div key={j.id} className="delta-entry neutral">
            <div className="delta-text">{j.entry}</div>
            <div className="delta-meta">
              <span className="delta-time">{formatTime(j.created_at)}</span>
              {j.tags.map((tag) => (
                <span key={tag} className="companion-note-tag">{tag}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MindPage() {
  const [mind, notes] = await Promise.all([fetchMind(), fetchCompanionNotes()]);

  return (
    <main className="page">
      <header className="header">
        <div className="header-top"><h1>Mind</h1></div>
      </header>
      {mind?.health && <MindHealthPanel health={mind.health} />}
      <CompanionNotesFeedClient initialNotes={notes} />
      <CompanionNoteFormClient />
      {mind?.recent_journals && <JournalFeed journals={mind.recent_journals} />}
      <JournalFormClient />
    </main>
  );
}
