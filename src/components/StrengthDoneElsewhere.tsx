import { useState } from 'react';
import type { SubjectiveFeel } from '../models/training';
import { PrimaryButton } from './ui';

const FEEL_LABEL: Record<SubjectiveFeel, string> = { better: 'Beter', normal: 'Normaal', worse: 'Slechter' };

// Reps left in the hardest leg sets (RIR), the scale better founded for
// strength than one RPE for a whole session (Zourdos e.a. 2016; Halperin
// e.a. 2022: off by about one rep). Stored as a number: 0, 1, 2.5, 4.
const RIR: [number, string][] = [[0, '0'], [1, '1'], [2.5, '2 tot 3'], [4, '4 of meer']];

export interface StrengthDoneExtra {
  rpe?: number;
  rir?: number;
}

// Strength logged in MacroFactor: the minutes (prefilled with ASCEND's own
// estimate, MacroFactor knows the real time), how heavy it was (RPE), for a
// leg session how many reps were left in the hardest sets, an optional feel,
// and one clear button that saves. Without RPE the leg fatigue index has to
// assume 8 (docs/onderzoek/Betrouwbaarheid beenvermoeidheid-index.md).
export function StrengthDoneElsewhere({ fullDuration, legs = false, onDone }: { fullDuration: number; legs?: boolean; onDone: (feel: SubjectiveFeel | undefined, durationMinutes: number, extra: StrengthDoneExtra) => void }) {
  const [duration, setDuration] = useState<number | ''>(fullDuration);
  const [feel, setFeel] = useState<SubjectiveFeel | undefined>();
  const [rpe, setRpe] = useState<number | undefined>();
  const [rir, setRir] = useState<number | undefined>();
  const chip = (on: boolean) => ({ borderColor: on ? 'var(--color-bronze)' : 'var(--color-card-border)', color: on ? 'var(--color-gold)' : 'var(--color-ink-dim)', background: 'var(--color-charcoal)' });
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

      <p className="mb-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Zwaarte (RPE), hoe zwaar was de hele training?</p>
      <div className="mb-3 grid grid-cols-10 gap-1" role="radiogroup" aria-label="Zwaarte van 1 tot 10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} role="radio" aria-checked={rpe === n} onClick={() => setRpe(rpe === n ? undefined : n)} className="min-h-[38px] rounded-lg border text-xs tabular-nums" style={{ borderColor: rpe === n ? 'var(--color-gold)' : 'var(--color-card-border)', background: rpe === n ? 'var(--color-gold)' : 'transparent', color: rpe === n ? 'var(--color-bg)' : 'var(--color-ink-dim)' }}>
            {n}
          </button>
        ))}
      </div>

      {legs && (
        <>
          <p className="mb-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoeveel herhalingen had je nog over in je zwaarste beensets?</p>
          <div className="mb-3 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Herhalingen in reserve">
            {RIR.map(([v, label]) => (
              <button key={label} role="radio" aria-checked={rir === v} onClick={() => setRir(rir === v ? undefined : v)} className="min-h-[40px] rounded-lg border text-xs" style={chip(rir === v)}>{label}</button>
            ))}
          </div>
        </>
      )}

      <p className="mb-1.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelde het ten opzichte van normaal? (mag leeg blijven)</p>
      <div className="mb-3 flex gap-2" role="radiogroup" aria-label="Hoe voelde het">
        {(['better', 'normal', 'worse'] as const).map((f) => (
          <button key={f} role="radio" aria-checked={feel === f} onClick={() => setFeel((cur) => (cur === f ? undefined : f))} className="min-h-[40px] flex-1 rounded-lg border text-xs" style={chip(feel === f)}>
            {FEEL_LABEL[f]}
          </button>
        ))}
      </div>
      <PrimaryButton onClick={() => onDone(feel, duration === '' ? fullDuration : duration, { rpe, rir })}>GEDAAN IN MACROFACTOR</PrimaryButton>
    </div>
  );
}
