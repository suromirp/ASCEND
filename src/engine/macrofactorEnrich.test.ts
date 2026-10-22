import { describe, expect, it } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import type { ExerciseSetLog, SessionLog } from '../models/training';
import { describeEnrichment, enrichStrengthData } from './macrofactorEnrich';
import { planMacroFactor } from './macrofactorLink';
import type { MacroFactorExercise, MacroFactorSet, MacroFactorWorkout } from './macrofactorImport';

const { templates } = buildDefaultProgramData();

const fileEx = (name: string, logged: MacroFactorSet[]): MacroFactorExercise => {
  const sets = logged.filter((s) => s.kind !== 'warmup');
  return { name, sets, loggedSets: logged, top: sets[0] };
};
const workout = (exercises: MacroFactorExercise[]): MacroFactorWorkout => ({
  externalId: 'macrofactor:2026-10-14:lower a', date: '2026-10-14', start: '2026-10-14T18:00:00', name: 'Lower A', durationSec: 3600, exercises, setCount: 6,
});
const w = workout([
  fileEx('Back Squat', [
    { reps: 8, weightKg: 40, rir: 5, kind: 'warmup' },
    { reps: 6, weightKg: 100, rir: 2 },
    { reps: 5, weightKg: 100, rir: 1 },
  ]),
  fileEx('Leg Press', [{ reps: 10, weightKg: 150, rir: 2 }]),
]);

const oldLog = (strengthData: ExerciseSetLog[], extra: Partial<SessionLog> = {}): SessionLog => ({
  id: 'l1', templateId: 'tpl_lower_a', type: 'strength', completedDate: '2026-10-14', completedAt: '2026-10-14T19:00:00.000Z', variant: 'custom',
  durationMinutes: 60, source: 'macrofactor', externalId: 'macrofactor:2026-10-14:lower a', strengthData, ...extra,
});
const oldData: ExerciseSetLog[] = [
  { exerciseId: 'mf_back_squat', exerciseName: 'Back Squat', sets: [{ reps: 6, weightKg: 100 }, { reps: 5, weightKg: 100 }] },
  { exerciseId: 'mf_leg_press', exerciseName: 'Leg Press', sets: [{ reps: 10, weightKg: 150 }] },
];

describe('RIR en opwarmsets aanvullen bij een log van voor die velden', () => {
  it('vult alleen de ontbrekende velden: rir per werkset en de opwarmsets', () => {
    const data = enrichStrengthData(oldLog(oldData), w)!;
    expect(data[0].sets).toEqual([
      { reps: 8, weightKg: 40, rir: 5, kind: 'warmup' },
      { reps: 6, weightKg: 100, rir: 2 },
      { reps: 5, weightKg: 100, rir: 1 },
    ]);
    expect(data[1].sets).toEqual([{ reps: 10, weightKg: 150, rir: 2 }]);
  });
  it('verandert niets anders: namen, ids, volgorde, reps, gewicht en wat de gebruiker erbij zette', () => {
    const own: ExerciseSetLog[] = [{ ...oldData[0], sets: [{ reps: 6, weightKg: 100, rpe: 8 }, { reps: 5, weightKg: 100 }] }, oldData[1]];
    const log = oldLog(own, { notes: 'zwaar', subjectiveFeel: 'worse', durationMinutes: 71 });
    const data = enrichStrengthData(log, w)!;
    const after = { ...log, strengthData: data };
    expect({ ...after, strengthData: undefined }).toEqual({ ...log, strengthData: undefined });
    expect(data.map((e) => [e.exerciseId, e.exerciseName])).toEqual(own.map((e) => [e.exerciseId, e.exerciseName]));
    expect(data[0].sets.filter((s) => s.kind !== 'warmup').map((s) => [s.reps, s.weightKg])).toEqual([[6, 100], [5, 100]]);
    expect(data[0].sets.find((s) => s.rpe === 8)).toBeDefined();
  });
  it('schrijft het origineel niet om', () => {
    const log = oldLog(JSON.parse(JSON.stringify(oldData)));
    const before = JSON.stringify(log);
    enrichStrengthData(log, w);
    expect(JSON.stringify(log)).toBe(before);
  });
  it('overschrijft nooit een RIR die er al staat', () => {
    const own: ExerciseSetLog[] = [{ ...oldData[0], sets: [{ reps: 6, weightKg: 100, rir: 3 }, { reps: 5, weightKg: 100 }] }, oldData[1]];
    const data = enrichStrengthData(oldLog(own), w)!;
    expect(data[0].sets.filter((s) => s.kind !== 'warmup').map((s) => s.rir)).toEqual([3, 1]);
  });
  it('laat opwarmsets die er al staan zoals ze zijn', () => {
    const own: ExerciseSetLog[] = [{ ...oldData[0], sets: [{ reps: 3, weightKg: 60, kind: 'warmup' }, { reps: 6, weightKg: 100 }, { reps: 5, weightKg: 100 }] }, oldData[1]];
    const data = enrichStrengthData(oldLog(own), w)!;
    expect(data[0].sets.filter((s) => s.kind === 'warmup')).toEqual([{ reps: 3, weightKg: 60, kind: 'warmup' }]);
    expect(data[0].sets.map((s) => s.rir)).toEqual([undefined, 2, 1]);
  });
  it('doet niets als de werksets niet precies gelijk zijn (andere herhalingen, ander gewicht, ander aantal)', () => {
    const differ = (sets: ExerciseSetLog['sets']) => enrichStrengthData(oldLog([{ ...oldData[0], sets }]), w);
    expect(differ([{ reps: 7, weightKg: 100 }, { reps: 5, weightKg: 100 }])).toBeUndefined();
    expect(differ([{ reps: 6, weightKg: 102.5 }, { reps: 5, weightKg: 100 }])).toBeUndefined();
    expect(differ([{ reps: 6, weightKg: 100 }])).toBeUndefined();
    expect(differ([{ reps: 6, weightKg: 100 }, { reps: 5, weightKg: 100 }, { reps: 5, weightKg: 100 }])).toBeUndefined();
  });
  it('past een oefening aan die gelijk is en laat een andere oefening die afwijkt ongemoeid', () => {
    const data = enrichStrengthData(oldLog([oldData[0], { ...oldData[1], sets: [{ reps: 12, weightKg: 150 }] }]), w)!;
    expect(data[0].sets).toHaveLength(3);
    expect(data[1].sets).toEqual([{ reps: 12, weightKg: 150 }]);
  });
  it('heeft niets te doen als alles er al staat, of als de log geen sets heeft', () => {
    const full = enrichStrengthData(oldLog(oldData), w)!;
    expect(enrichStrengthData(oldLog(full), w)).toBeUndefined();
    expect(enrichStrengthData(oldLog([]), w)).toBeUndefined();
    expect(enrichStrengthData({ ...oldLog([]), strengthData: undefined }, w)).toBeUndefined();
  });
  it('een oefening die niet in het bestand staat blijft zoals ze was', () => {
    const extra: ExerciseSetLog = { exerciseId: 'x', exerciseName: 'Iets Anders', sets: [{ reps: 8, weightKg: 20 }] };
    const data = enrichStrengthData(oldLog([...oldData, extra]), w)!;
    expect(data[2]).toBe(extra);
  });
});

describe('op de importkaart', () => {
  it('stelt het voor bij een bestaande log van dezelfde training, en telt het anders als al gedaan', () => {
    const mapping = { 'lower a': 'tpl_lower_a' };
    const proposed = planMacroFactor([w], mapping, [], [], templates, [oldLog(oldData)]);
    expect(proposed.proposals.map((p) => p.kind)).toEqual(['enrich']);
    expect(proposed.alreadyDone).toBe(0);
    const full = enrichStrengthData(oldLog(oldData), w)!;
    const done = planMacroFactor([w], mapping, [], [], templates, [oldLog(full)]);
    expect(done.proposals).toEqual([]);
    expect(done.alreadyDone).toBe(1);
  });
  it('een training die de gebruiker liet liggen wordt niet aangevuld', () => {
    const out = planMacroFactor([w], {}, [w.externalId], [], templates, [oldLog(oldData)]);
    expect(out.proposals).toEqual([]);
  });
});

describe('de hulp bij optrekken van een oude log', () => {
  const pull = workout([fileEx('Assisted Pull-Up', [{ reps: 8, weightKg: -30, rir: 2 }, { reps: 6, weightKg: -30, rir: 1 }])]);
  const oldPull: ExerciseSetLog[] = [{ exerciseId: 'mf_assisted_pull_up', exerciseName: 'Assisted Pull-Up', sets: [{ reps: 8 }, { reps: 6 }] }];
  it('ziet een ontbrekend gewicht tegenover een negatief gewicht als leeg veld en vult het aan', () => {
    const data = enrichStrengthData(oldLog(oldPull), pull)!;
    expect(data[0].sets).toEqual([{ reps: 8, weightKg: -30, rir: 2 }, { reps: 6, weightKg: -30, rir: 1 }]);
    expect(describeEnrichment(oldLog(oldPull), data)).toBe('de hulp bij optrekken en de herhalingen in reserve');
  });
  it('overschrijft een gewicht dat er al staat niet', () => {
    const own: ExerciseSetLog[] = [{ exerciseId: 'mf_assisted_pull_up', exerciseName: 'Assisted Pull-Up', sets: [{ reps: 8, weightKg: -20 }, { reps: 6, weightKg: -20 }] }];
    expect(enrichStrengthData(oldLog(own), pull)).toBeUndefined();
  });
  it('noemt alleen de hulp als de rir er al staat', () => {
    const withRir: ExerciseSetLog[] = [{ exerciseId: 'x', exerciseName: 'Assisted Pull-Up', sets: [{ reps: 8, rir: 2 }, { reps: 6, rir: 1 }] }];
    const data = enrichStrengthData(oldLog(withRir), pull)!;
    expect(describeEnrichment(oldLog(withRir), data)).toBe('de hulp bij optrekken');
  });
});
