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
}

const INITIAL_STATE: FormState = {
  hrv_resting: '',
  resting_hr: '',
  sleep_hours: '',
  sleep_quality: '',
  steps: '',
  stress_score: '',
  notes: '',
};

export default function BiometricForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const payload: Record<string, number | string> = {};
    const n = (v: string) => { const x = Number(v); return v !== '' && !isNaN(x) ? x : null; };

    const hrv = n(form.hrv_resting); if (hrv !== null) payload.hrv_resting = hrv;
    const hr  = n(form.resting_hr);  if (hr  !== null) payload.resting_hr  = hr;
    const slh = n(form.sleep_hours); if (slh !== null) payload.sleep_hours  = slh;
    if (form.sleep_quality !== '') payload.sleep_quality = form.sleep_quality;
    const stp = n(form.steps);       if (stp !== null) payload.steps        = stp;
    const str = n(form.stress_score);if (str !== null) payload.stress_score = str;
    if (form.notes.trim() !== '') payload.notes = form.notes.trim();

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
                value={form[name as keyof FormState]}
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
