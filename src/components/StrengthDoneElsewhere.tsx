import { useState } from 'react';
import type { SubjectiveFeel } from '../models/training';
import { QUICK_RPE_SCALE, type DoneDuration } from '../engine/sessionActions';
import { ChoiceStrip } from './ChoiceStrip';
import { PrimaryButton } from './ui';

const FEELS = [
  { value: 'better', label: 'Beter' },
  { value: 'normal', label: 'Normaal' },
  { value: 'worse', label: 'Slechter' },
] as const satisfies readonly { value: SubjectiveFeel; label: string }[];

// Reps left in the hardest leg sets (RIR), the scale better founded for
// strength than one RPE for a whole session (Zourdos e.a. 2016; Halperin
// e.a. 2022: off by about one rep). Stored as a number: 0, 1, 2.5, 4.
const RIR = [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2.5, label: '2 tot 3' },
  { value: 4, label: '4 of meer' },
] as const;

const RPE = QUICK_RPE_SCALE.map((n) => ({ value: n, label: String(n) }));

export interface StrengthDoneExtra {
  rpe?: number;
  rir?: number;
}

// Strength kept in MacroFactor, ticked off in ASCEND ("Gedaan"; the sets come
// in from MacroFactor by themselves, engine/macrofactorLink.ts): the minutes (with where
// the number comes from: the MacroFactor workout when there is one, else the
// plan as a proposal), how heavy it was (RPE, one row), for a leg session the
// reps left in the hardest sets, an optional feel, and one button that saves.
// Without RPE the leg fatigue index has to assume 8
// (docs/onderzoek/Betrouwbaarheid beenvermoeidheid-index.md).
export function StrengthDoneElsewhere({
  fullDuration,
  durationSource = 'plan',
  legs = false,
  submitLabel = 'Gedaan',
  onDone,
}: {
  fullDuration: number;
  durationSource?: DoneDuration['source'];
  legs?: boolean;
  submitLabel?: string;
  onDone: (feel: SubjectiveFeel | undefined, durationMinutes: number, extra: StrengthDoneExtra) => void;
}) {
  const [duration, setDuration] = useState<number | ''>(fullDuration);
  const [feel, setFeel] = useState<SubjectiveFeel | undefined>();
  const [rpe, setRpe] = useState<number | undefined>();
  const [rir, setRir] = useState<number | undefined>();
  const label = 'mb-2 block text-[13px]';
  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor="mf-duration"
        className="flex min-h-[68px] items-center justify-between gap-3 rounded-2xl border px-4 py-2"
        style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)' }}
      >
        <span className="min-w-0">
          <span className="block text-[15px]" style={{ color: 'var(--color-ink)' }}>Duur</span>
          <span className="block text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>{durationSource === 'macrofactor' ? 'Uit MacroFactor' : 'Gepland'}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <input
            id="mf-duration"
            type="number"
            inputMode="numeric"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-11 w-16 rounded-lg border px-2 text-right font-sans text-[15px] tabular-nums"
            style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
          />
          <span className="text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>min</span>
        </span>
      </label>

      <div>
        <span className={label} style={{ color: 'var(--color-ink-dim)' }}>Zwaarte (RPE)</span>
        <ChoiceStrip label="Zwaarte van 4 tot 10" options={RPE} value={rpe} onChange={setRpe} optional numeric />
      </div>

      {legs && (
        <div>
          <span className={label} style={{ color: 'var(--color-ink-dim)' }}>Herhalingen over in je zwaarste beensets</span>
          <ChoiceStrip label="Herhalingen in reserve" options={RIR} value={rir} onChange={setRir} optional numeric />
        </div>
      )}

      <div>
        <span className={label} style={{ color: 'var(--color-ink-dim)' }}>Gevoel</span>
        <ChoiceStrip label="Hoe voelde het" options={FEELS} value={feel} onChange={setFeel} optional />
      </div>

      <div>
        <PrimaryButton onClick={() => onDone(feel, duration === '' || duration < 1 ? fullDuration : duration, { rpe, rir })}>{submitLabel}</PrimaryButton>
        <p className="mt-2 text-center text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>Je sets komen vanzelf uit MacroFactor</p>
      </div>
    </div>
  );
}
