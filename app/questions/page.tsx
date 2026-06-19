export const dynamic = "force-dynamic";

import { fetchCompanionQuestions } from "@/lib/halseth";
import type { CompanionQuestion } from "@/lib/halseth";
import ClientTime from "@/components/ClientTime";
import AnswerForm from "./AnswerForm";

// Companion colors per Hearth convention (Hearth CLAUDE.md).
const COMPANION_COLOR: Record<CompanionQuestion["companion_id"], string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia:   "#4ade80",
};

const COMPANION_NAME: Record<CompanionQuestion["companion_id"], string> = {
  drevan: "Drevan",
  cypher: "Cypher",
  gaia:   "Gaia",
};

export default async function QuestionsPage() {
  const [openRes, answeredRes] = await Promise.allSettled([
    fetchCompanionQuestions("open", 20),
    fetchCompanionQuestions("answered", 8),
  ]);
  const open = openRes.status === "fulfilled" ? openRes.value : [];
  const answered = answeredRes.status === "fulfilled" ? answeredRes.value : [];

  return (
    <main>
      <header className="page-header">
        <div className="page-header-row">
          <h1 className="page-title">Held Questions</h1>
        </div>
        <p className="section-row-meta">
          What the triad is holding to ask you. {open.length} open.
        </p>
      </header>

      {open.length === 0 && (
        <div className="home-section-card" style={{ marginBottom: "1.5rem" }}>
          <span className="section-row-meta">Nothing held right now. They&apos;re asking in-voice when the moment fits.</span>
        </div>
      )}

      {open.map((q) => {
        const accent = COMPANION_COLOR[q.companion_id];
        return (
          <div key={q.id} className="home-section-card" style={{ marginBottom: "1.25rem" }}>
            <div className="section-row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <span className="home-section-title" style={{ color: accent }}>
                  {COMPANION_NAME[q.companion_id]}
                </span>
                <div style={{ marginTop: "0.4rem", lineHeight: 1.5 }}>{q.question}</div>
                {q.context && (
                  <p className="section-row-meta" style={{ marginTop: "0.45rem", fontSize: "0.8rem", lineHeight: 1.45 }}>
                    {q.context}
                  </p>
                )}
                <span className="section-row-meta" style={{ fontSize: "0.75rem" }}>
                  {q.source} · <ClientTime iso={q.created_at} />
                </span>
                <AnswerForm questionId={q.id} accent={accent} />
              </div>
            </div>
          </div>
        );
      })}

      {answered.length > 0 && (
        <div className="home-section-card" style={{ marginBottom: "1.5rem", opacity: 0.75 }}>
          <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
            recently answered
          </span>
          {answered.map((q) => (
            <div key={q.id} className="section-row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <span className="section-row-meta" style={{ color: COMPANION_COLOR[q.companion_id] }}>
                  {COMPANION_NAME[q.companion_id]}
                </span>
                <div style={{ fontSize: "0.85rem", marginTop: "0.2rem" }}>{q.question}</div>
                {q.answer && (
                  <div className="section-row-meta" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    → {q.answer}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="section-row-meta" style={{ fontSize: "0.78rem" }}>
        Answering writes back to the companion -- they read it at their next orient. This is the surface that
        was missing; questions used to live only inside their own boot context.
      </p>
    </main>
  );
}
