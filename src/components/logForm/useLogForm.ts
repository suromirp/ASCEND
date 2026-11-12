// ASCEND: de toestand van het formulier Hoe ging het?, met het concept. Gedeeld door het oude
// trainingsscherm (ExerciseLogger, voor de rustdag en wat geen training te voet is) en het blad
// Hoe ging het? (HowDidItGoSheet, lopen en wandelen). Ongewijzigd overgenomen uit ExerciseLogger:
// dezelfde beginwaarden, dezelfde sleutel en vorm van het concept (utils/loggerDraft.ts), en het log
// komt uit manualLog.ts#buildManualLog.

import { useEffect, useRef, useState } from 'react';
import type { GuidanceMode, SessionTemplate, SessionVariant, SetLog, WorkoutDetails } from '../../models/training';
import type { Program } from '../../models/program';
import type { PainReport } from '../../models/checkIn';
import type { LegsAtStart } from '../../engine/learning';
import { exercisesForVariant, durationForVariant, resolveVariantDuration } from '../../engine/substitutions';
import { buildWorkoutPlan } from '../../engine/workoutPlan';
import { plannedDetails } from '../../engine/workoutDetails';
import { progressionTarget } from '../../engine/programLayout';
import { resolvePlace } from '../../engine/trainingPlace';
import { getTrainingPlace, saveTrainingPlace } from '../../storage/trainingPlace';
import { clearDraft, draftKey, draftNumber, loadDraft, saveDraft } from '../../utils/loggerDraft';
import { todayISO } from '../../utils/dates';
import { INTENSITY, type Intensity } from '../../data/workoutStructure';
import { getCompatibility } from '../../data/garminSuggested';
import { buildManualLog, elevationOf, logFormShape, type Feel, type LogFormValues } from './manualLog';

// Only these days carry the ASCEND Guided / Garmin Suggested / Free Training choice: Herstel just
// gets the modality picker directly.
const GUIDANCE_MODE_DAYS = new Set(['tpl_easy_run', 'tpl_bergconditie', 'tpl_hill_intervals', 'tpl_long_run']);

// Wat het blad als concept bewaart (utils/loggerDraft.ts). Alles optioneel: een concept van een
// oudere versie of met ontbrekende velden werkt gewoon. Deze vorm verandert niet: een concept van
// het oude scherm komt terug in het blad en omgekeerd.
export interface LoggerDraft extends Omit<LogFormValues, 'modalityKey'> {
  modalityKey: string | undefined;
  reachedForm: boolean;
}

export interface LogFormProps {
  template: SessionTemplate;
  plannedSessionId?: string;
  scheduledDate?: string;
  program?: Program | null;
  initialVariant?: SessionVariant;
  startAtForm?: boolean;
  // Alleen lezen: geen concept.
  preview?: boolean;
  // Kracht bijgehouden in MacroFactor.
  quickComplete?: boolean;
}

export function useLogForm({ template, plannedSessionId, scheduledDate, program, initialVariant = 'full', startAtForm = false, preview = false, quickComplete = false }: LogFormProps) {
  // Het concept van dit blad: terug als je het blad na een herlaad opnieuw opent.
  const storageKey = draftKey(template.id, plannedSessionId, scheduledDate);
  // Alleen lezen raakt het concept niet aan: dat is van de dag zelf.
  const [restored] = useState(() => (preview ? undefined : loadDraft<LoggerDraft>(storageKey)));
  const [variant, setVariant] = useState<SessionVariant>(restored?.variant ?? initialVariant);

  function resolveDuration(v: SessionVariant): number {
    if (!scheduledDate) return durationForVariant(template, v);
    return resolveVariantDuration(template, v, scheduledDate, program);
  }

  // Leeg mag: leeg of 0 is "geen duur" (engine/inputLimits.ts).
  const [duration, setDuration] = useState<number | ''>(() => draftNumber(restored?.duration, resolveDuration(variant)));
  const [rpe, setRpe] = useState<number | ''>(draftNumber(restored?.rpe, ''));
  const [notes, setNotes] = useState(typeof restored?.notes === 'string' ? restored.notes : '');
  const [subjectiveFeel, setSubjectiveFeel] = useState<Feel | undefined>(restored?.subjectiveFeel);
  const [legsAtStart, setLegsAtStart] = useState<LegsAtStart | undefined>(restored?.legsAtStart);
  const [painReports, setPainReports] = useState<PainReport[]>(Array.isArray(restored?.painReports) ? restored.painReports : []);
  // The day it was actually done. Ticking off a session from an earlier day defaults to that day; a
  // loose training can be logged for a past day too (production bug: everything landed on today).
  const today = todayISO();
  const plannedInPast = !!plannedSessionId && !!scheduledDate && scheduledDate < today;
  const [doneOn, setDoneOn] = useState<string>(typeof restored?.doneOn === 'string' ? restored.doneOn : plannedInPast ? scheduledDate! : today);
  // The exact same plan the guide shows for this day.
  const plan = buildWorkoutPlan(template, scheduledDate ?? today, program);
  const conditioningSteps = plan?.timeline.filter((s) => s.kind !== 'strength') ?? [];
  const peak = conditioningSteps.length > 0 ? (Math.max(...conditioningSteps.map((s) => s.intensity)) as Intensity) : undefined;
  const [workout, setWorkout] = useState<WorkoutDetails>(() => restored?.workout ?? plannedDetails(template.id, plan));
  const [reachedForm, setReachedForm] = useState(startAtForm || restored?.reachedForm === true);
  // This week's targets (mountain hike: D+ and backpack), to fill the form.
  const plannedStep = progressionTarget(template, program, scheduledDate ?? today)?.step;

  const exercises = exercisesForVariant(template, variant);
  const [setLogs, setSetLogs] = useState<Record<string, SetLog[]>>(() =>
    Object.fromEntries(
      exercises.map((e) => [e.id, restored?.setLogs?.[e.id] ?? Array.from({ length: e.sets }, () => ({ reps: 0, weightKg: e.targetWeightKg }))]),
    ),
  );

  const supportsGuidanceMode = GUIDANCE_MODE_DAYS.has(template.id);
  const [guidanceMode, setGuidanceMode] = useState<GuidanceMode>(restored?.guidanceMode ?? 'ascend_guided');
  // On a rest day the screen only opens to log a walk.
  const [modalityKey, setModalityKey] = useState<string | undefined>(() => restored?.modalityKey ?? resolvePlace(template, undefined));
  // Waar train je? geldt voor deze ene geplande training en blijft op dit toestel (storage/trainingPlace.ts):
  // de bewaarde keuze is de beginwaarde, tenzij het concept of een tik van jou al iets zegt.
  const placeTouched = useRef(restored?.modalityKey !== undefined);
  useEffect(() => {
    if (!plannedSessionId || placeTouched.current) return;
    let live = true;
    void getTrainingPlace(plannedSessionId).then((stored) => {
      if (live && stored !== undefined && !placeTouched.current) setModalityKey(resolvePlace(template, stored));
    });
    return () => {
      live = false;
    };
  }, [plannedSessionId, template]);
  const choosePlace = (key: string) => {
    placeTouched.current = true;
    setModalityKey(key);
    if (plannedSessionId) void saveTrainingPlace(plannedSessionId, scheduledDate ?? today, key);
  };
  const [garminSuggestedType, setGarminSuggestedType] = useState<string>(restored?.garminSuggestedType ?? '');
  const shape = logFormShape(template, guidanceMode, modalityKey);
  const compatibility = garminSuggestedType ? getCompatibility(template.id, garminSuggestedType) : undefined;

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
  const [inclinePercent, setInclinePercent] = useState<number | ''>(draftNumber(restored?.inclinePercent, ''));
  const elevation = elevationOf({ distanceKm, inclinePercent, elevationGainM }, shape.fields);

  const values: LogFormValues = {
    variant, duration, rpe, notes, subjectiveFeel, legsAtStart, painReports, doneOn, workout, setLogs, guidanceMode, modalityKey,
    garminSuggestedType, distanceKm, elevationGainM, elevationLossM, avgHeartRate, backpackWeightKg, poles, cadence, power, steps,
    machineVerticalM, terrain, inclinePercent,
  };

  // Is er iets ingevuld? Een teruggelezen concept, een plek die je zelf tikte, of een waarde die afwijkt
  // van de beginwaarde. De plek die de app zelf uit de opslag leest telt niet mee.
  const { modalityKey: _place, ...rest } = values;
  const restJson = JSON.stringify(rest);
  const [initialJson] = useState(restJson);
  const filled = () => !!restored || placeTouched.current || restJson !== initialJson;

  // Het concept bij elke verandering wegschrijven.
  useEffect(() => {
    if (preview) return;
    const snapshot: LoggerDraft = {
      variant, duration, rpe, notes, subjectiveFeel, legsAtStart, painReports, doneOn, workout, setLogs, guidanceMode,
      // Alleen een keuze die je zelf tikte: anders verdringt een oud concept een nieuwere bewaarde keuze.
      modalityKey: placeTouched.current ? modalityKey : undefined,
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

  return {
    storageKey, today, plannedInPast, plan, conditioningSteps, peak, planRpe: peak ? rpeRange(INTENSITY[peak].rpe) : undefined, plannedStep, exercises,
    supportsGuidanceMode, shape, compatibility, elevation, values, reachedForm, setReachedForm, filled,
    setDuration, setRpe, setNotes, setSubjectiveFeel, setLegsAtStart, setPainReports, setDoneOn, setWorkout, setGuidanceMode, choosePlace,
    setGarminSuggestedType, setDistanceKm, setElevationGainM, setElevationLossM, setAvgHeartRate, setBackpackWeightKg, setPoles, setCadence,
    setPower, setSteps, setMachineVerticalM, setTerrain, setInclinePercent, selectVariant, updateSet,
    // Annuleren of terug gooit het concept weg; herladen niet.
    clearDraft: () => { if (!preview) clearDraft(storageKey); },
    buildInput: () => buildManualLog(values, { template, plannedSessionId, quickComplete, exercises }),
  };
}

export type LogForm = ReturnType<typeof useLogForm>;

// "RPE 8-9" -> [8, 9]
function rpeRange(text: string): [number, number] | undefined {
  const m = text.match(/(\d+)(?:-(\d+))?/);
  if (!m) return undefined;
  return [Number(m[1]), Number(m[2] ?? m[1])];
}
