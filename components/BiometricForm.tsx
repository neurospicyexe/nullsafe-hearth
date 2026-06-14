'use client';

import { useState } from 'react';

type SleepQuality = 'poor' | 'fair' | 'good' | 'excellent' | '';

interface FormState {
  hrv_resting: string;
  resting_hr: string;
  sleep_hours: string;
  sleep_quality: SleepQuality;
  steps: string;
  stress_score: string;
  notes: string;
  // Subjective ND-state layer
  mood: string;
  pain: string;
  energy: string;
  focus: string;
  spoons: string;
  meds_taken: boolean;
}

const INITIAL_STATE: FormState = {
  hrv_resting: '',
  resting_hr: '',
  sleep_hours: '',
  sleep_quality: '',
  steps: '',
  stress_score: '',
  notes: '',
  mood: '',
  pain: '',
  energy: '',
  focus: '',
  spoons: '',
  meds_taken: false,
};

export default function BiometricForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const t = e.target;
    const value = t instanceof HTMLInputElement && t.type === 'checkbox' ? t.checked : t.value;
    setForm((prev) => ({ ...prev, [t.name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const payload: Record<string, number | string | boolean> = {};
    const n = (v: string) => { const x = Number(v); return v !== '' && !isNaN(x) ? x : null; };

    const hrv = n(form.hrv_resting); if (hrv !== null) payload.hrv_resting = hrv;
    const hr  = n(form.resting_hr);  if (hr  !== null) payload.resting_hr  = hr;
    const slh = n(form.sleep_hours); if (slh !== null) payload.sleep_hours  = slh;
    if (form.sleep_quality !== '') payload.sleep_quality = form.sleep_quality;
    const stp = n(form.steps);       if (stp !== null) payload.steps        = stp;
    const str = n(form.stress_score);if (str !== null) payload.stress_score = str;
    if (form.notes.trim() !== '') payload.notes = form.notes.trim();

    // Subjective ND-state layer
    if (form.mood.trim() !== '') payload.mood = form.mood.trim();
    const pn = n(form.pain);   if (pn !== null) payload.pain   = pn;
    const en = n(form.energy); if (en !== null) payload.energy = en;
    const fc = n(form.focus);  if (fc !== null) payload.focus  = fc;
    const sp = n(form.spoons); if (sp !== null) payload.spoons = sp;
    if (form.meds_taken) payload.meds_taken = true;

    if (Object.keys(payload).length === 0) {
      setErrorMsg('Enter at least one value.');
      setStatus('err');
      return;
    }

    try {
      const res = await fetch('/api/biometrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus('ok');
        setForm(INITIAL_STATE);
      } else {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        setErrorMsg((data as { error?: string }).error ?? 'Failed to log biometrics');
        setStatus('err');
      }
    } catch {
      setErrorMsg('Network error — could not reach server');
      setStatus('err');
    }
  }

  return (
    <div className="card card-accent">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Number fields — responsive grid, label above input */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.25rem' }}>
          {[
            { name: 'hrv_resting',  label: 'HRV Resting',   placeholder: 'ms',    step: undefined },
            { name: 'resting_hr',   label: 'Resting HR',     placeholder: 'bpm',   step: undefined },
            { name: 'sleep_hours',  label: 'Sleep Hours',    placeholder: 'hrs',   step: '0.5' },
            { name: 'steps',        label: 'Steps',          placeholder: 'steps', step: undefined },
            { name: 'stress_score', label: 'Stress Score',   placeholder: '0–100', step: undefined },
          ].map(({ name, label, placeholder, step }) => (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>{label}</label>
              <input
                name={name}
                type="number"
                placeholder={placeholder}
                value={form[name as keyof FormState] as string}
                onChange={handleChange}
                {...(step ? { step } : {})}
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--fg)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.65rem 0.75rem',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                  width: '100%',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
          ))}

          {/* Sleep Quality — same size cell */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Sleep Quality</label>
            <select
              name="sleep_quality"
              className="form-select"
              value={form.sleep_quality}
              onChange={handleChange}
              style={{ padding: '0.65rem 0.75rem' }}
            >
              <option value="">—</option>
              <option value="poor">poor</option>
              <option value="fair">fair</option>
              <option value="good">good</option>
              <option value="excellent">excellent</option>
            </select>
          </div>
        </div>

        {/* Subjective ND-state layer — the lived signals, not the hardware */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.3rem' }}>
          <span className="form-label" style={{ opacity: 0.7, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.72rem' }}>
            felt state
          </span>

          {/* Mood — free text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Mood</label>
            <input
              name="mood"
              type="text"
              placeholder="e.g. wired but flat, soft, scattered"
              value={form.mood}
              onChange={handleChange}
              style={{
                background: 'var(--input-bg)', border: '1px solid var(--border-subtle)',
                color: 'var(--fg)', borderRadius: 'var(--radius-sm)',
                padding: '0.65rem 0.75rem', fontSize: '0.95rem', fontFamily: 'inherit', width: '100%',
              }}
            />
          </div>

          {/* Pain / energy / focus / spoons — number inputs ('' = not logged, 0 = explicit) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1.25rem' }}>
            {([
              { name: 'pain',   label: 'Pain',   max: 10, hint: '0–10' },
              { name: 'energy', label: 'Energy', max: 10, hint: '0–10' },
              { name: 'focus',  label: 'Focus',  max: 10, hint: '0–10' },
              { name: 'spoons', label: 'Spoons', max: 12, hint: '0–12 left' },
            ] as const).map(({ name, label, max, hint }) => (
              <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>{label}</label>
                <input
                  name={name}
                  type="number"
                  min={0}
                  max={max}
                  step={1}
                  placeholder={hint}
                  value={form[name as keyof FormState] as string}
                  onChange={handleChange}
                  style={{
                    background: 'var(--input-bg)', border: '1px solid var(--border-subtle)',
                    color: 'var(--fg)', borderRadius: 'var(--radius-sm)',
                    padding: '0.65rem 0.75rem', fontSize: '0.95rem', fontFamily: 'inherit', width: '100%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Meds — checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.95rem' }}>
            <input
              name="meds_taken"
              type="checkbox"
              checked={form.meds_taken}
              onChange={handleChange}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
            />
            <span>Meds taken</span>
          </label>
        </div>

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Notes (optional)</label>
          <textarea
            name="notes"
            className="form-textarea"
            placeholder="optional notes"
            rows={3}
            value={form.notes}
            onChange={handleChange}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="submit"
            className="submit-btn"
            style={{ flex: 1, marginTop: 0 }}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Logging…' : 'Log Biometrics'}
          </button>
          {status === 'ok' && (
            <span style={{ fontSize: '0.9rem', color: 'var(--green)', fontWeight: 500, whiteSpace: 'nowrap' }}>Logged ✓</span>
          )}
          {status === 'err' && (
            <span style={{ fontSize: '0.9rem', color: 'var(--red)', fontWeight: 500 }}>{errorMsg}</span>
          )}
        </div>

      </form>
    </div>
  );
}
