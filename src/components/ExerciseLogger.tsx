import { useRef, useState } from 'react';
import { NumberField } from './NumberField';
import { templateSport } from '../engine/sports';
import type { SessionTemplate, SessionVariant, ExerciseSetLog, SetLog, TrainingEnvironment, GuidanceMode } from '../models/training';
import type { Program } from '../models/program';
import { exercisesForVariant, durationForVariant, availableVariants, resolveVariantDuration } from '../engine/substitutions';
import { useAppData, type LogSessionInput } from '../state/AppDataContext';
import { getModalities, getModality, defaultModality, modalitySport } from '../data/modalities';
import { GARMIN_SUGGESTED_TYPES, GARMIN_TYPE_LABEL, COMPATIBILITY_LABEL, getCompatibility } from '../data/garminSuggested';
import { ModalityPicker } from './ModalityPicker';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';
import { StretchList } from './StretchList';
import { CountdownTimer } from './CountdownTimer';
import { addDays, formatDateNL, todayISO, weekdayShortNL } from '../utils/dates';
import { buildWorkoutPlan } from '../engine/workoutPlan';
import { TrainingGuideSheet, WorkoutSteps } from './TrainingGuideSheet';
import { SessionHeader, StopSignals } from './SessionHeader';
import { buildSessionBrief } from '../engine/sessionBrief';
import { progressionTarget } from '../engine/programLayout';
import { getTrainingGuide, guideDayLabel } from '../data/trainingGuide';
import { formatNumberNL } from '../utils/number';
import { INTENSITY, type Intensity } from '../data/workoutStructure';

const REST_TIMER_SECONDS = 90;

const VARIANT_LABEL: Record<SessionVariant, string> = { full: 'VOLLEDIG', short: 'KORT', minimum: 'MINIMUM', custom: 'AANGEPAST' };
const FEEL_LABEL: Record<'better' | 'normal' | 'worse', string> = { better: 'BETER', normal: 'NORMAAL', worse: 'SLECHTER' };

// Only these days carry the ASCEND Guided / Garmin Suggested / Free
// Training choice — Herstel just gets the modality picker directly, since
// "what did Garmin suggest" and "free training" don't add anything
// meaningful on a day whose whole point is optional/unstructured rest.
const GUIDANCE_MODE_DAYS = new Set(['tpl_easy_run', 'tpl_bergconditie', 'tpl_hill_intervals', 'tpl_long_run']);

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
  const { logSession, settings, templates } = useAppData();
  const { closing, requestClose } = useSheetClose(onClose);
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
  // The day it was actually done. Ticking off a session from an earlier
  // day defaults to that day; a loose training can be logged for a past
  // day too (production bug: everything landed on today).
  const today = todayISO();
  const plannedInPast = !!plannedSessionId && !!scheduledDate && scheduledDate < today;
  const [doneOn, setDoneOn] = useState<string>(plannedInPast ? scheduledDate! : today);
  // The exact same plan the guide shows for this day: steps, minutes,
  // repeats, RPE and heart-rate zone (production feedback: the training
  // screen said something different from the info screen).
  const plan = buildWorkoutPlan(template, scheduledDate ?? today, program);
  const conditioningSteps = plan?.timeline.filter((s) => s.kind !== 'strength') ?? [];
  const peak = conditioningSteps.length > 0 ? (Math.max(...conditioningSteps.map((s) => s.intensity)) as Intensity) : undefined;
  const [restTimerFor, setRestTimerFor] = useState<string | null>(null);
  const [openExercise, setOpenExercise] = useState<string | null>(null);
  const [reachedForm, setReachedForm] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  // This week's targets (mountain hike: D+ and backpack), to fill the form.
  const plannedStep = progressionTarget(template, program, scheduledDate ?? today)?.step;

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
  const [backpackWeightKg, setBackpackWeightKg] = useState<number | ''>(() => progressionTarget(template, program, scheduledDate ?? todayISO())?.step.backpackKg ?? '');
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
    // A real rest day: logged as rest, no minutes of training that weren't there.
    const isRest = guidanceMode === 'ascend_guided' && selectedModality?.environment === 'rest';
    const loggedMinutes = isRest ? 0 : duration;
    // Only sets that were actually filled in: empty rows would read as
    // 0-rep sets and drag the strength progression down.
    const filled: ExerciseSetLog[] = template.type === 'strength' && !quickComplete
      ? exercises
        .map((e) => ({ exerciseId: e.id, exerciseName: e.exerciseName, sets: (setLogs[e.id] ?? []).filter((set) => set.reps > 0) }))
        .filter((e) => e.sets.length > 0)
      : [];
    const strengthData: ExerciseSetLog[] | undefined = filled.length > 0 ? filled : undefined;

    const activityCommon = {
      durationMinutes: loggedMinutes,
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
      completedDate: doneOn,
      templateId: template.id,
      type: template.type,
      // The way you trained decides the sport: a ride on a run day is
      // cycling, also when Garmin suggested the ride.
      sport: (guidanceMode === 'ascend_guided' ? modalitySport(modalityKey) : guidanceMode === 'garmin_suggested' && garminSuggestedType === 'Bike' ? 'cycling' : undefined) ?? templateSport(template),
      variant,
      durationMinutes: loggedMinutes,
      rpe: rpe === '' || isRest ? undefined : rpe,
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

    const saved = await logSession(input);
    setSaving(false);
    // On a failed write the form stays open with everything filled in; the
    // app-wide notice says what went wrong.
    if (saved) onClose();
  }

  const brief = buildSessionBrief(template, scheduledDate ?? today, program, {
    modalityKey: guidanceMode === 'ascend_guided' ? modalityKey : undefined,
    templates,
  });
  const guide = getTrainingGuide(template.id);
  const restChosen = selectedModality?.environment === 'rest';
  const planRpe = peak ? rpeRange(INTENSITY[peak].rpe) : undefined;
  const dateLabel = `${weekdayShortNL(scheduledDate ?? today)} ${formatDateNL(scheduledDate ?? today)}`.toUpperCase();
  const saveLabel = saving ? 'OPSLAAN…' : quickComplete ? 'AFVINKEN' : restChosen ? 'RUSTDAG AFVINKEN' : 'OPSLAAN';

  function goToForm() {
    setReachedForm(true);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 overflow-y-auto ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        style={{ background: 'var(--color-bg)' }}
      >
      <div className="mx-auto max-w-md px-4 pb-32 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={requestClose} className="-ml-2 min-h-[44px] px-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>‹ Terug</button>
          <span className="text-[11px] font-semibold tracking-[0.14em]" style={{ color: 'var(--color-bronze)' }}>{dateLabel}</span>
        </div>

        <SessionHeader brief={brief} title={template.name} />

        {availableVariants(template).length > 1 && !restChosen && (
          <div className="mt-4 flex gap-2" role="group" aria-label="Versie">
            {availableVariants(template).map((v) => (
              <button
                key={v}
                onClick={() => selectVariant(v)}
                className="min-h-[40px] flex-1 rounded-lg border text-xs font-semibold tracking-wide"
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

        {hasModalities && guidanceMode === 'ascend_guided' && (getModalities(template.id)?.length ?? 0) > 1 && (
          <Card className="mt-5">
            <Eyebrow>{template.type === 'recovery' ? 'WAT DOE JE VANDAAG?' : 'WAAR TRAIN JE?'}</Eyebrow>
            <div className="mt-3">
              <ModalityPicker templateId={template.id} selectedKey={modalityKey} onSelect={setModalityKey} enabledSports={settings.enabledSports} />
            </div>
          </Card>
        )}

        {quickComplete && (
          <Card className="mt-5">
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Kracht bijgehouden in MacroFactor</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Oefeningen, sets en gewicht staan in MacroFactor. Hier vink je de training alleen af.
            </p>
          </Card>
        )}

        {!restChosen && !quickComplete && (
          <Card className="mt-5">
            <Eyebrow>ZO DOE JE HET</Eyebrow>
            {template.warmup && template.warmup.length > 0 && (
              <StretchList title={`Eerst: ${template.warmup.length} opwarmoefeningen`} stretches={template.warmup} className="mt-3" />
            )}
            {plan && conditioningSteps.length > 0 && <WorkoutSteps plan={plan} compact intro={false} />}
            {template.type === 'strength' && (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Zwaarte volgens MacroFactor. Vul alleen in wat je wilt bijhouden.</p>
                {exercises.map((ex) => {
                  const timed = /\d\s*(s|sec)\b/i.test(ex.reps);
                  const open = openExercise === ex.id;
                  return (
                    <div key={ex.id} className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{ex.exerciseName}</span>
                        <span className="shrink-0 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{ex.sets} × {ex.reps.replace(/(\d)\s*s\b/i, '$1 sec')}</span>
                      </div>
                      {!timed && (
                        <div className="mt-1 flex gap-4">
                          <button onClick={() => setOpenExercise(open ? null : ex.id)} className="min-h-[36px] text-xs underline underline-offset-2" style={{ color: 'var(--color-bronze)' }} aria-expanded={open}>
                            {open ? 'Sluiten' : 'Sets invullen'}
                          </button>
                          <button onClick={() => setRestTimerFor(ex.exerciseName)} className="min-h-[36px] text-xs underline underline-offset-2" style={{ color: 'var(--color-bronze)' }} aria-label={`Rusttimer voor ${ex.exerciseName}`}>
                            Rusttimer
                          </button>
                        </div>
                      )}
                      {open && !timed && (
                        <div className="mt-2 flex flex-col gap-2">
                          {(setLogs[ex.id] ?? []).map((set, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="w-6 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{i + 1}</span>
                              <div className="w-24">
                                <NumberField value={set.weightKg} onChange={(v) => updateSet(ex.id, i, { weightKg: v })} decimals={2} unit="kg" compact />
                              </div>
                              <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>×</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                aria-label={`Herhalingen set ${i + 1}`}
                                placeholder="herh."
                                value={set.reps || ''}
                                onChange={(e) => updateSet(ex.id, i, { reps: Number(e.target.value) || 0 })}
                                className="w-20 rounded-lg border px-2 py-1.5 text-sm"
                                style={{ background: 'var(--color-bg)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {template.cooldown && template.cooldown.length > 0 && (
              <StretchList title={`Daarna: ${template.cooldown.length} rekoefeningen`} stretches={template.cooldown} className="mt-3" />
            )}
          </Card>
        )}

        {brief.stopSignals.length > 0 && !restChosen && (
          <Card className="mt-5">
            <Eyebrow>STOP OF SCHAKEL TERUG ALS</Eyebrow>
            <StopSignals signals={brief.stopSignals} />
          </Card>
        )}

        <div ref={formRef} className="scroll-mt-4" />
        <p className="mt-8 font-display text-xl" style={{ color: 'var(--color-ink)' }}>Hoe ging het?</p>

        {(plannedInPast || !plannedSessionId) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span style={{ color: 'var(--color-ink-dim)' }}>Gedaan op</span>
            {plannedInPast ? (
              [scheduledDate!, today].map((d) => (
                <button
                  key={d}
                  onClick={() => setDoneOn(d)}
                  className="min-h-[36px] rounded-full border px-3"
                  style={{ borderColor: doneOn === d ? 'var(--color-gold)' : 'var(--color-card-border)', color: doneOn === d ? 'var(--color-gold)' : 'var(--color-ink)' }}
                >
                  {d === today ? 'vandaag' : `${weekdayShortNL(d).toLowerCase()} ${formatDateNL(d)}`}
                </button>
              ))
            ) : (
              <input
                type="date"
                value={doneOn}
                max={today}
                min={addDays(today, -60)}
                onChange={(e) => e.target.value && setDoneOn(e.target.value)}
                className="rounded-lg border bg-transparent px-2 py-1.5"
                style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)', colorScheme: 'dark' }}
              />
            )}
          </div>
        )}

        {restChosen ? (
          <Card className="mt-4">
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Een echte rustdag. Er valt niets in te vullen.</p>
          </Card>
        ) : (
        <Card className="mt-4 flex flex-col gap-4">
          <Field label="Duur" unit="min" value={duration} onChange={(v) => setDuration(typeof v === 'number' ? v : 0)} />
          <div>
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Zwaarte (RPE), hoe zwaar voelde de hele training?</p>
            <div className="mt-2 grid grid-cols-10 gap-1" role="radiogroup" aria-label="Zwaarte van 1 tot 10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const inPlan = planRpe && n >= planRpe[0] && n <= planRpe[1];
                const active = rpe === n;
                return (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setRpe(active ? '' : n)}
                    className="min-h-[40px] rounded-lg border text-sm tabular-nums"
                    style={{
                      borderColor: active ? 'var(--color-gold)' : inPlan ? 'var(--color-bronze-dark)' : 'var(--color-card-border)',
                      background: active ? 'var(--color-gold)' : 'transparent',
                      color: active ? 'var(--color-bg)' : inPlan ? 'var(--color-gold)' : 'var(--color-ink-dim)',
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {peak && (
              <p className="mt-1.5 text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                Het plan: {INTENSITY[peak].label.toLowerCase()} ({INTENSITY[peak].rpe}){peak >= 3 && conditioningSteps.some((st) => st.intensity <= 2) ? ' in de zware stukken, rustig ertussen' : ''}.
              </p>
            )}
          </div>

          {template.type === 'strength' && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelde het ten opzichte van normaal? (optioneel)</p>
              <div className="mt-2 flex gap-2">
                {(['better', 'normal', 'worse'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSubjectiveFeel(subjectiveFeel === f ? undefined : f)}
                    className="min-h-[40px] flex-1 rounded-lg border text-xs font-semibold tracking-wide"
                    style={{ borderColor: subjectiveFeel === f ? 'var(--color-gold)' : 'var(--color-card-border)', color: subjectiveFeel === f ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}
                  >
                    {FEEL_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasModalities && (
            <>
              {fields.distance && <Field label="Afstand" unit="km" decimals={2} value={distanceKm} onChange={setDistanceKm} />}
              {fields.inclinePercent && (
                <>
                  <Field label="Helling" unit="%" decimals={1} value={inclinePercent} onChange={setInclinePercent} />
                  <p className="-mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>ASCEND schat je hoogtemeters uit afstand en helling.</p>
                </>
              )}
              {fields.elevation && (
                <>
                  <Field label={`Stijging${elevationEstimated ? ' (geschat)' : ''}`} unit="m D+" value={effectiveElevationGainM} onChange={setElevationGainM} placeholder={plannedStep?.elevationGainM ? formatNumberNL(plannedStep.elevationGainM, 0) : undefined} />
                  {elevationEstimated && <p className="-mt-2 text-xs" style={{ color: 'var(--color-gold)' }}>Geschat uit afstand × helling, geen GPS-meting.</p>}
                </>
              )}
              {fields.elevationLoss && <Field label="Daling" unit="m D−" value={elevationLossM} onChange={setElevationLossM} placeholder={plannedStep?.elevationGainM ? formatNumberNL(plannedStep.elevationGainM, 0) : undefined} />}
              {fields.steps && (
                <>
                  <Field label="Verdiepingen (trap)" value={steps} onChange={setSteps} />
                  <Field label="Hoogtemeters op toestel (optioneel)" unit="m" value={machineVerticalM} onChange={setMachineVerticalM} />
                </>
              )}
              <Field label="Gem. hartslag" unit="bpm" value={avgHeartRate} onChange={setAvgHeartRate} />
              {fields.cadence && <Field label="Cadans" value={cadence} onChange={setCadence} />}
              {fields.power && <Field label="Vermogen" unit="W" value={power} onChange={setPower} />}
              {fields.backpackWeight && <Field label="Rugzak" unit="kg" decimals={1} value={backpackWeightKg} onChange={setBackpackWeightKg} />}
              {fields.terrain && (
                <div>
                  <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }} htmlFor="terrain">Terrein</label>
                  <input
                    id="terrain"
                    type="text"
                    value={terrain}
                    onChange={(e) => setTerrain(e.target.value)}
                    placeholder="bijv. bos, rotsen, zand"
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
                  />
                </div>
              )}
            </>
          )}

          {supportsGuidanceMode && (
            <div className="border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
              <button onClick={() => setOtherOpen((o) => !o)} className="flex min-h-[40px] w-full items-center justify-between text-left text-sm" style={{ color: 'var(--color-ink)' }} aria-expanded={otherOpen}>
                <span>Iets anders gedaan?</span>
                <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{guidanceMode === 'ascend_guided' ? (otherOpen ? 'sluiten' : 'openen') : guidanceMode === 'garmin_suggested' ? 'voorstel van Garmin' : 'eigen training'}</span>
              </button>
              {otherOpen && (
                <div className="mt-2 flex flex-col gap-2">
                  {([['ascend_guided', 'Gedaan volgens dit plan'], ['garmin_suggested', 'Het voorstel van je Garmin gevolgd'], ['free', 'Een eigen training']] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => setGuidanceMode(mode)}
                      className="min-h-[44px] rounded-xl border px-3 text-left text-sm"
                      style={{ borderColor: guidanceMode === mode ? 'var(--color-gold)' : 'var(--color-card-border)', color: guidanceMode === mode ? 'var(--color-gold)' : 'var(--color-ink)' }}
                    >
                      {label}
                    </button>
                  ))}
                  {guidanceMode === 'garmin_suggested' && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wat stelde je Garmin voor?</p>
                      <div className="flex flex-wrap gap-2">
                        {GARMIN_SUGGESTED_TYPES.map((t) => (
                          <button
                            key={t}
                            onClick={() => setGarminSuggestedType(t)}
                            className="min-h-[36px] rounded-lg border px-3 text-xs"
                            style={{ borderColor: garminSuggestedType === t ? 'var(--color-gold)' : 'var(--color-card-border)', color: garminSuggestedType === t ? 'var(--color-gold)' : 'var(--color-ink)' }}
                          >
                            {GARMIN_TYPE_LABEL[t] ?? t}
                          </button>
                        ))}
                      </div>
                      {compatibility && (
                        <div className="rounded-xl border p-2.5 text-xs leading-relaxed" style={{ borderColor: compatibility.compatibility === 'not_equivalent' ? 'var(--color-warning)' : 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}>
                          <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{COMPATIBILITY_LABEL[compatibility.compatibility]}. </span>
                          {compatibility.note}
                        </div>
                      )}
                    </div>
                  )}
                  {guidanceMode === 'free' && <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Vul in wat je echt deed.</p>}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs" style={{ color: 'var(--color-ink-dim)' }} htmlFor="notes">Notities</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
            />
          </div>
        </Card>
        )}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-10 border-t"
        style={{ background: 'rgba(13,13,15,0.94)', borderColor: 'var(--color-card-border)', backdropFilter: 'blur(12px)' }}
      >
        <div className="mx-auto flex max-w-md gap-3 px-4 pt-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
          {guide ? (
            <SecondaryButton onClick={() => setShowInfo(true)} className="min-w-[96px] flex-none px-4">INFO</SecondaryButton>
          ) : (
            <SecondaryButton onClick={requestClose} className="min-w-[112px] flex-none px-4">ANNULEREN</SecondaryButton>
          )}
          {reachedForm || restChosen || quickComplete ? (
            <PrimaryButton onClick={handleSave} disabled={saving}>{saveLabel}</PrimaryButton>
          ) : (
            <PrimaryButton onClick={goToForm}>KLAAR, INVULLEN</PrimaryButton>
          )}
        </div>
      </div>
      </div>

      {showInfo && guide && (
        <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={scheduledDate ?? today} dayLabel={guideDayLabel(template, scheduledDate ?? today)} onClose={() => setShowInfo(false)} />
      )}

      {restTimerFor && (
        <CountdownTimer initialSeconds={REST_TIMER_SECONDS} label={`RUST, ${restTimerFor}`} onClose={() => setRestTimerFor(null)} />
      )}
    </Portal>
  );
}

// "RPE 8-9" -> [8, 9]
function rpeRange(text: string): [number, number] | undefined {
  const m = text.match(/(\d+)(?:-(\d+))?/);
  if (!m) return undefined;
  return [Number(m[1]), Number(m[2] ?? m[1])];
}

// Dutch number entry (components/NumberField.tsx): "1.200" m D+ stays
// 1200, "12,5" km stays 12.5.
function Field({ label, value, onChange, decimals = 0, unit, placeholder }: { label: string; value: number | ''; onChange: (v: number | '') => void; decimals?: number; unit?: string; placeholder?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{label}</span>
      <div className="w-32">
        <NumberField value={value === '' ? undefined : value} onChange={(v) => onChange(v === undefined ? '' : v)} decimals={decimals} unit={unit} placeholder={placeholder} compact />
      </div>
    </div>
  );
}
