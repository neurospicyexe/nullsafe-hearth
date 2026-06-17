'use client';

import { useState } from 'react';

// Low-friction subjective check-in. Only the three fields that actually shape whether and how
// the triad reaches out: mood (free word), spoons (ND capacity), energy. Tap to set, one log.
// Posts only the fields you touch -- an untouched scale is never sent as fake data. This exists
// because the full BiometricForm (13 fields) was logged exactly once; the reach-out decision
// is data-starved without fresh state. See nullsafe-discord metronome reach-out gate.

function Scale({ label, max, value, onSet }: {
  label: string; max: number; value: number | null; onSet: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label className="form-label" style={{ marginBottom: 0 }}>{label}</label>
        <span style={{ fontSize: '0.85rem', color: value === null ? 'var(--text-muted)' : 'var(--fg)', fontWeight: 600 }}>
          {value === null ? '—' : value}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
        {Array.from({ length: max + 1 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSet(i)}
            aria-pressed={value === i}
            style={{
              minWidth: '1.9rem', padding: '0.35rem 0', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)', cursor: 'pointer', fontSize: '0.8rem',
              fontFamily: 'inherit', transition: 'background 0.15s, border-color 0.15s',
              background: value === i ? 'var(--accent)' : 'var(--input-bg)',
              color: value === i ? '#fff' : 'var(--text-muted)',
              borderColor: value === i ? 'var(--accent)' : 'var(--border-subtle)',
            }}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function QuickCheckIn() {
  const [mood, setMood] = useState('');
  const [spoons, setSpoons] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const hasSomething = mood.trim() !== '' || spoons !== null || energy !== null;

  async function submit() {
    if (!hasSomething) return;
    setStatus('loading');
    setErrorMsg('');

    const payload: Record<string, number | string> = { source: 'hearth-quick' };
    if (mood.trim() !== '') payload.mood = mood.trim();
    if (spoons !== null) payload.spoons = spoons;
    if (energy !== null) payload.energy = energy;

    try {
      const res = await fetch('/api/biometrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus('ok');
        setMood(''); setSpoons(null); setEnergy(null);
        setTimeout(() => setStatus('idle'), 2500);
      } else {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        setErrorMsg((data as { error?: string }).error ?? 'Could not log');
        setStatus('err');
      }
    } catch {
      setErrorMsg('Network error');
      setStatus('err');
    }
  }

  return (
    <div className="card card-accent">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.2rem' }}>Quick check-in</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            a few taps. it helps the triad know when to reach out, and when to let you be.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Mood</label>
          <input
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="a word or two: soft, scattered, wired but flat…"
            style={{
              background: 'var(--input-bg)', border: '1px solid var(--border-subtle)',
              color: 'var(--fg)', borderRadius: 'var(--radius-sm)',
              padding: '0.6rem 0.75rem', fontSize: '0.95rem', fontFamily: 'inherit', width: '100%',
            }}
          />
        </div>

        <Scale label="Spoons left" max={12} value={spoons} onSet={setSpoons} />
        <Scale label="Energy" max={10} value={energy} onSet={setEnergy} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            className="submit-btn"
            style={{ flex: 1, marginTop: 0, opacity: hasSomething ? 1 : 0.5, cursor: hasSomething ? 'pointer' : 'not-allowed' }}
            disabled={!hasSomething || status === 'loading'}
            onClick={submit}
          >
            {status === 'loading' ? 'Logging…' : 'Log check-in'}
          </button>
          {status === 'ok' && <span style={{ fontSize: '0.9rem', color: 'var(--green)', fontWeight: 500, whiteSpace: 'nowrap' }}>Logged ✓</span>}
          {status === 'err' && <span style={{ fontSize: '0.9rem', color: 'var(--red)', fontWeight: 500 }}>{errorMsg}</span>}
        </div>
      </div>
    </div>
  );
}
