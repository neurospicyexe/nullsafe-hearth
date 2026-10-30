// Allowlist for POST /api/biometrics -> Halseth POST /biometrics. Pure: only known fields cross.

/** Same rule as Halseth: a client-generated row id is 8..64 chars of [A-Za-z0-9_-]. */
export const ROW_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function biometricsPostBody(r: Record<string, unknown>, now: () => Date = () => new Date()) {
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const bool = (v: unknown) => (typeof v === "boolean" ? v : v === 1 ? true : v === 0 ? false : null);
  const id = typeof r["id"] === "string" && ROW_ID_RE.test(r["id"]) ? r["id"] : undefined;
  return {
    // Client id: a retried POST of the same check-in is a no-op upstream instead of a second row.
    ...(id !== undefined ? { id } : {}),
    // Tap time from the client, so a write retried on a later visit lands when it was tapped.
    recorded_at:   typeof r["recorded_at"] === "string" ? r["recorded_at"] : now().toISOString(),
    source:        str(r["source"]),
    hrv_resting:   num(r["hrv_resting"]),
    resting_hr:    num(r["resting_hr"]),
    sleep_hours:   num(r["sleep_hours"]),
    sleep_quality: str(r["sleep_quality"]),
    stress_score:  num(r["stress_score"]),
    steps:         num(r["steps"]),
    active_energy: num(r["active_energy"]),
    notes:         str(r["notes"]),
    // Subjective ND-state layer (migration 0081)
    mood:          str(r["mood"]),
    pain:          num(r["pain"]),
    energy:        num(r["energy"]),
    focus:         num(r["focus"]),
    spoons:        num(r["spoons"]),
    meds_taken:    bool(r["meds_taken"]),
  };
}
