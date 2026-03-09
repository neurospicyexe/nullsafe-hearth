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

export default function BiometricCard({ biometrics: b }: Props) {
  const hasAny = b.hrv_resting !== null || b.resting_hr !== null ||
    b.sleep_hours !== null || b.steps !== null;
  if (!hasAny) return null;

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
      <div className="biometric-recorded">recorded {formatDate(b.recorded_at)}</div>
    </div>
  );
}
