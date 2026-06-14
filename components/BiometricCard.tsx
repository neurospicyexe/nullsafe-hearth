import type { PresenceData } from "@/lib/halseth";

type Props = { biometrics: NonNullable<PresenceData["latest_biometrics"]> };

function hrvDotClass(hrv: number | null): string {
  if (hrv === null) return "hrv-dot";
  if (hrv < 40) return "hrv-dot red";
  if (hrv <= 70) return "hrv-dot warm";
  return "hrv-dot green";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function painColor(v: number): string {
  if (v <= 3) return "#4ade80";
  if (v <= 6) return "#fbbf24";
  return "#f87171";
}

export default function BiometricCard({ biometrics: b }: Props) {
  const nn = (v: number | null | undefined) => v !== null && v !== undefined;
  const hasHardware = nn(b.hrv_resting) || nn(b.resting_hr) || nn(b.sleep_hours) || nn(b.steps) ||
    nn(b.active_energy) || nn(b.stress_score);
  const hasSubjective = (b.mood?.trim() ?? "") !== "" || nn(b.pain) || nn(b.energy) ||
    nn(b.focus) || nn(b.spoons) || nn(b.meds_taken);
  if (!hasHardware && !hasSubjective) return null;

  return (
    <div className="card">
      <div className="card-title">Biometrics</div>
      <div className="biometric-grid">
        {b.hrv_resting !== null && (
          <div className="biometric-stat">
            <span className={hrvDotClass(b.hrv_resting)} />
            <span className="biometric-value">{b.hrv_resting} ms</span>
            <span className="biometric-label">HRV</span>
          </div>
        )}
        {b.resting_hr !== null && (
          <div className="biometric-stat">
            <span className="biometric-value">{b.resting_hr} bpm</span>
            <span className="biometric-label">resting HR</span>
          </div>
        )}
        {b.sleep_hours !== null && (
          <div className="biometric-stat">
            <span className="biometric-value">{b.sleep_hours} h</span>
            <span className="biometric-label">
              sleep
              {b.sleep_quality && (
                <span className={`sleep-badge ${b.sleep_quality}`}>{b.sleep_quality}</span>
              )}
            </span>
          </div>
        )}
        {b.steps !== null && (
          <div className="biometric-stat">
            <span className="biometric-value">{b.steps.toLocaleString()}</span>
            <span className="biometric-label">steps</span>
          </div>
        )}
        {b.active_energy !== null && (
          <div className="biometric-stat">
            <span className="biometric-value">{Math.round(b.active_energy)} kcal</span>
            <span className="biometric-label">active energy</span>
          </div>
        )}
        {b.stress_score !== null && (
          <div className="biometric-stat">
            <span className="biometric-value">{b.stress_score}/100</span>
            <span className="biometric-label">stress</span>
          </div>
        )}
      </div>

      {hasSubjective && (
        <div style={{ marginTop: "0.85rem", paddingTop: "0.85rem", borderTop: "1px solid var(--border)" }}>
          {b.mood?.trim() && (
            <div style={{ fontSize: "0.9rem", marginBottom: "0.6rem", fontStyle: "italic", opacity: 0.85 }}>
              &ldquo;{b.mood.trim()}&rdquo;
            </div>
          )}
          <div className="biometric-grid">
            {nn(b.pain) && (
              <div className="biometric-stat">
                <span className="biometric-value" style={{ color: painColor(b.pain as number) }}>{b.pain}/10</span>
                <span className="biometric-label">pain</span>
              </div>
            )}
            {nn(b.energy) && (
              <div className="biometric-stat">
                <span className="biometric-value">{b.energy}/10</span>
                <span className="biometric-label">energy</span>
              </div>
            )}
            {nn(b.focus) && (
              <div className="biometric-stat">
                <span className="biometric-value">{b.focus}/10</span>
                <span className="biometric-label">focus</span>
              </div>
            )}
            {nn(b.spoons) && (
              <div className="biometric-stat">
                <span className="biometric-value">{b.spoons}/12</span>
                <span className="biometric-label">spoons</span>
              </div>
            )}
            {nn(b.meds_taken) && (
              <div className="biometric-stat">
                <span className="biometric-value" style={{ color: b.meds_taken ? "#4ade80" : "#f87171" }}>
                  {b.meds_taken ? "✓" : "✗"}
                </span>
                <span className="biometric-label">meds</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="biometric-recorded">recorded {formatDate(b.recorded_at)}</div>
    </div>
  );
}
