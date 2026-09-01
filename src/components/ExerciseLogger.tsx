import { useState } from 'react';
import type { SessionTemplate, SessionVariant, ExerciseSetLog, SetLog, TrainingEnvironment, GuidanceMode } from '../models/training';
import type { Program } from '../models/program';
import { exercisesForVariant, durationForVariant, availableVariants, resolveVariantDuration } from '../engine/substitutions';
import { useAppData, type LogSessionInput } from '../state/AppDataContext';
import { getModalities, getModality, defaultModality } from '../data/modalities';
import { GARMIN_SUGGESTED_TYPES, COMPATIBILITY_LABEL, getCompatibility } from '../data/garminSuggested';
import { ModalityPicker } from './ModalityPicker';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';
import { StretchList } from './StretchList';

const VARIANT_LABEL: Record<SessionVariant, string> = { full: 'VOLLEDIG', short: 'KORT', minimum: 'MINIMUM', custom: 'AANGEPAST' };
const FEEL_LABEL: Record<'better' | 'normal' | 'worse', string> = { better: 'BETER', normal: 'NORMAAL', worse: 'SLECHTER' };

// Only these two days carry the ASCEND Guided / Garmin Suggested / Free
// Training choice — Herstel just gets the modality picker directly, since
// "what did Garmin suggest" and "free training" don't add anything
// meaningful on a day whose whole point is optional/unstructured rest.
const GUIDANCE_MODE_DAYS = new Set(['tpl_easy_run', 'tpl_bergconditie']);

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
  const [subjectiveFeel, setSubjectiveFeel] = useState<'better' | 'normal' | 'worse' | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const exercises = exercisesForVariant(template, variant);
  const [setLogs, setSetLogs] = useState<Record<string, SetLog[]>>(() =>
    Object.fromEntries(
      exercises.map((e) => [e.id, Array.from({ length: e.sets }, () => ({ reps: 0, weightKg: e.targetWeightKg }))]),
    ),
  );

  const hasModalities = !!getModalities(template.id);
  const supportsGuidanceMode = GUIDANCE_MODE_DAYS.has(template.id);
  const [guidanceMode, setGuidanceMode] = useState<GuidanceMode>('ascend_guided');
  const [modalityKey, setModalityKey] = useState<string | undefined>(() => defaultModality(template.id));
  const [garminSuggestedType, setGarminSuggestedType] = useState<string>('');
  const selectedModality = modalityKey ? getModality(template.id, modalityKey) : undefined;
  const compatibility = garminSuggestedType ? getCompatibility(template.id, garminSuggestedType) : undefined;

  // Ascend Guided shows only the fields the chosen modality actually needs
  // (a StairMaster session doesn't have a "helling %" field, a rest day
  // has none at all). Garmin Suggested / Free Training fall back to a
  // generic set — we don't know the specifics of what was actually done.
  const fields =
    guidanceMode === 'ascend_guided'
      ? (selectedModality?.fields ?? {})
      : { distance: true, elevation: true };
  const environment: TrainingEnvironment | undefined =
    guidanceMode === 'ascend_guided' && (selectedModality?.environment === 'treadmill' || selectedModality?.environment === 'outdoor')
      ? selectedModality.environment
      : undefined;

  const [distanceKm, setDistanceKm] = useState<number | ''>('');
  const [elevationGainM, setElevationGainM] = useState<number | ''>('');
  const [elevationLossM, setElevationLossM] = useState<number | ''>('');
  const [avgHeartRate, setAvgHeartRate] = useState<number | ''>('');
  const [backpackWeightKg, setBackpackWeightKg] = useState<number | ''>('');
  const [cadence, setCadence] = useState<number | ''>('');
  const [power, setPower] = useState<number | ''>('');
  const [steps, setSteps] = useState<number | ''>('');
  const [machineVerticalM, setMachineVerticalM] = useState<number | ''>('');
  const [terrain, setTerrain] = useState('');

  // Incline-treadmill D+ estimate (distance × incline% ÷ 100) — a treadmill
  // doesn't actually change your altitude, so this is a training estimate,
  // not a GPS measurement. Derived at render time rather than mirrored into
  // state via an effect: elevationGainM only ever holds a manually-typed
  // override, and the incline estimate is used whenever there isn't one.
  const [inclinePercent, setInclinePercent] = useState<number | ''>('');
  const inclineEstimate =
    fields.inclinePercent && distanceKm !== '' && inclinePercent !== ''
      ? Math.round((distanceKm * 1000 * inclinePercent) / 100)
      : undefined;
  const elevationEstimated = elevationGainM === '' && inclineEstimate !== undefined;
  const effectiveElevationGainM = elevationEstimated ? inclineEstimate : elevationGainM;

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

    const activityCommon = {
      durationMinutes: duration,
      distanceKm: distanceKm === '' ? undefined : distanceKm,
      elevationGainM: effectiveElevationGainM === '' ? undefined : effectiveElevationGainM,
      estimatedElevation: elevationEstimated || undefined,
      environment,
      modality: guidanceMode === 'ascend_guided' ? modalityKey : undefined,
      guidanceMode: hasModalities ? guidanceMode : undefined,
      garminSuggestedType: guidanceMode === 'garmin_suggested' ? garminSuggestedType || undefined : undefined,
      avgHeartRate: avgHeartRate === '' ? undefined : avgHeartRate,
      cadence: cadence === '' ? undefined : cadence,
      source: 'manual' as const,
    };

    const input: LogSessionInput = {
      plannedSessionId,
      templateId: template.id,
      type: template.type,
      variant,
      durationMinutes: duration,
      rpe: rpe === '' ? undefined : rpe,
      notes: notes || undefined,
      subjectiveFeel,
      strengthData,
      cardioData:
        template.type === 'cardio' || template.type === 'recovery'
          ? { ...activityCommon, power: power === '' ? undefined : power }
          : undefined,
      outdoorData:
        template.type === 'hiking'
          ? {
              ...activityCommon,
              power: power === '' ? undefined : power,
              elevationLossM: elevationLossM === '' ? undefined : elevationLossM,
              backpackWeightKg: backpackWeightKg === '' ? undefined : backpackWeightKg,
              terrain: terrain || undefined,
              steps: steps === '' ? undefined : steps,
              machineVerticalM: machineVerticalM === '' ? undefined : machineVerticalM,
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

        {availableVariants(template).length > 1 && (
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
        )}

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

        {template.type === 'strength' && (
          <Card className="mt-5 flex flex-col gap-2">
            <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelde dit t.o.v. normaal?</label>
            <div className="flex gap-2">
              {(['better', 'normal', 'worse'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSubjectiveFeel(f)}
                  className="flex-1 rounded-lg border py-2 text-xs font-semibold tracking-wide"
                  style={{
                    borderColor: subjectiveFeel === f ? 'var(--color-gold)' : 'var(--color-card-border)',
                    color: subjectiveFeel === f ? 'var(--color-gold)' : 'var(--color-ink-dim)',
                  }}
                >
                  {FEEL_LABEL[f]}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Optioneel — helpt Ascend signaleren als Bergconditie op vrijdag zaterdags Lower B twee weken op rij verstoort.
            </p>
          </Card>
        )}

        {hasModalities && (
          <Card className="mt-5 flex flex-col gap-4">
            {supportsGuidanceMode && (
              <div>
                <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe wil je trainen?</label>
                <div className="mt-1.5 flex gap-2">
                  {(['ascend_guided', 'garmin_suggested', 'free'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setGuidanceMode(mode)}
                      className="flex-1 rounded-lg border py-2 text-xs font-semibold tracking-wide"
                      style={{
                        borderColor: guidanceMode === mode ? 'var(--color-gold)' : 'var(--color-card-border)',
                        color: guidanceMode === mode ? 'var(--color-gold)' : 'var(--color-ink-dim)',
                      }}
                    >
                      {mode === 'ascend_guided' ? 'ASCEND' : mode === 'garmin_suggested' ? 'GARMIN' : 'VRIJ'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {guidanceMode === 'ascend_guided' && (
              <ModalityPicker templateId={template.id} selectedKey={modalityKey} onSelect={setModalityKey} />
            )}

            {guidanceMode === 'garmin_suggested' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Check de suggestie op je Garmin, en kies hier wat hij voorstelde
                </label>
                <div className="flex flex-wrap gap-2">
                  {GARMIN_SUGGESTED_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setGarminSuggestedType(t)}
                      className="rounded-lg border px-2.5 py-1.5 text-xs"
                      style={{
                        borderColor: garminSuggestedType === t ? 'var(--color-gold)' : 'var(--color-card-border)',
                        color: garminSuggestedType === t ? 'var(--color-gold)' : 'var(--color-ink)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {compatibility && (
                  <div
                    className="rounded-xl border p-2.5 text-xs leading-relaxed"
                    style={{
                      borderColor: compatibility.compatibility === 'not_equivalent' ? 'var(--color-warning)' : 'var(--color-card-border)',
                      color: 'var(--color-ink-dim)',
                    }}
                  >
                    <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{COMPATIBILITY_LABEL[compatibility.compatibility]}. </span>
                    {compatibility.note}
                  </div>
                )}
              </div>
            )}

            {guidanceMode === 'free' && (
              <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                Vrije training — geen vooraf bepaald doel. Log gewoon wat je daadwerkelijk deed.
              </p>
            )}

            {fields.distance && <Field label="Afstand (km)" value={distanceKm} onChange={setDistanceKm} />}
            {fields.inclinePercent && (
              <>
                <Field label="Helling (%)" value={inclinePercent} onChange={setInclinePercent} />
                <p className="-mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                  Vul de helling in — Ascend berekent de geschatte D+ voor je (afstand × helling ÷ 100).
                </p>
              </>
            )}
            {fields.elevation && (
              <>
                <Field
                  label={`Hoogtemeters D+ (m)${elevationEstimated ? ' — geschat' : ''}`}
                  value={effectiveElevationGainM}
                  onChange={setElevationGainM}
                />
                {elevationEstimated && (
                  <p className="-mt-2 text-xs" style={{ color: 'var(--color-gold)' }}>
                    ≈ geschat uit afstand × helling — geen GPS-meting.
                  </p>
                )}
              </>
            )}
            {fields.elevationLoss && <Field label="Hoogtemeters D- (m)" value={elevationLossM} onChange={setElevationLossM} />}
            {fields.steps && (
              <>
                <Field label="Verdiepingen/stappen" value={steps} onChange={setSteps} />
                <Field label="Machine-vertical (m, optioneel)" value={machineVerticalM} onChange={setMachineVerticalM} />
              </>
            )}
            {selectedModality?.environment !== 'rest' && <Field label="Gem. hartslag" value={avgHeartRate} onChange={setAvgHeartRate} />}
            {fields.cadence && <Field label="Cadans" value={cadence} onChange={setCadence} />}
            {fields.power && <Field label="Vermogen (W)" value={power} onChange={setPower} />}
            {fields.backpackWeight && <Field label="Rugzakgewicht (kg)" value={backpackWeightKg} onChange={setBackpackWeightKg} />}
            {fields.terrain && (
              <div>
                <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Terrein</label>
                <input
                  type="text"
                  value={terrain}
                  onChange={(e) => setTerrain(e.target.value)}
                  placeholder="bijv. bos, rotsen, zand"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
                />
              </div>
            )}
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
