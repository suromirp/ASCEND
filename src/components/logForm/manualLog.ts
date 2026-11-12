// ASCEND: wat het formulier Hoe ging het? opslaat, als pure functie. Het oude trainingsscherm
// (components/ExerciseLogger.tsx) en het blad Hoe ging het? (HowDidItGoSheet.tsx) bouwen hun log
// allebei hier, zodat een log uit het blad veld voor veld gelijk is aan een log uit het oude
// formulier bij dezelfde invoer (spoor 5 van docs/visie/Ontwerp trainingsscherm minimaal.md).
// De regels zelf zijn ongewijzigd overgenomen uit ExerciseLogger#handleSave.

import type { ExerciseSetLog, GuidanceMode, SessionTemplate, SessionVariant, SetLog, TrainingEnvironment, WorkoutDetails, ExercisePrescription } from '../../models/training';
import type { PainReport } from '../../models/checkIn';
import type { LogSessionInput } from '../../state/AppDataContext';
import type { LegsAtStart } from '../../engine/learning';
import { asksLegs } from '../../engine/learning';
import { cleanDetails, detailForm } from '../../engine/workoutDetails';
import { entryMinutes } from '../../engine/inputLimits';
import { templateSport } from '../../engine/sports';
import { getModalities, getModality, modalitySport, type ModalityDefinition } from '../../data/modalities';

export type Feel = 'better' | 'normal' | 'worse';

// Alles wat je in het formulier invult, zoals het in de toestand staat ('' is leeg).
export interface LogFormValues {
  variant: SessionVariant;
  duration: number | '';
  rpe: number | '';
  notes: string;
  subjectiveFeel: Feel | undefined;
  legsAtStart: LegsAtStart | undefined;
  painReports: PainReport[];
  doneOn: string;
  workout: WorkoutDetails;
  setLogs: Record<string, SetLog[]>;
  guidanceMode: GuidanceMode;
  modalityKey: string | undefined;
  garminSuggestedType: string;
  distanceKm: number | '';
  elevationGainM: number | '';
  elevationLossM: number | '';
  avgHeartRate: number | '';
  backpackWeightKg: number | '';
  poles: boolean;
  cadence: number | '';
  power: number | '';
  steps: number | '';
  machineVerticalM: number | '';
  terrain: string;
  inclinePercent: number | '';
}

export interface LogFormShape {
  hasModalities: boolean;
  selectedModality: ModalityDefinition | undefined;
  // De velden die de gekozen plek vraagt; bij Garmin of een eigen training een vaste set.
  fields: ModalityDefinition['fields'];
  environment: TrainingEnvironment | undefined;
  // Een echte rustdag: als rust opgeslagen, zonder minuten.
  isRest: boolean;
}

// Welke velden het formulier toont en hoe het opslaat, uit de training, de keuze en de plek.
export function logFormShape(template: SessionTemplate, guidanceMode: GuidanceMode, modalityKey: string | undefined): LogFormShape {
  const hasModalities = !!getModalities(template.id);
  const selectedModality = modalityKey ? getModality(template.id, modalityKey) : undefined;
  // Ascend Guided shows only the fields the chosen modality actually needs; Garmin Suggested / Free
  // Training fall back to a generic set: we don't know the specifics of what was actually done.
  const fields = guidanceMode === 'ascend_guided' ? (selectedModality?.fields ?? {}) : { distance: true, elevation: true };
  const environment: TrainingEnvironment | undefined =
    guidanceMode === 'ascend_guided' && (selectedModality?.environment === 'treadmill' || selectedModality?.environment === 'outdoor')
      ? selectedModality.environment
      : undefined;
  const isRest = guidanceMode === 'ascend_guided' && selectedModality?.environment === 'rest';
  return { hasModalities, selectedModality, fields, environment, isRest };
}

// Incline-treadmill D+ estimate (distance × incline% ÷ 100): a training estimate, not a GPS measurement.
// elevationGainM only ever holds a manually-typed override; the estimate is used whenever there isn't one.
export function elevationOf(values: Pick<LogFormValues, 'distanceKm' | 'inclinePercent' | 'elevationGainM'>, fields: LogFormShape['fields']): { estimated: boolean; gainM: number | '' } {
  const inclineEstimate = fields.inclinePercent && values.distanceKm !== '' && values.inclinePercent !== ''
    ? Math.round((values.distanceKm * 1000 * values.inclinePercent) / 100)
    : undefined;
  const estimated = values.elevationGainM === '' && inclineEstimate !== undefined;
  return { estimated, gainM: estimated ? inclineEstimate : values.elevationGainM };
}

// De minuten die worden opgeslagen: een rustdag 0, leeg of 0 is geen duur.
export function loggedMinutesOf(values: Pick<LogFormValues, 'duration' | 'guidanceMode' | 'modalityKey'>, template: SessionTemplate): number {
  return logFormShape(template, values.guidanceMode, values.modalityKey).isRest ? 0 : entryMinutes(values.duration);
}

export interface LogContext {
  template: SessionTemplate;
  plannedSessionId?: string;
  // Kracht bijgehouden in MacroFactor: geen sets uit dit formulier.
  quickComplete: boolean;
  exercises: ExercisePrescription[];
}

// Het log dat het formulier opslaat. Ongewijzigd uit ExerciseLogger#handleSave.
export function buildManualLog(values: LogFormValues, ctx: LogContext): LogSessionInput {
  const { template, plannedSessionId, quickComplete, exercises } = ctx;
  const { hasModalities, fields, environment, isRest } = logFormShape(template, values.guidanceMode, values.modalityKey);
  const elevation = elevationOf(values, fields);
  const { guidanceMode, modalityKey, garminSuggestedType } = values;
  const loggedMinutes = isRest ? 0 : entryMinutes(values.duration);
  // Only sets that were actually filled in: empty rows would read as 0-rep sets and drag the
  // strength progression down.
  const filled: ExerciseSetLog[] = template.type === 'strength' && !quickComplete
    ? exercises
      .map((e) => ({ exerciseId: e.id, exerciseName: e.exerciseName, sets: (values.setLogs[e.id] ?? []).filter((set) => set.reps > 0) }))
      .filter((e) => e.sets.length > 0)
    : [];
  const strengthData: ExerciseSetLog[] | undefined = filled.length > 0 ? filled : undefined;

  const activityCommon = {
    durationMinutes: loggedMinutes,
    distanceKm: values.distanceKm === '' ? undefined : values.distanceKm,
    elevationGainM: elevation.gainM === '' ? undefined : elevation.gainM,
    estimatedElevation: elevation.estimated || undefined,
    environment,
    modality: guidanceMode === 'ascend_guided' ? modalityKey : undefined,
    guidanceMode: hasModalities ? guidanceMode : undefined,
    garminSuggestedType: guidanceMode === 'garmin_suggested' ? garminSuggestedType || undefined : undefined,
    avgHeartRate: values.avgHeartRate === '' ? undefined : values.avgHeartRate,
    cadence: values.cadence === '' ? undefined : values.cadence,
    source: 'manual' as const,
  };

  return {
    plannedSessionId,
    completedDate: values.doneOn,
    templateId: template.id,
    type: template.type,
    // The way you trained decides the sport: a ride on a run day is cycling, also when Garmin
    // suggested the ride.
    sport: (guidanceMode === 'ascend_guided' ? modalitySport(modalityKey) : guidanceMode === 'garmin_suggested' && garminSuggestedType === 'Bike' ? 'cycling' : undefined) ?? templateSport(template),
    variant: values.variant,
    durationMinutes: loggedMinutes,
    rpe: values.rpe === '' || isRest ? undefined : values.rpe,
    notes: values.notes || undefined,
    subjectiveFeel: values.subjectiveFeel,
    legsAtStart: asksLegs(template) && !isRest ? values.legsAtStart : undefined,
    painAreas: values.painReports.length > 0 ? values.painReports.map((p) => p.area) : undefined,
    painReports: values.painReports.length > 0 ? values.painReports : undefined,
    workout: detailForm(template.id) && !isRest ? cleanDetails(values.workout) : undefined,
    strengthData,
    cardioData:
      template.type === 'cardio' || template.type === 'recovery'
        ? { ...activityCommon, power: values.power === '' ? undefined : values.power }
        : undefined,
    outdoorData:
      template.type === 'hiking'
        ? {
            ...activityCommon,
            power: values.power === '' ? undefined : values.power,
            elevationLossM: values.elevationLossM === '' ? undefined : values.elevationLossM,
            backpackWeightKg: values.backpackWeightKg === '' ? undefined : values.backpackWeightKg,
            poles: fields.elevationLoss && values.poles ? true : undefined,
            terrain: values.terrain || undefined,
            steps: values.steps === '' ? undefined : values.steps,
            machineVerticalM: values.machineVerticalM === '' ? undefined : values.machineVerticalM,
          }
        : undefined,
  };
}
