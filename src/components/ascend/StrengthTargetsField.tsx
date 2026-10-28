import { useState } from 'react';
import {
  addStrengthTarget, MAX_STRENGTH_TARGETS, removeStrengthTarget, strengthTargetChoices, strengthTargetLine, strengthTargetProblem, type StrengthTarget,
} from '../../engine/strengthTargetsDraft';
import { NumberField } from '../NumberField';
import { SecondaryButton } from '../ui';
import { TextButton } from '../TextButton';

// De krachtdoelen van "Sterker worden" in het doelformulier: een oefening uit de lijst, een gewicht en een
// aantal herhalingen, toevoegen en weghalen. Alle regels staan in engine/strengthTargetsDraft.ts; dit
// bestand toont alleen. De lijst is vrijwillig: zonder doelgewichten meet de kaart de kracht nog niet.
const fieldStyle = { background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' };

export function StrengthTargetsField({ value, onChange }: { value: StrengthTarget[]; onChange: (next: StrengthTarget[] | undefined) => void }) {
  const [exercise, setExercise] = useState('');
  const [kg, setKg] = useState<number | undefined>(undefined);
  const [reps, setReps] = useState<number | undefined>(undefined);
  const [tried, setTried] = useState(false);
  const choices = strengthTargetChoices();
  const problem = strengthTargetProblem({ exercise, kg, reps });
  const full = value.length >= MAX_STRENGTH_TARGETS && !value.some((t) => t.exercise.toLowerCase() === exercise.toLowerCase());

  function add() {
    if (problem || full) {
      setTried(true);
      return;
    }
    onChange(addStrengthTarget(value, { exercise, kg, reps }));
    setExercise('');
    setKg(undefined);
    setReps(undefined);
    setTried(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-base" style={{ color: 'var(--color-ink)' }}>
        Hoofdoefeningen met een doel<span style={{ color: 'var(--color-ink-dim)' }}> (mag leeg)</span>
      </span>
      {value.length > 0 && (
        <ul className="flex flex-col" aria-label="Je krachtdoelen">
          {value.map((t) => (
            <li key={t.exercise} className="flex items-center justify-between gap-3 border-b py-1 pr-1 last:border-b-0" style={{ borderColor: 'var(--color-card-border)' }}>
              <span className="min-w-0 text-base tabular-nums" style={{ color: 'var(--color-ink)' }}>{strengthTargetLine(t)}</span>
              <TextButton
                className="shrink-0"
                tone="dim"
                aria-label={`${t.exercise} weghalen`}
                onClick={() => {
                  const next = removeStrengthTarget(value, t.exercise);
                  onChange(next.length > 0 ? next : undefined);
                }}
              >
                Weghalen
              </TextButton>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="strength-target-exercise" className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Oefening</label>
        <select
          id="strength-target-exercise"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          className="min-h-[48px] w-full rounded-xl border px-3 text-base"
          style={fieldStyle}
        >
          <option value="" style={{ background: 'var(--color-charcoal)' }}>Kies een oefening</option>
          {choices.map((name) => (
            <option key={name} value={name} style={{ background: 'var(--color-charcoal)' }}>{name}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Gewicht" unit="kg" decimals={1} value={kg} onChange={setKg} tall />
          <NumberField label="Herhalingen" value={reps} onChange={setReps} tall />
        </div>
        {tried && (problem || full) && (
          <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }} aria-live="polite">{problem ?? `Je kunt tot ${MAX_STRENGTH_TARGETS} doelen toevoegen.`}</p>
        )}
        <SecondaryButton onClick={add}>Doel toevoegen</SecondaryButton>
      </div>
    </div>
  );
}
