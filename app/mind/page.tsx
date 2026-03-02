import type { CompanionNote, MindData } from "@/lib/halseth";
import {
  JournalFormClient,
  CompanionNoteFormClient,
  CompanionNotesFeedClient,
  JournalFeedClient,
} from "./client";

export const revalidate = 30;

async function fetchCompanionNotes(): Promise<CompanionNote[]> {
  const base = process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return [];

  const res = await fetch(`${base}/companion-notes`, {
    headers: { ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
    next: { revalidate: 30 },
  });

  if (!res.ok) return [];
  return res.json();
}

async function fetchMind(): Promise<MindData | null> {
  const base = process.env.MIND_URL ?? process.env.HALSETH_URL;
  const secret = process.env.HALSETH_SECRET;
  if (!base) return null;

  try {
    const res = await fetch(`${base}/mind`, {
      headers: { ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function MindPage() {
  const [notes, mind] = await Promise.all([
    fetchCompanionNotes(),
    fetchMind(),
  ]);

  return (
    <main className="page">
      <header className="header">
        <div className="header-top">
          <h1>Mind</h1>
          <span className="system-owner">knowledge</span>
        </div>
      </header>

      {/* Mind stats */}
      {mind?.health && (
        <div className="card">
          <div className="card-title">Knowledge Graph</div>
          <div className="mind-stat-grid">
            <div className="mind-stat">
              <div className="mind-stat-value">{mind.health.entities}</div>
              <div className="mind-stat-label">entities</div>
            </div>
            <div className="mind-stat">
              <div className="mind-stat-value">{mind.health.observations}</div>
              <div className="mind-stat-label">observations</div>
            </div>
            <div className="mind-stat">
              <div className="mind-stat-value">{mind.health.relations}</div>
              <div className="mind-stat-label">relations</div>
            </div>
            <div className="mind-stat">
              <div className="mind-stat-value">{mind.health.journals}</div>
              <div className="mind-stat-label">journals</div>
            </div>
          </div>
          {mind.patterns?.themes && mind.patterns.themes.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <div className="kv-grid">
                <span className="kv-label">themes</span>
                <span className="kv-value">{mind.patterns.themes.join(", ")}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Journal entry form */}
      <div className="card">
        <div className="card-title">New Entry</div>
        <JournalFormClient />
      </div>

      {/* Recent journal entries */}
      <JournalFeedClient journals={mind?.recent_journals ?? []} />

      {/* Companion notes feed */}
      <CompanionNotesFeedClient initial={notes} />

      {/* Log a companion note */}
      <div className="card">
        <div className="card-title">Log Companion Note</div>
        <CompanionNoteFormClient />
      </div>
    </main>
  );
}
