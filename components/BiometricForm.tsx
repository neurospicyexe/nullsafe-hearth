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

    if (form.hrv_resting !== '') payload.hrv_resting = Number(form.hrv_resting);
    if (form.resting_hr !== '') payload.resting_hr = Number(form.resting_hr);
    if (form.sleep_hours !== '') payload.sleep_hours = Number(form.sleep_hours);
    if (form.sleep_quality !== '') payload.sleep_quality = form.sleep_quality;
    if (form.steps !== '') payload.steps = Number(form.steps);
    if (form.stress_score !== '') payload.stress_score = Number(form.stress_score);
    if (form.notes.trim() !== '') payload.notes = form.notes.trim();

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
    <form className="bio-form" onSubmit={handleSubmit}>
      <div className="bio-form-grid">
        <div className="bio-form-field">
          <label className="bio-form-label" htmlFor="hrv_resting">HRV Resting</label>
          <input
            id="hrv_resting"
            name="hrv_resting"
            type="number"
            className="bio-form-input"
            placeholder="ms"
            value={form.hrv_resting}
            onChange={handleChange}
          />
        </div>

        <div className="bio-form-field">
          <label className="bio-form-label" htmlFor="resting_hr">Resting HR</label>
          <input
            id="resting_hr"
            name="resting_hr"
            type="number"
            className="bio-form-input"
            placeholder="bpm"
            value={form.resting_hr}
            onChange={handleChange}
          />
        </div>

        <div className="bio-form-field">
          <label className="bio-form-label" htmlFor="sleep_hours">Sleep Hours</label>
          <input
            id="sleep_hours"
            name="sleep_hours"
            type="number"
            step="0.5"
            className="bio-form-input"
            placeholder="hours"
            value={form.sleep_hours}
            onChange={handleChange}
          />
        </div>

        <div className="bio-form-field">
          <label className="bio-form-label" htmlFor="sleep_quality">Sleep Quality</label>
          <select
            id="sleep_quality"
            name="sleep_quality"
            className="bio-form-select"
            value={form.sleep_quality}
            onChange={handleChange}
          >
            <option value="">—</option>
            <option value="poor">poor</option>
            <option value="fair">fair</option>
            <option value="good">good</option>
            <option value="excellent">excellent</option>
          </select>
        </div>

        <div className="bio-form-field">
          <label className="bio-form-label" htmlFor="steps">Steps</label>
          <input
            id="steps"
            name="steps"
            type="number"
            className="bio-form-input"
            placeholder="steps"
            value={form.steps}
            onChange={handleChange}
          />
        </div>

        <div className="bio-form-field">
          <label className="bio-form-label" htmlFor="stress_score">Stress Score</label>
          <input
            id="stress_score"
            name="stress_score"
            type="number"
            min="0"
            max="100"
            className="bio-form-input"
            placeholder="0–100"
            value={form.stress_score}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="bio-form-field">
        <label className="bio-form-label" htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          className="bio-form-textarea"
          placeholder="optional notes"
          value={form.notes}
          onChange={handleChange}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="submit"
          className="bio-form-submit"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Logging…' : 'Log Biometrics'}
        </button>
        {status === 'ok' && (
          <span className="bio-form-status ok">Logged ✓</span>
        )}
        {status === 'err' && (
          <span className="bio-form-status err">{errorMsg}</span>
        )}
      </div>
    </form>
  );
}
