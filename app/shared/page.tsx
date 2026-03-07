import { fetchTasks, fetchEvents, fetchLists, fetchBridge } from "@/lib/halseth";

export const dynamic = 'force-dynamic';

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function SharedPage() {
  const [tasks, events, lists, bridge] = await Promise.all([
    fetchTasks(),
    fetchEvents(),
    fetchLists(),
    fetchBridge(),
  ]);

  // Group list items by list_name
  const listGroups = lists.reduce<Record<string, typeof lists>>((acc, item) => {
    (acc[item.list_name] ??= []).push(item);
    return acc;
  }, {});

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

      {/* Events */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 className="section-title">Upcoming Events</h2>
        {events.length === 0 ? (
          <p className="empty">No upcoming events.</p>
        ) : (
          <div className="full-task-list">
            {events.map((e) => (
              <div key={e.id} className="full-task-row">
                <span className="task-title">{e.title}</span>
                {e.category && <span className="task-meta">{e.category}</span>}
                <span className="task-meta">{fmtTime(e.start_time)}</span>
                {e.end_time && <span className="task-meta">→ {fmtTime(e.end_time)}</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lists */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 className="section-title">Lists</h2>
        {Object.keys(listGroups).length === 0 ? (
          <p className="empty">No list items.</p>
        ) : (
          Object.entries(listGroups).map(([name, items]) => (
            <div key={name} style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", marginBottom: "0.4rem" }}>{name}</div>
              <div className="full-task-list">
                {items.map((item) => (
                  <div key={item.id} className="full-task-row" style={{ opacity: item.completed ? 0.4 : 1 }}>
                    <span style={{ fontSize: "0.9rem" }}>{item.completed ? "✓" : "○"}</span>
                    <span className="task-title" style={{ textDecoration: item.completed ? "line-through" : "none" }}>{item.item_text}</span>
                    {item.added_by && <span className="task-meta">{item.added_by}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Bridge status */}
      {bridge && (
        <section>
          <h2 className="section-title">Bridge</h2>
          <div className="state-cell">
            <div className="state-cell-label">Connected to</div>
            <div className="state-cell-value">{bridge.system ?? "partner"}</div>
          </div>
          {bridge.enabled && bridge.enabled.length > 0 && (
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.5rem" }}>
              Sharing: {bridge.enabled.join(", ")}
            </div>
          )}
        </section>
      )}
    </>
  );
}
