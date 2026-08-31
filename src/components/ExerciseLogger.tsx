import { useState } from 'react';
import type { SessionTemplate, SessionVariant, ExerciseSetLog, SetLog } from '../models/training';
import type { Program } from '../models/program';
import { exercisesForVariant, durationForVariant, availableVariants, resolveVariantDuration } from '../engine/substitutions';
import { useAppData, type LogSessionInput } from '../state/AppDataContext';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';
import { StretchList } from './StretchList';

const VARIANT_LABEL: Record<SessionVariant, string> = { full: 'VOLLEDIG', short: 'KORT', minimum: 'MINIMUM', custom: 'AANGEPAST' };

export function ExerciseLogger({
  template,
  plannedSessionId,
  scheduledDate,
  program,
  initialVariant = 'full',
  onClose,
}: {
  template: SessionTemplate;
  plannedSessionId?: string;
  scheduledDate?: string;
  program?: Program | null;
  initialVariant?: SessionVariant;
  onClose: () => void;
}) {
  const { logSession, settings } = useAppData();
  const [variant, setVariant] = useState<SessionVariant>(initialVariant);
  const quickComplete = template.type === 'strength' && settings.strengthTrackedExternally;

  function resolveDuration(v: SessionVariant): number {
    if (!scheduledDate) return durationForVariant(template, v);
    return resolveVariantDuration(template, v, scheduledDate, program);
  }

  const [duration, setDuration] = useState(resolveDuration(initialVariant));
  const [rpe, setRpe] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const exercises = exercisesForVariant(template, variant);
  const [setLogs, setSetLogs] = useState<Record<string, SetLog[]>>(() =>
    Object.fromEntries(
      exercises.map((e) => [e.id, Array.from({ length: e.sets }, () => ({ reps: 0, weightKg: e.targetWeightKg }))]),
    ),
  );

  const [distanceKm, setDistanceKm] = useState<number | ''>('');
  const [elevationGainM, setElevationGainM] = useState<number | ''>('');
  const [avgHeartRate, setAvgHeartRate] = useState<number | ''>('');
  const [backpackWeightKg, setBackpackWeightKg] = useState<number | ''>('');

  function selectVariant(v: SessionVariant) {
    setVariant(v);
    setDuration(resolveDuration(v));
    const newExercises = exercisesForVariant(template, v);
    setSetLogs(
      Object.fromEntries(
        newExercises.map((e) => [e.id, setLogs[e.id] ?? Array.from({ length: e.sets }, () => ({ reps: 0, weightKg: e.targetWeightKg }))]),
      ),
    );
  }

  function updateSet(exerciseId: string, index: number, patch: Partial<SetLog>) {
    setSetLogs((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  async function handleSave() {
    setSaving(true);
    const strengthData: ExerciseSetLog[] | undefined =
      template.type === 'strength' && !quickComplete
        ? exercises.map((e) => ({ exerciseId: e.id, exerciseName: e.exerciseName, sets: setLogs[e.id] ?? [] }))
        : undefined;

    const input: LogSessionInput = {
      plannedSessionId,
      templateId: template.id,
      type: template.type,
      variant,
      durationMinutes: duration,
      rpe: rpe === '' ? undefined : rpe,
      notes: notes || undefined,
      strengthData,
      cardioData:
        template.type === 'cardio'
          ? {
              durationMinutes: duration,
              distanceKm: distanceKm === '' ? undefined : distanceKm,
              elevationGainM: elevationGainM === '' ? undefined : elevationGainM,
              avgHeartRate: avgHeartRate === '' ? undefined : avgHeartRate,
              source: 'manual',
            }
          : undefined,
      outdoorData:
        template.type === 'hiking'
          ? {
              durationMinutes: duration,
              distanceKm: distanceKm === '' ? undefined : distanceKm,
              elevationGainM: elevationGainM === '' ? undefined : elevationGainM,
              avgHeartRate: avgHeartRate === '' ? undefined : avgHeartRate,
              backpackWeightKg: backpackWeightKg === '' ? undefined : backpackWeightKg,
              source: 'manual',
            }
          : undefined,
    };

    await logSession(input);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
      <div className="mx-auto max-w-md px-4 pb-28 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <Eyebrow>SESSIE VOLTOOIEN</Eyebrow>
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Sluiten</button>
        </div>

        <h1 className="font-display text-2xl" style={{ color: 'var(--color-ink)' }}>{template.name}</h1>
        {template.focus && <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{template.focus}</p>}

        <div className="mt-4 flex gap-2">
          {availableVariants(template).map((v) => (
            <button
              key={v}
              onClick={() => selectVariant(v)}
              className="flex-1 rounded-lg border py-2 text-xs font-semibold tracking-wide"
              style={{
                borderColor: variant === v ? 'var(--color-gold)' : 'var(--color-card-border)',
                color: variant === v ? 'var(--color-gold)' : 'var(--color-ink-dim)',
              }}
            >
              {VARIANT_LABEL[v]}
            </button>
          ))}
        </div>

        {template.warmup && template.warmup.length > 0 && <StretchList title="OPWARMING (voor)" stretches={template.warmup} />}

        {quickComplete && (
          <Card className="mt-5">
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Kracht bijgehouden in MacroFactor</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Sets, reps en gewicht log je in MacroFactor — hier vink je de sessie alleen af. Zet dit uit bij
              Instellingen → Krachttraining om weer per oefening in te vullen.
            </p>
          </Card>
        )}

        {template.type === 'strength' && !quickComplete && (
          <div className="mt-5 flex flex-col gap-4">
            {exercises.map((ex) => (
              <Card key={ex.id}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{ex.exerciseName}</span>
                  <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{ex.sets} × {ex.reps}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {(setLogs[ex.id] ?? []).map((set, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{i + 1}</span>
                      <input
                        type="number"
                        placeholder="kg"
                        value={set.weightKg ?? ''}
                        onChange={(e) => updateSet(ex.id, i, { weightKg: e.target.value === '' ? undefined : Number(e.target.value) })}
                        className="w-20 rounded-lg border px-2 py-1.5 text-sm"
                        style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>×</span>
                      <input
                        type="number"
                        placeholder="reps"
                        value={set.reps || ''}
                        onChange={(e) => updateSet(ex.id, i, { reps: Number(e.target.value) || 0 })}
                        className="w-20 rounded-lg border px-2 py-1.5 text-sm"
                        style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>reps</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {(template.type === 'cardio' || template.type === 'hiking') && (
          <Card className="mt-5 flex flex-col gap-3">
            <Field label="Afstand (km)" value={distanceKm} onChange={setDistanceKm} />
            <Field label="Hoogtemeters D+ (m)" value={elevationGainM} onChange={setElevationGainM} />
            <Field label="Gem. hartslag" value={avgHeartRate} onChange={setAvgHeartRate} />
            {template.type === 'hiking' && <Field label="Rugzakgewicht (kg)" value={backpackWeightKg} onChange={setBackpackWeightKg} />}
          </Card>
        )}

        <Card className="mt-5 flex flex-col gap-3">
          <Field label="Duur (min)" value={duration} onChange={(v) => setDuration(typeof v === 'number' ? v : 0)} />
          <Field label="RPE (1-10)" value={rpe} onChange={setRpe} />
          <div>
            <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Notities</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
            />
          </div>
        </Card>

        {template.cooldown && template.cooldown.length > 0 && <StretchList title="AFKOELING (na)" stretches={template.cooldown} />}

        <div className="mt-6 flex gap-3">
          <SecondaryButton onClick={onClose}>ANNULEREN</SecondaryButton>
          <PrimaryButton onClick={handleSave} disabled={saving}>
            {saving ? 'OPSLAAN...' : quickComplete ? 'AFVINKEN' : 'VOLTOOIEN'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number | ''; onChange: (v: number | '') => void }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="w-24 rounded-lg border px-2 py-1.5 text-right text-sm"
        style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
      />
    </div>
  );
}
