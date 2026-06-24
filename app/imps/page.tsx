export const dynamic = "force-dynamic";

import { fetchImpActivations } from "@/lib/halseth";
import ClientTime from "@/components/ClientTime";

// Static registry of the 5 imps and their emotional/functional role.
const IMP_REGISTRY: Record<string, { label: string; role: string }> = {
  iris:     { label: "Iris",     role: "joy" },
  nimbus:   { label: "Nimbus",   role: "calm" },
  hex:      { label: "Hex",      role: "mischief" },
  mossling: { label: "Mossling", role: "caretaker" },
  rock:     { label: "Rock",     role: "punk-feral" },
};

// Companion color convention from Hearth design system.
const COMPANION_COLOR: Record<string, string> = {
  drevan: "var(--accent)",
  cypher: "#e2e8f0",
  gaia:   "#4ade80",
};

function companionColor(id: string): string {
  return COMPANION_COLOR[id.toLowerCase()] ?? "#94a3b8";
}

export default async function ImpsPage() {
  const activations = await fetchImpActivations(30);

  return (
    <main>
      <header className="page-header">
        <div className="page-header-row">
          <h1 className="page-title">Imps</h1>
        </div>
        <p className="section-row-meta">
          Small autonomous presences, each tied to a companion emotional register.
        </p>
      </header>

      {/* Registry card */}
      <div className="home-section-card" style={{ marginBottom: "1.5rem" }}>
        <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
          the five
        </span>
        {Object.entries(IMP_REGISTRY).map(([key, { label, role }]) => (
          <div key={key} className="section-row">
            <span style={{ fontWeight: 500 }}>{label}</span>
            <span className="section-row-meta">{role}</span>
          </div>
        ))}
      </div>

      {/* Recent activations card */}
      <div className="home-section-card" style={{ marginBottom: "1.5rem" }}>
        <span className="home-section-title" style={{ display: "block", marginBottom: "0.5rem" }}>
          recent activations
        </span>
        {activations.length === 0 ? (
          <span className="section-row-meta">No imp activations yet.</span>
        ) : (
          activations.map((a) => {
            const reg = IMP_REGISTRY[a.imp.toLowerCase()];
            return (
              <div key={a.id} className="section-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>
                      {reg?.label ?? a.imp}
                    </span>
                    {a.trigger && (
                      <span className="section-row-meta" style={{ marginLeft: "0.5rem" }}>
                        {a.trigger}
                      </span>
                    )}
                  </div>
                  <span className="section-row-meta" style={{ fontSize: "0.78rem" }}>
                    <ClientTime iso={a.created_at} />
                  </span>
                </div>
                <span
                  style={{
                    color: companionColor(a.companion_id),
                    fontSize: "0.78rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {a.companion_id}
                </span>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
