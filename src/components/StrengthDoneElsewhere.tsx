import { useState } from 'react';
import type { SubjectiveFeel } from '../models/training';
import { PrimaryButton } from './ui';

const FEEL_LABEL: Record<SubjectiveFeel, string> = { better: 'Beter', normal: 'Normaal', worse: 'Slechter' };

// Strength logged in MacroFactor: the minutes (prefilled with ASCEND's own
// estimate, MacroFactor knows the real time), an optional feel, and one
// clear button that saves (audit 2026-10, 3.7: the feel buttons used to
// save on tap without looking like they did).
export function StrengthDoneElsewhere({ fullDuration, onDone }: { fullDuration: number; onDone: (feel: SubjectiveFeel | undefined, durationMinutes: number) => void }) {
  const [duration, setDuration] = useState<number | ''>(fullDuration);
  const [feel, setFeel] = useState<SubjectiveFeel | undefined>();
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <label htmlFor="mf-duration" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Duur (min), uit MacroFactor</label>
        <input
          id="mf-duration"
          type="number"
          inputMode="numeric"
          value={duration}
          onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-20 rounded-lg border px-2 py-1.5 text-right text-sm"
          style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
        />
      </div>
      <p className="mb-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelde het? (mag leeg blijven)</p>
      <div className="mb-3 flex gap-2" role="radiogroup" aria-label="Hoe voelde het">
        {(['better', 'normal', 'worse'] as const).map((f) => (
          <button
            key={f}
            role="radio"
            aria-checked={feel === f}
            onClick={() => setFeel((cur) => (cur === f ? undefined : f))}
            className="min-h-[40px] flex-1 rounded-lg border text-xs"
            style={{
              borderColor: feel === f ? 'var(--color-bronze)' : 'var(--color-card-border)',
              color: feel === f ? 'var(--color-gold)' : 'var(--color-ink-dim)',
              background: 'var(--color-charcoal)',
            }}
          >
            {FEEL_LABEL[f]}
          </button>
        ))}
      </div>
      <PrimaryButton onClick={() => onDone(feel, duration === '' ? fullDuration : duration)}>GEDAAN IN MACROFACTOR</PrimaryButton>
    </div>
  );
}
