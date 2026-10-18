import type { WorkoutDetails } from '../models/training';
import { detailForm, formatRep, stepRepSeconds } from '../engine/workoutDetails';
import { NumberField } from './NumberField';

// The hard part of an interval, hill or tempo session in a few taps
// (engine/workoutDetails.ts). Starts at what the plan asked for; only
// change what went differently. Heart rates are optional.
export function WorkoutDetailsFields({ templateId, value, onChange }: { templateId: string; value: WorkoutDetails; onChange: (next: WorkoutDetails) => void }) {
  const form = detailForm(templateId);
  if (!form) return null;
  const set = (patch: Partial<WorkoutDetails>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wat je deed, alvast ingevuld met het plan. Pas alleen aan wat anders ging.</p>
      {form === 'repeats' ? (
        <>
          <Stepper
            label="Herhalingen"
            text={value.reps ? `${value.reps}×` : 'geen'}
            onMinus={() => set({ reps: Math.max(0, (value.reps ?? 0) - 1) })}
            onPlus={() => set({ reps: Math.min(30, (value.reps ?? 0) + 1) })}
          />
          <Stepper
            label="Per herhaling"
            text={value.repSeconds ? formatRep(value.repSeconds) : 'niet ingevuld'}
            onMinus={() => set({ repSeconds: stepRepSeconds(value.repSeconds ?? 60, -1) })}
            onPlus={() => set({ repSeconds: stepRepSeconds(value.repSeconds ?? 45, 1) })}
          />
        </>
      ) : (
        <>
          <Stepper
            label="Minuten stevig"
            text={value.blockMinutes ? `${value.blockMinutes} min` : 'niet ingevuld'}
            onMinus={() => set({ blockMinutes: Math.max(0, (value.blockMinutes ?? 0) - 1) })}
            onPlus={() => set({ blockMinutes: Math.min(90, (value.blockMinutes ?? 0) + 1) })}
          />
          <HeartRate label="Gem. hartslag stevig stuk" value={value.blockHeartRate} onChange={(v) => set({ blockHeartRate: v })} />
        </>
      )}
      <HeartRate label="Hoogste hartslag" value={value.peakHeartRate} onChange={(v) => set({ peakHeartRate: v })} />
    </div>
  );
}

function Stepper({ label, text, onMinus, onPlus }: { label: string; text: string; onMinus: () => void; onPlus: () => void }) {
  const button = 'flex h-10 w-10 items-center justify-center rounded-lg border text-lg';
  const style = { borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' };
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onMinus} className={button} style={style} aria-label={`${label} minder`}>−</button>
        <span className="w-20 text-center text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{text}</span>
        <button type="button" onClick={onPlus} className={button} style={style} aria-label={`${label} meer`}>+</button>
      </div>
    </div>
  );
}

function HeartRate({ label, value, onChange }: { label: string; value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label} (optioneel)</span>
      <div className="w-32">
        <NumberField value={value} onChange={onChange} unit="bpm" compact />
      </div>
    </div>
  );
}
