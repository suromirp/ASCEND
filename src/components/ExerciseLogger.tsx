import { useEffect, useRef, useState } from 'react';
import { NumberField } from './NumberField';
import { templateSport } from '../engine/sports';
import type { SessionTemplate, SessionVariant, ExerciseSetLog, SetLog, TrainingEnvironment, GuidanceMode, WorkoutDetails } from '../models/training';
import type { Program } from '../models/program';
import { exercisesForVariant, durationForVariant, availableVariants, resolveVariantDuration } from '../engine/substitutions';
import { useAppData, type LogSessionInput } from '../state/AppDataContext';
import { getModalities, getModality, defaultModality, modalitySport } from '../data/modalities';
import { GARMIN_SUGGESTED_TYPES, GARMIN_TYPE_LABEL, COMPATIBILITY_LABEL, getCompatibility } from '../data/garminSuggested';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Chip, Eyebrow, PrimaryButton, SecondaryButton, Segmented, Toggle, ZoneBar } from './ui';
import { CountdownTimer } from './CountdownTimer';
import { addDays, formatDateNL, todayISO, weekdayShortNL } from '../utils/dates';
import { buildWorkoutPlan } from '../engine/workoutPlan';
import { cleanDetails, detailForm, plannedDetails } from '../engine/workoutDetails';
import { asksLegs, type LegsAtStart } from '../engine/learning';
import { WorkoutDetailsFields } from './WorkoutDetailsFields';
import { TrainingGuideSheet } from './TrainingGuideSheet';
import { StopSignals } from './SessionHeader';
import { SkyBand } from './SkyBand';
import { CheckGlyph } from './vandaag/glyphs';
import { ZONE_SENTENCE } from './vandaag/zone';
import { IntervalProfile, KeyNumbers, ModalityChoice, MoreText, StepList, StretchRow } from './duur/DuurParts';
import { WatchStatusRow } from './WatchStatusRow';
import { buildSessionBrief } from '../engine/sessionBrief';
import { progressionTarget } from '../engine/programLayout';
import { getTrainingGuide, guideDayLabel } from '../data/trainingGuide';
import { formatNumberNL } from '../utils/number';
import { INTENSITY, type Intensity } from '../data/workoutStructure';
import { PainReportFields } from './PainReportFields';
import { isLegHeavyTemplate } from '../engine/scheduler';
import type { PainReport } from '../models/checkIn';
import { durationNeedsCheck, entryMinutes, longDurationText } from '../engine/inputLimits';
import { clearDraft, draftKey, draftNumber, loadDraft, saveDraft } from '../utils/loggerDraft';
import { ForgeWorkout } from './forge/ForgeWorkout';
import { Icon } from './icons';
import { TextButton } from './TextButton';

const REST_TIMER_SECONDS = 90;

const VARIANT_LABEL: Record<SessionVariant, string> = { full: 'Volledig', short: 'Kort', minimum: 'Minimum', custom: 'Aangepast' };
const FEEL_LABEL: Record<'better' | 'normal' | 'worse', string> = { better: 'Beter', normal: 'Normaal', worse: 'Slechter' };

// Only these days carry the ASCEND Guided / Garmin Suggested / Free
// Training choice — Herstel just gets the modality picker directly, since
// "what did Garmin suggest" and "free training" don't add anything
// meaningful on a day whose whole point is optional/unstructured rest.
const GUIDANCE_MODE_DAYS = new Set(['tpl_easy_run', 'tpl_bergconditie', 'tpl_hill_intervals', 'tpl_long_run']);


// Wat het blad als concept bewaart (utils/loggerDraft.ts). Alles optioneel:
// een concept van een oudere versie of met ontbrekende velden werkt gewoon.
interface LoggerDraft {
  variant: SessionVariant; duration: number | ''; rpe: number | ''; notes: string;
  subjectiveFeel: 'better' | 'normal' | 'worse' | undefined; legsAtStart: LegsAtStart | undefined; painReports: PainReport[];
  doneOn: string; workout: WorkoutDetails; setLogs: Record<string, SetLog[]>;
  guidanceMode: GuidanceMode; modalityKey: string | undefined; garminSuggestedType: string; reachedForm: boolean;
  distanceKm: number | ''; elevationGainM: number | ''; elevationLossM: number | ''; avgHeartRate: number | '';
  backpackWeightKg: number | ''; poles: boolean; cadence: number | ''; power: number | ''; steps: number | '';
  machineVerticalM: number | ''; terrain: string; inclinePercent: number | '';
}

const LEGS_OPTIONS: [LegsAtStart, string][] = [['fris', 'Fris'], ['normaal', 'Normaal'], ['zwaar', 'Zwaar']];

type LoggerProps = Parameters<typeof GeneralLogger>[0];

// Een krachttraining opent het workoutscherm van Forge (components/forge/),
// al het andere dit blad.
export function ExerciseLogger(props: LoggerProps) {
  return props.template.type === 'strength' ? <ForgeWorkout {...props} /> : <GeneralLogger {...props} />;
}

function GeneralLogger({
  template,
  plannedSessionId,
  scheduledDate,
  program,
  initialVariant = 'full',
  startAtForm = false,
  preview = false,
  onClose,
}: {
  template: SessionTemplate;
  plannedSessionId?: string;
  scheduledDate?: string;
  program?: Program | null;
  initialVariant?: SessionVariant;
  // Vanuit "Gedaan" op Vandaag: meteen bij het formulier "hoe ging het".
  startAtForm?: boolean;
  // "Hoe je het doet" voor een training van een latere dag: alleen lezen. Het
  // formulier en Opslaan ontbreken, er komt geen concept, onderaan staat Sluiten.
  preview?: boolean;
  onClose: () => void;
}) {
  const { logSession, settings, strengthExternal, templates, plannedSessions } = useAppData();
  const { closing, requestClose: closeSheet } = useSheetClose(onClose);
  // Het concept van dit blad: terug als je het blad na een herlaad opnieuw opent.
  const storageKey = draftKey(template.id, plannedSessionId, scheduledDate);
  // Alleen lezen raakt het concept niet aan: dat is van de dag zelf.
  const [restored] = useState(() => (preview ? undefined : loadDraft<LoggerDraft>(storageKey)));
  // Annuleren of terug gooit het concept weg; herladen niet.
  const requestClose = () => {
    if (!preview) clearDraft(storageKey);
    closeSheet();
  };
  const [variant, setVariant] = useState<SessionVariant>(restored?.variant ?? initialVariant);
  const quickComplete = template.type === 'strength' && strengthExternal;
  // The planned session behind this screen: the line about the watch is about it.
  const plannedSession = plannedSessionId ? plannedSessions.find((p) => p.id === plannedSessionId) : undefined;

  function resolveDuration(v: SessionVariant): number {
    if (!scheduledDate) return durationForVariant(template, v);
    return resolveVariantDuration(template, v, scheduledDate, program);
  }

  // Leeg mag: leeg of 0 is "geen duur" (utils: engine/inputLimits.ts).
  const [duration, setDuration] = useState<number | ''>(() => draftNumber(restored?.duration, resolveDuration(variant)));
  const [rpe, setRpe] = useState<number | ''>(draftNumber(restored?.rpe, ''));
  const [notes, setNotes] = useState(typeof restored?.notes === 'string' ? restored.notes : '');
  const [subjectiveFeel, setSubjectiveFeel] = useState<'better' | 'normal' | 'worse' | undefined>(restored?.subjectiveFeel);
  const [legsAtStart, setLegsAtStart] = useState<LegsAtStart | undefined>(restored?.legsAtStart);
  const [painReports, setPainReports] = useState<PainReport[]>(Array.isArray(restored?.painReports) ? restored.painReports : []);
  // Boven de grens eerst "Klopt dit?" vragen, een keer.
  const [confirmLong, setConfirmLong] = useState(false);
  const [saving, setSaving] = useState(false);
  // The day it was actually done. Ticking off a session from an earlier
  // day defaults to that day; a loose training can be logged for a past
  // day too (production bug: everything landed on today).
  const today = todayISO();
  const plannedInPast = !!plannedSessionId && !!scheduledDate && scheduledDate < today;
  const [doneOn, setDoneOn] = useState<string>(typeof restored?.doneOn === 'string' ? restored.doneOn : plannedInPast ? scheduledDate! : today);
  // The exact same plan the guide shows for this day: steps, minutes,
  // repeats, RPE and heart-rate zone (production feedback: the training
  // screen said something different from the info screen).
  const plan = buildWorkoutPlan(template, scheduledDate ?? today, program);
  const conditioningSteps = plan?.timeline.filter((s) => s.kind !== 'strength') ?? [];
  const peak = conditioningSteps.length > 0 ? (Math.max(...conditioningSteps.map((s) => s.intensity)) as Intensity) : undefined;
  const [workout, setWorkout] = useState<WorkoutDetails>(() => restored?.workout ?? plannedDetails(template.id, plan));
  const [restTimerFor, setRestTimerFor] = useState<string | null>(null);
  const [openExercise, setOpenExercise] = useState<string | null>(null);
  const [reachedForm, setReachedForm] = useState(startAtForm || restored?.reachedForm === true);
  const [otherOpen, setOtherOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (startAtForm) formRef.current?.scrollIntoView({ block: 'start' });
  }, [startAtForm]);
  // This week's targets (mountain hike: D+ and backpack), to fill the form.
  const plannedStep = progressionTarget(template, program, scheduledDate ?? today)?.step;

  const exercises = exercisesForVariant(template, variant);
  const [setLogs, setSetLogs] = useState<Record<string, SetLog[]>>(() =>
    Object.fromEntries(
      exercises.map((e) => [e.id, restored?.setLogs?.[e.id] ?? Array.from({ length: e.sets }, () => ({ reps: 0, weightKg: e.targetWeightKg }))]),
    ),
  );

  const hasModalities = !!getModalities(template.id);
  const supportsGuidanceMode = GUIDANCE_MODE_DAYS.has(template.id);
  const [guidanceMode, setGuidanceMode] = useState<GuidanceMode>(restored?.guidanceMode ?? 'ascend_guided');
  // On a rest day the screen only opens to log a walk.
  const [modalityKey, setModalityKey] = useState<string | undefined>(() =>
    restored?.modalityKey ?? (template.type === 'recovery' && getModality(template.id, 'recovery_walk') ? 'recovery_walk' : defaultModality(template.id)));
  const [garminSuggestedType, setGarminSuggestedType] = useState<string>(restored?.garminSuggestedType ?? '');
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

  const [distanceKm, setDistanceKm] = useState<number | ''>(draftNumber(restored?.distanceKm, ''));
  const [elevationGainM, setElevationGainM] = useState<number | ''>(draftNumber(restored?.elevationGainM, ''));
  const [elevationLossM, setElevationLossM] = useState<number | ''>(draftNumber(restored?.elevationLossM, ''));
  const [avgHeartRate, setAvgHeartRate] = useState<number | ''>(draftNumber(restored?.avgHeartRate, ''));
  const [backpackWeightKg, setBackpackWeightKg] = useState<number | ''>(() => draftNumber(restored?.backpackWeightKg, progressionTarget(template, program, scheduledDate ?? todayISO())?.step.backpackKg ?? ''));
  const [poles, setPoles] = useState(restored?.poles === true);
  const [cadence, setCadence] = useState<number | ''>(draftNumber(restored?.cadence, ''));
  const [power, setPower] = useState<number | ''>(draftNumber(restored?.power, ''));
  const [steps, setSteps] = useState<number | ''>(draftNumber(restored?.steps, ''));
  const [machineVerticalM, setMachineVerticalM] = useState<number | ''>(draftNumber(restored?.machineVerticalM, ''));
  const [terrain, setTerrain] = useState(typeof restored?.terrain === 'string' ? restored.terrain : '');

  // Incline-treadmill D+ estimate (distance × incline% ÷ 100) — a treadmill
  // doesn't actually change your altitude, so this is a training estimate,
  // not a GPS measurement. Derived at render time rather than mirrored into
  // state via an effect: elevationGainM only ever holds a manually-typed
  // override, and the incline estimate is used whenever there isn't one.
  const [inclinePercent, setInclinePercent] = useState<number | ''>(draftNumber(restored?.inclinePercent, ''));
  const inclineEstimate =
    fields.inclinePercent && distanceKm !== '' && inclinePercent !== ''
      ? Math.round((distanceKm * 1000 * inclinePercent) / 100)
      : undefined;
  const elevationEstimated = elevationGainM === '' && inclineEstimate !== undefined;
  const effectiveElevationGainM = elevationEstimated ? inclineEstimate : elevationGainM;

  // Het concept bij elke verandering wegschrijven.
  useEffect(() => {
    if (preview) return;
    const snapshot: LoggerDraft = {
      variant, duration, rpe, notes, subjectiveFeel, legsAtStart, painReports, doneOn, workout, setLogs, guidanceMode, modalityKey,
      garminSuggestedType, reachedForm, distanceKm, elevationGainM, elevationLossM, avgHeartRate, backpackWeightKg, poles, cadence, power,
      steps, machineVerticalM, terrain, inclinePercent,
    };
    saveDraft(storageKey, snapshot);
  }, [preview, storageKey, variant, duration, rpe, notes, subjectiveFeel, legsAtStart, painReports, doneOn, workout, setLogs, guidanceMode, modalityKey, garminSuggestedType, reachedForm, distanceKm, elevationGainM, elevationLossM, avgHeartRate, backpackWeightKg, poles, cadence, power, steps, machineVerticalM, terrain, inclinePercent]);

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

  async function handleSave(confirmed = false) {
    if (preview) return;
    // A real rest day: logged as rest, no minutes of training that weren't there.
    const isRest = guidanceMode === 'ascend_guided' && selectedModality?.environment === 'rest';
    // Leeg of 0 is "geen duur"; heel lang vraagt eerst "Klopt dit?".
    const loggedMinutes = isRest ? 0 : entryMinutes(duration);
    if (!confirmed && durationNeedsCheck(loggedMinutes)) {
      setConfirmLong(true);
      return;
    }
    setConfirmLong(false);
    setSaving(true);
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
      legsAtStart: asksLegs(template) && !isRest ? legsAtStart : undefined,
      painAreas: painReports.length > 0 ? painReports.map((p) => p.area) : undefined,
      painReports: painReports.length > 0 ? painReports : undefined,
      workout: detailForm(template.id) && !isRest ? cleanDetails(workout) : undefined,
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
              poles: fields.elevationLoss && poles ? true : undefined,
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
    if (saved) {
      clearDraft(storageKey);
      onClose();
    }
  }

  const brief = buildSessionBrief(template, scheduledDate ?? today, program, {
    modalityKey: guidanceMode === 'ascend_guided' ? modalityKey : undefined,
    templates,
  });
  const guide = getTrainingGuide(template.id);
  const restChosen = selectedModality?.environment === 'rest';
  const planRpe = peak ? rpeRange(INTENSITY[peak].rpe) : undefined;
  const weekday = weekdayShortNL(scheduledDate ?? today);
  const dateLabel = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1).toLowerCase()} ${formatDateNL(scheduledDate ?? today)}`;
  // Eén doorlopend blok: geen profiel, wel de zone (zoals de missiekaart).
  const singleZone = conditioningSteps.length === 1 && !conditioningSteps[0].noTarget ? conditioningSteps[0].intensity : undefined;
  const saveLabel = saving ? 'Opslaan…' : quickComplete ? 'Afvinken' : restChosen ? 'Rustdag afvinken' : 'Opslaan';

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
      <div className="mx-auto max-w-md px-4 pb-32">
        <SkyBand variant="low" gear={false}>
          <div className="flex items-start gap-2">
            <button type="button" onClick={requestClose} aria-label="Terug" className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
              <Icon name="terug" size={24} />
            </button>
            <div className="min-w-0 flex-1 pt-1">
              <Eyebrow>{brief.headline}</Eyebrow>
              <h1 className="font-display text-3xl leading-tight" style={{ color: 'var(--color-ink)' }}>{template.name}</h1>
              {brief.purpose && <MoreText text={brief.purpose} className="mt-1" color="var(--color-ink)" />}
              <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{[dateLabel, brief.weekLabel].filter(Boolean).join(' · ')}</p>
              {preview && <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Zo staat hij klaar. Afvinken kan op de dag zelf.</p>}
            </div>
          </div>
        </SkyBand>

        <Card className="mt-1 flex flex-col gap-5">
          {/* Bij één doorlopend blok zeggen de zonebalk en zijn zin het al: zone en praattest niet nog eens als pil. */}
          <KeyNumbers facts={singleZone && !restChosen ? brief.facts.filter((f) => !/^(zone \d|praten kan)/i.test(f.value)) : brief.facts} />
          {!restChosen && plan && conditioningSteps.length > 1 ? (
            <IntervalProfile plan={plan} />
          ) : !restChosen && singleZone ? (
            <div className="flex flex-col gap-3">
              <ZoneBar active={singleZone} label={`Zone ${singleZone}`} />
              <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>
                <span className="font-semibold" style={{ color: 'var(--color-progress)' }}>Zone {singleZone}.</span> {ZONE_SENTENCE[singleZone]}
              </p>
            </div>
          ) : null}
          {(brief.sportSwitch || brief.tomorrow) && (
            <div className="-mt-2 flex flex-col gap-1">
              {brief.sportSwitch && <p className="text-xs" style={{ color: 'var(--color-status)' }}>{brief.sportSwitch}</p>}
              {brief.tomorrow && <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{brief.tomorrow}</p>}
            </div>
          )}
        </Card>

        {!preview && availableVariants(template).length > 1 && !restChosen && (
          <div className="mt-4">
            <Segmented
              tall
              label="Versie"
              value={variant}
              onChange={selectVariant}
              options={availableVariants(template).map((v) => ({ value: v, label: VARIANT_LABEL[v] }))}
            />
          </div>
        )}

        {!preview && quickComplete && (
          <Card className="mt-4">
            <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Kracht bijgehouden in MacroFactor</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Oefeningen, sets en gewicht staan in MacroFactor. Hier vink je de training alleen af.
            </p>
          </Card>
        )}

        {!restChosen && !quickComplete && plan && conditioningSteps.length > 0 && (
          <Card className="mt-4">
            <Eyebrow>Zo doe je het</Eyebrow>
            <div className="mt-1"><StepList plan={plan} /></div>
          </Card>
        )}

        {hasModalities && guidanceMode === 'ascend_guided' && (getModalities(template.id)?.length ?? 0) > 1 && (
          <Card className="mt-4">
            <Eyebrow>{template.type === 'recovery' ? 'Wat doe je vandaag?' : 'Waar train je?'}</Eyebrow>
            <div className="mt-3">
              <ModalityChoice templateId={template.id} selectedKey={modalityKey} onSelect={setModalityKey} enabledSports={settings.enabledSports} label={template.type === 'recovery' ? 'Wat doe je vandaag?' : 'Waar train je?'} />
            </div>
          </Card>
        )}

        {!restChosen && !quickComplete && (template.warmup?.length || template.cooldown?.length) ? (
          <div className="mt-4 flex flex-col divide-y divide-[var(--color-card-border)] rounded-2xl border px-4" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-card)' }}>
            {template.warmup && template.warmup.length > 0 && (
              <StretchRow icon="rekken" title="Eerst opwarmen" line={`${template.warmup.length} oefeningen`} stretches={template.warmup} />
            )}
            {template.cooldown && template.cooldown.length > 0 && (
              <StretchRow icon="rekken" title="Daarna rekken" line={`${template.cooldown.length} oefeningen`} stretches={template.cooldown} />
            )}
            {plannedSession && !preview && <WatchStatusRow session={plannedSession} template={template} onLeave={requestClose} className="py-2" plain />}
          </div>
        ) : plannedSession && !preview ? (
          <WatchStatusRow session={plannedSession} template={template} onLeave={requestClose} className="mt-4" />
        ) : null}

        {template.type === 'strength' && !restChosen && !quickComplete && !preview && (
          <Card className="mt-4">
            <div className="flex flex-col gap-2">
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
                          <TextButton onClick={() => setOpenExercise(open ? null : ex.id)} aria-expanded={open} icon="omlaag" flipped={open}>
                            {open ? 'Sluiten' : 'Sets invullen'}
                          </TextButton>
                          <TextButton onClick={() => setRestTimerFor(ex.exerciseName)} aria-label={`Rusttimer voor ${ex.exerciseName}`} icon="timer">
                            Rusttimer
                          </TextButton>
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
          </Card>
        )}

        {brief.stopSignals.length > 0 && !restChosen && (
          <Card className="mt-4">
            <Eyebrow tone="var(--color-warning)">Stop of schakel terug als</Eyebrow>
            <StopSignals signals={brief.stopSignals} />
          </Card>
        )}

        {!preview && (
        <>
        <div ref={formRef} className="scroll-mt-4" />
        <h2 className="mt-8 font-display text-2xl leading-tight" style={{ color: 'var(--color-ink)' }}>Hoe ging het?</h2>

        {(plannedInPast || !plannedSessionId) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span style={{ color: 'var(--color-ink-dim)' }}>Gedaan op</span>
            {plannedInPast ? (
              [scheduledDate!, today].map((d) => (
                <Chip key={d} selected={doneOn === d} onClick={() => setDoneOn(d)}>
                  {d === today ? 'vandaag' : `${weekdayShortNL(d).toLowerCase()} ${formatDateNL(d)}`}
                </Chip>
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
          <Field label="Duur" unit="min" value={duration} onChange={(v) => { setDuration(v); setConfirmLong(false); }} />
          {entryMinutes(duration) === 0 && (
            <p className="-mt-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Leeg of 0 betekent: geen duur. De training wordt zonder minuten bewaard.</p>
          )}
          {detailForm(template.id) && <WorkoutDetailsFields templateId={template.id} value={workout} onChange={setWorkout} />}
          <div>
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Zwaarte (RPE): hoe zwaar voelde de hele training?</p>
            <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Zwaarte van 1 tot 10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const inPlan = planRpe && n >= planRpe[0] && n <= planRpe[1];
                const active = rpe === n;
                return (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setRpe(active ? '' : n)}
                    className="st-chip"
                    style={{ padding: 0, borderColor: active ? undefined : inPlan ? 'var(--color-action-muted)' : undefined, color: inPlan && !active ? 'var(--color-ink)' : undefined }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {peak && (
              <p className="mt-1.5 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
                Het plan: {INTENSITY[peak].label.toLowerCase()} ({INTENSITY[peak].rpe}){peak >= 3 && conditioningSteps.some((st) => st.intensity <= 2) ? ' in de zware stukken, rustig ertussen' : ''}.
              </p>
            )}
          </div>

          {(template.type === 'cardio' || template.type === 'hiking' || (template.type === 'strength' && isLegHeavyTemplate(template))) && (
            <PainReportFields value={painReports} onChange={setPainReports} />
          )}

          {asksLegs(template) && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelden je benen bij het inlopen? (optioneel; zo leert ASCEND hoe goed de beenindex bij jou klopt)</p>
              <div className="mt-2">
                <Segmented
                  tall
                  label="Benen bij het inlopen"
                  value={legsAtStart}
                  onChange={(v) => setLegsAtStart(legsAtStart === v ? undefined : v)}
                  options={LEGS_OPTIONS.map(([value, label]) => ({ value, label }))}
                />
              </div>
            </div>
          )}

          {template.type !== 'recovery' && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Hoe voelde het ten opzichte van normaal? (optioneel)</p>
              <div className="mt-2">
                <Segmented
                  tall
                  label="Ten opzichte van normaal"
                  value={subjectiveFeel}
                  onChange={(f) => setSubjectiveFeel(subjectiveFeel === f ? undefined : f)}
                  options={(['better', 'normal', 'worse'] as const).map((value) => ({ value, label: FEEL_LABEL[value] }))}
                />
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
                  {elevationEstimated && <p className="-mt-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Geschat uit afstand × helling, geen GPS-meting.</p>}
                </>
              )}
              {fields.elevationLoss && <Field label="Daling" unit="m D−" value={elevationLossM} onChange={setElevationLossM} placeholder={plannedStep?.elevationGainM ? formatNumberNL(plannedStep.elevationGainM, 0) : undefined} />}
              {fields.elevationLoss && (
                <div className="-mt-1 flex min-h-[44px] items-center justify-between gap-3">
                  <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Met stokken</span>
                  <Toggle checked={poles} onChange={setPoles} label="Met stokken" />
                </div>
              )}
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
              <button onClick={() => setOtherOpen((o) => !o)} className="flex min-h-[44px] w-full items-center justify-between text-left text-sm" style={{ color: 'var(--color-ink)' }} aria-expanded={otherOpen}>
                <span>Iets anders gedaan?</span>
                <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{guidanceMode === 'ascend_guided' ? (otherOpen ? 'sluiten' : 'openen') : guidanceMode === 'garmin_suggested' ? 'voorstel van Garmin' : 'eigen training'}</span>
              </button>
              {otherOpen && (
                <div className="mt-2 flex flex-col gap-2">
                  {([['ascend_guided', 'Gedaan volgens dit plan'], ['garmin_suggested', 'Het voorstel van je Garmin gevolgd'], ['free', 'Een eigen training']] as const).map(([mode, label]) => (
                    <Chip key={mode} selected={guidanceMode === mode} onClick={() => setGuidanceMode(mode)}>
                      {label}
                    </Chip>
                  ))}
                  {guidanceMode === 'garmin_suggested' && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Wat stelde je Garmin voor?</p>
                      <div className="flex flex-wrap gap-2">
                        {GARMIN_SUGGESTED_TYPES.map((t) => (
                          <Chip key={t} selected={garminSuggestedType === t} onClick={() => setGarminSuggestedType(t)}>
                            {GARMIN_TYPE_LABEL[t] ?? t}
                          </Chip>
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
        </>
        )}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-10 border-t"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)' }}
      >
        {preview ? (
          <div className="mx-auto flex max-w-md gap-3 px-4 pt-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
            {guide && <SecondaryButton onClick={() => setShowInfo(true)} className="min-w-[88px] flex-none px-4">Info</SecondaryButton>}
            <PrimaryButton onClick={requestClose}>Sluiten</PrimaryButton>
          </div>
        ) : confirmLong ? (
          <div className="mx-auto max-w-md px-4 pt-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }} role="alert">
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>Klopt dit?</p>
            <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--color-warning)' }}>{longDurationText(entryMinutes(duration))}.</p>
            <div className="mt-3 flex gap-3">
              <SecondaryButton onClick={() => setConfirmLong(false)}>Aanpassen</SecondaryButton>
              <PrimaryButton fullWidth={false} onClick={() => void handleSave(true)} disabled={saving}>Ja, opslaan</PrimaryButton>
            </div>
          </div>
        ) : (
        <div className="mx-auto flex max-w-md gap-3 px-4 pt-3" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
          {guide ? (
            <SecondaryButton onClick={() => setShowInfo(true)} className="min-w-[88px] flex-none px-4">Info</SecondaryButton>
          ) : (
            <SecondaryButton onClick={requestClose} className="min-w-[112px] flex-none px-4">Annuleren</SecondaryButton>
          )}
          {reachedForm || restChosen || quickComplete ? (
            <PrimaryButton onClick={() => void handleSave()} disabled={saving}>{saveLabel}</PrimaryButton>
          ) : (
            <PrimaryButton onClick={goToForm}>
              <span className="inline-flex items-center justify-center gap-2"><CheckGlyph size={18} />Gedaan, invullen</span>
            </PrimaryButton>
          )}
        </div>
        )}
      </div>
      </div>

      {showInfo && guide && (
        <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={scheduledDate ?? today} dayLabel={guideDayLabel(template, scheduledDate ?? today)} onClose={() => setShowInfo(false)} />
      )}

      {restTimerFor && (
        <CountdownTimer initialSeconds={REST_TIMER_SECONDS} label={`Rust, ${restTimerFor}`} onClose={() => setRestTimerFor(null)} />
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
