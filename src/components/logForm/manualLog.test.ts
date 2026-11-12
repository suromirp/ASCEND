import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../../data/defaultProgram';
import type { ExerciseSetLog, SessionTemplate } from '../../models/training';
import type { LogSessionInput } from '../../state/AppDataContext';
import { asksLegs } from '../../engine/learning';
import { cleanDetails, detailForm } from '../../engine/workoutDetails';
import { entryMinutes } from '../../engine/inputLimits';
import { templateSport } from '../../engine/sports';
import { getModalities, getModality, modalitySport } from '../../data/modalities';
import type { TrainingEnvironment } from '../../models/training';
import { buildManualLog, type LogFormValues } from './manualLog';
import { exercisesForVariant } from '../../engine/substitutions';

// De vaste vergelijking van spoor 5 (docs/visie/Ontwerp trainingsscherm minimaal.md): wat het blad
// Hoe ging het? opslaat is veld voor veld gelijk aan wat het oude formulier opsloeg bij dezelfde invoer.
// `oudFormulier` is een bevroren kopie van ExerciseLogger#handleSave zoals hij op main stond (86be2a9),
// met de toestand als argument. Nagemaakte invoer.

const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;

function oudFormulier(st: LogFormValues, template: SessionTemplate, plannedSessionId: string | undefined, quickComplete = false): LogSessionInput {
  const { variant, duration, rpe, notes, subjectiveFeel, legsAtStart, painReports, doneOn, workout, setLogs, guidanceMode, modalityKey, garminSuggestedType, distanceKm, elevationGainM, elevationLossM, avgHeartRate, backpackWeightKg, poles, cadence, power, steps, machineVerticalM, terrain, inclinePercent } = st;
  const exercises = exercisesForVariant(template, variant);
  const hasModalities = !!getModalities(template.id);
  const selectedModality = modalityKey ? getModality(template.id, modalityKey) : undefined;
  const fields = guidanceMode === 'ascend_guided' ? (selectedModality?.fields ?? {}) : { distance: true, elevation: true };
  const environment: TrainingEnvironment | undefined =
    guidanceMode === 'ascend_guided' && (selectedModality?.environment === 'treadmill' || selectedModality?.environment === 'outdoor')
      ? selectedModality.environment
      : undefined;
  const inclineEstimate = fields.inclinePercent && distanceKm !== '' && inclinePercent !== '' ? Math.round((distanceKm * 1000 * inclinePercent) / 100) : undefined;
  const elevationEstimated = elevationGainM === '' && inclineEstimate !== undefined;
  const effectiveElevationGainM = elevationEstimated ? inclineEstimate : elevationGainM;
  const isRest = guidanceMode === 'ascend_guided' && selectedModality?.environment === 'rest';
  const loggedMinutes = isRest ? 0 : entryMinutes(duration);
  const filled: ExerciseSetLog[] = template.type === 'strength' && !quickComplete
    ? exercises.map((e) => ({ exerciseId: e.id, exerciseName: e.exerciseName, sets: (setLogs[e.id] ?? []).filter((set) => set.reps > 0) })).filter((e) => e.sets.length > 0)
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
  return {
    plannedSessionId,
    completedDate: doneOn,
    templateId: template.id,
    type: template.type,
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
    cardioData: template.type === 'cardio' || template.type === 'recovery' ? { ...activityCommon, power: power === '' ? undefined : power } : undefined,
    outdoorData: template.type === 'hiking'
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
}

const empty: LogFormValues = {
  variant: 'full', duration: '', rpe: '', notes: '', subjectiveFeel: undefined, legsAtStart: undefined, painReports: [], doneOn: '2026-11-12',
  workout: {}, setLogs: {}, guidanceMode: 'ascend_guided', modalityKey: undefined, garminSuggestedType: '', distanceKm: '', elevationGainM: '',
  elevationLossM: '', avgHeartRate: '', backpackWeightKg: '', poles: false, cadence: '', power: '', steps: '', machineVerticalM: '', terrain: '', inclinePercent: '',
};

const runOutside: LogFormValues = {
  ...empty, duration: 42, rpe: 4, notes: 'Wind mee op de dijk', subjectiveFeel: 'better', legsAtStart: 'fris',
  painReports: [{ area: 'knie', side: 'links', score: 2 }], modalityKey: 'run_outdoor', distanceKm: 7.35, elevationGainM: 40, avgHeartRate: 141, cadence: 168,
};
const treadmill: LogFormValues = { ...empty, duration: 30, rpe: 5, subjectiveFeel: 'normal', modalityKey: 'run_treadmill', distanceKm: 5, inclinePercent: 2, avgHeartRate: 150 };
const ruck: LogFormValues = {
  ...empty, variant: 'short', duration: 95, rpe: 4, subjectiveFeel: 'worse', modalityKey: 'mountain_hike_outdoor', distanceKm: 9.5, elevationGainM: 520,
  elevationLossM: 515, backpackWeightKg: 7.5, poles: true, terrain: 'bos en rotsen', doneOn: '2026-11-10',
};

describe('Hoe ging het? slaat op wat het oude formulier opsloeg', () => {
  const cases: [string, string, LogFormValues, string | undefined][] = [
    ['een loop buiten', 'tpl_easy_run', runOutside, 'ps_run'],
    ['een loopband', 'tpl_easy_run', treadmill, 'ps_run'],
    ['een wandeling met rugzak', 'tpl_mountain_hike', ruck, undefined],
    ['een intervaltraining met de herhalingen', 'tpl_intervals', { ...empty, duration: 45, rpe: 8, modalityKey: 'run_outdoor', workout: { reps: 6, repSeconds: 180 } }, 'ps_int'],
    ['een eigen training (Iets anders gedaan)', 'tpl_long_run', { ...empty, duration: 70, guidanceMode: 'free', modalityKey: 'long_run_outdoor', distanceKm: 11.2, elevationGainM: 90 }, 'ps_long'],
    ['het voorstel van je Garmin', 'tpl_easy_run', { ...empty, duration: 30, guidanceMode: 'garmin_suggested', garminSuggestedType: 'Run', distanceKm: 5 }, 'ps_run'],
  ];
  for (const [name, id, values, planned] of cases) {
    it(`${name}: veld voor veld gelijk`, () => {
      const template = tpl(id);
      const now = buildManualLog(values, { template, plannedSessionId: planned, quickComplete: false, exercises: exercisesForVariant(template, values.variant) });
      expect(now).toStrictEqual(oudFormulier(values, template, planned));
    });
  }

  it('de loop buiten, uitgeschreven', () => {
    const template = tpl('tpl_easy_run');
    const log = buildManualLog(runOutside, { template, plannedSessionId: 'ps_run', quickComplete: false, exercises: [] });
    expect(log).toMatchObject({
      plannedSessionId: 'ps_run', completedDate: '2026-11-12', templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', variant: 'full',
      durationMinutes: 42, rpe: 4, notes: 'Wind mee op de dijk', subjectiveFeel: 'better', painAreas: ['knie'], outdoorData: undefined,
      cardioData: { durationMinutes: 42, distanceKm: 7.35, elevationGainM: 40, environment: 'outdoor', modality: 'run_outdoor', guidanceMode: 'ascend_guided', avgHeartRate: 141, cadence: 168, source: 'manual' },
    });
  });

  it('de intervaltraining bewaart de herhalingen, een eigen training geen plek', () => {
    const intervals = buildManualLog({ ...empty, duration: 45, modalityKey: 'run_outdoor', workout: { reps: 6, repSeconds: 180 } }, { template: tpl('tpl_intervals'), quickComplete: false, exercises: [] });
    expect(intervals.workout).toMatchObject({ reps: 6, repSeconds: 180 });
    const free = buildManualLog({ ...empty, duration: 70, guidanceMode: 'free', modalityKey: 'long_run_outdoor' }, { template: tpl('tpl_long_run'), quickComplete: false, exercises: [] });
    expect(free.cardioData ?? free.outdoorData).toMatchObject({ modality: undefined, guidanceMode: 'free', environment: undefined });
  });

  it('de loopband: de hoogtemeters geschat uit afstand en helling', () => {
    const template = tpl('tpl_easy_run');
    const log = buildManualLog(treadmill, { template, quickComplete: false, exercises: [] });
    expect(log.cardioData).toMatchObject({ elevationGainM: 100, estimatedElevation: true, environment: 'treadmill', modality: 'run_treadmill' });
  });

  it('de wandeling met rugzak: daling, rugzak, stokken en terrein in outdoorData, op de dag zelf ingevuld', () => {
    const template = tpl('tpl_mountain_hike');
    const log = buildManualLog(ruck, { template, quickComplete: false, exercises: [] });
    expect(log.completedDate).toBe('2026-11-10');
    expect(log.outdoorData).toMatchObject({ elevationLossM: 515, backpackWeightKg: 7.5, poles: true, terrain: 'bos en rotsen', distanceKm: 9.5 });
    expect(log.cardioData).toBeUndefined();
  });

  it('leeg is geen duur, en Iets anders gedaan volgt de sport van het voorstel van je Garmin', () => {
    const template = tpl('tpl_easy_run');
    const values: LogFormValues = { ...empty, guidanceMode: 'garmin_suggested', garminSuggestedType: 'Bike' };
    const log = buildManualLog(values, { template, quickComplete: false, exercises: [] });
    expect(log).toStrictEqual(oudFormulier(values, template, undefined));
    expect(log.durationMinutes).toBe(0);
    expect(log.sport).toBe('cycling');
  });
});
