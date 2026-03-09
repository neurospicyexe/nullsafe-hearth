import { fetchPresence } from "@/lib/halseth";

export const revalidate = 30;

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function SharedPage() {
  let data = null;
  try {
    data = await fetchPresence();
  } catch {
    // fall through
  }

  const tasks = data?.tasks ?? [];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Shared</h1>
        <p className="page-subtitle">tasks, events, and lists in the shared zone</p>
      </div>

      {/* Tasks */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 className="section-title">Open Tasks</h2>
        {tasks.length === 0 ? (
          <p className="empty">No open tasks.</p>
        ) : (
          <div className="full-task-list">
            {tasks.map((t) => (
              <div key={t.id} className="full-task-row">
                <div className={`priority-dot ${t.priority}`} />
                <span className="task-title">{t.title}</span>
                {t.assigned_to && (
                  <span className="task-meta">→ {t.assigned_to}</span>
                )}
                {t.due_at && (
                  <span className="task-meta">{formatDate(t.due_at)}</span>
                )}
                <span className="task-meta" style={{ textTransform: "capitalize" }}>{t.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Events — placeholder until /events endpoint exists */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 className="section-title">Upcoming Events</h2>
        <div className="pending-notice">
          <div className="pending-dot" />
          Awaiting Halseth /events endpoint.
        </div>
      </section>

      {/* Lists — placeholder until /lists endpoint exists */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 className="section-title">Lists</h2>
        <div className="pending-notice">
          <div className="pending-dot" />
          Awaiting Halseth /lists endpoint.
        </div>
      </section>

      {/* Bridge status */}
      <section>
        <h2 className="section-title">Bridge</h2>
        <div className="pending-notice">
          <div className="pending-dot" />
          Awaiting Halseth /bridge/status endpoint.
        </div>
      </section>
    </>
  );
}
