import { describe, expect, it } from 'vitest';
import type { ExercisePrescription, SessionLog, SessionTemplate } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { learnedMinutesPerSet } from './durationLearning';
import { capForTemplate, capLineFor, capSlots, prescribedSets, resolveTimeCap, timeCapLine } from './forgeTimeCap';

// Nagemaakte trainingen: geen ingebouwd sjabloon, zodat de beendag alleen uit de belasting komt.
const slot = (id: string, priority: ExercisePrescription['priority'], sets: number): ExercisePrescription => ({ id, exerciseName: id, sets, reps: '8-10', priority });

const upper: ExercisePrescription[] = [
  slot('Bankdrukken', 'core', 4),
  slot('Roeien', 'core', 4),
  slot('Schouderdrukken', 'accessory', 3),
  slot('Biceps curl', 'accessory', 3),
  slot('Triceps pushdown', 'optional', 3),
];

function template(id: string, lowerBodyLoad: 'heavy' | 'light', exercises = upper): SessionTemplate {
  return {
    id,
    name: id,
    type: 'strength',
    durationVariants: { full: 60 },
    exercises,
    baseStressProfile: { lowerBodyLoad, impact: 'none', eccentricLoad: 'light', intensity: 'moderate' },
  } as SessionTemplate;
}

describe('de instelling Hoogstens per krachttraining', () => {
  it('heeft 60 en 75 minuten als advies, en leest alleen de vaste keuzes', () => {
    expect(resolveTimeCap(undefined)).toEqual({ strength: 60, legs: 75 });
    expect(resolveTimeCap({ forgeCapStrength: 0, forgeCapLegs: 90 })).toEqual({ strength: 0, legs: 90 });
    expect(resolveTimeCap({ forgeCapStrength: 61, forgeCapLegs: 'veel' })).toEqual({ strength: 60, legs: 75 });
  });

  it('herkent een beendag aan de belasting van de benen, niet aan het id', () => {
    const setting = resolveTimeCap(undefined);
    expect(capForTemplate(template('tpl_eigen_benen', 'heavy'), setting)).toBe(75);
    expect(capForTemplate(template('tpl_eigen_boven', 'light'), setting)).toBe(60);
    // Een id dat vroeger een beendag was, met een lichte belasting: telt als gewone krachttraining.
    expect(capForTemplate(template('tpl_lower_a', 'light'), setting)).toBe(60);
    expect(capForTemplate({ ...template('tpl_loop', 'heavy'), type: 'cardio' } as SessionTemplate, setting)).toBe(0);
  });
});

describe('inkorten tot de grens', () => {
  // 17 sets in 85 minuten: 5 minuten per set.
  it('een gewone training van 85 minuten gaat naar 60: eerst het extra, dan bijwerk, de kern blijft', () => {
    const r = capSlots({ slots: upper, fullMinutes: 85, cap: 60 });
    expect(r.minutes).toBeLessThanOrEqual(60);
    const sets = Object.fromEntries(r.slots.map((s) => [s.id, prescribedSets(s)]));
    expect(sets['Bankdrukken']).toBe(4);
    expect(sets['Roeien']).toBe(4);
    expect(r.dropped).toEqual(['Triceps pushdown']);
    expect(sets['Schouderdrukken'] + sets['Biceps curl']).toBe(4);
    expect(r.setsRemoved).toBe(2);
    expect(timeCapLine(r)).toBe('Ingekort tot ongeveer 60 minuten: Triceps pushdown valt weg, net als 2 sets bijwerk.');
  });

  it('een beendag van 85 minuten gaat naar 75 met alleen sets eraf', () => {
    const r = capSlots({ slots: upper, fullMinutes: 85, cap: 75 });
    expect(r.minutes).toBeLessThanOrEqual(75);
    expect(r.dropped).toEqual([]);
    expect(r.setsRemoved).toBe(2);
    // De extra oefening levert eerst in, daarna het laatste bijwerk.
    expect(r.slots.find((s) => s.id === 'Triceps pushdown')!.sets).toBe(2);
    expect(timeCapLine(r)).toBe('Ingekort tot ongeveer 75 minuten: 2 sets bijwerk vallen weg.');
  });

  it('is de training al korter, dan verandert er niets', () => {
    const r = capSlots({ slots: upper, fullMinutes: 55, cap: 60 });
    expect(r.slots).toBe(upper);
    expect(timeCapLine(r)).toBeUndefined();
    expect(capSlots({ slots: upper, fullMinutes: 120, cap: 0 }).slots).toBe(upper);
  });

  it('een kortere variant rekent met de duur per set van de hele training', () => {
    const short = upper.filter((s) => s.priority !== 'optional');
    // 17 sets in 85 minuten; zonder het extra 14 sets, 70 minuten: past onder 75.
    expect(capSlots({ slots: short, fullSlots: upper, fullMinutes: 85, cap: 75 }).slots).toBe(short);
  });

  it('rekent met de geleerde tijd per set, ook als de geleerde duur door het inkorten korter werd', () => {
    // De training zelf leerde 60 minuten (ingekort), maar per set kost hij 5 minuten: 17 sets blijven 85.
    const r = capSlots({ slots: upper, fullMinutes: 60, minutesPerSet: 5, cap: 60 });
    expect(r.fromMinutes).toBe(85);
    expect(r.minutes).toBeLessThanOrEqual(60);
    expect(r.slots).not.toBe(upper);
  });

  it('de kern blijft altijd staan, ook boven de grens', () => {
    const r = capSlots({ slots: upper, fullMinutes: 170, cap: 45 });
    expect(r.slots.map((s) => s.id)).toEqual(['Bankdrukken', 'Roeien']);
    expect(r.coreOver).toBe(true);
    expect(timeCapLine(r)).toContain('De kernsets blijven staan');
  });

  it('haalt de laatste set van een voorschrift per set weg', () => {
    const targets = [{ repsLow: 8, repsHigh: 10, rir: 2 }, { repsLow: 8, repsHigh: 10, rir: 2 }, { repsLow: 8, repsHigh: 10, rir: 1 }];
    const list = [slot('Kern', 'core', 3), { ...slot('Bij', 'accessory', 3), setTargets: targets }];
    const r = capSlots({ slots: list, fullMinutes: 60, cap: 50 });
    const bij = r.slots.find((s) => s.id === 'Bij')!;
    expect(bij.setTargets).toEqual(targets.slice(0, 2));
    expect(bij.sets).toBe(2);
  });
});

describe('de regel na heropenen', () => {
  const rows = (n: number, done = false) => [{ kind: 'warmup' }, ...Array.from({ length: n }, () => ({ kind: 'work', done }))];
  const r = capSlots({ slots: upper, fullMinutes: 85, cap: 60 });

  it('een vers geopende sessie zegt hetzelfde als het inkorten', () => {
    const fresh = r.slots.map((s) => ({ slot: s.id, rows: rows(prescribedSets(s)) }));
    expect(capLineFor(r, fresh)).toBe(timeCapLine(r));
  });

  it('een concept dat de volle sets hield en een weggevallen oefening met afgevinkte sets: dan viel er niets weg', () => {
    const draft = upper.map((s) => ({ slot: s.id, rows: rows(s.sets, s.id === 'Triceps pushdown') }));
    expect(capLineFor(r, draft)).toBeUndefined();
  });

  it('alleen de weggevallen oefening staat er nog: de sets bijwerk blijven in de regel', () => {
    const draft = [...r.slots.map((s) => ({ slot: s.id, rows: rows(prescribedSets(s)) })), { slot: 'Triceps pushdown', rows: rows(3, true) }];
    expect(capLineFor(r, draft)).toBe('Ingekort tot ongeveer 75 minuten: 2 sets bijwerk vallen weg.');
  });
});

describe('met de tijd per set uit je eigen logs', () => {
  // Nagemaakte logs met de aantallen werksets en minuten uit de probe: 11, 20, 11 en 20 werksets in 45, 70, 49 en 110 min.
  const upperB = buildDefaultProgramData().templates.find((t) => t.id === 'tpl_upper_b')!;
  const log = (i: number, minutes: number, work: number): SessionLog => ({
    id: `b${i}`, templateId: 'tpl_upper_b', type: 'strength', completedDate: `2026-10-0${i}`, completedAt: `2026-10-0${i}T18:00:00Z`, variant: 'full', durationMinutes: minutes, source: 'manual',
    strengthData: [{ exerciseId: 'x', exerciseName: 'X', sets: [{ reps: 5, kind: 'warmup' }, ...Array.from({ length: work }, () => ({ reps: 8 }))] }],
  });
  const logs = [log(1, 45, 11), log(2, 70, 20), log(3, 49, 11), log(4, 110, 20)];

  it('Bovenlichaam B komt onder 60 uit met ingekorte sets, de kern blijft', () => {
    const perSet = learnedMinutesPerSet(upperB, logs);
    expect(perSet).toBeGreaterThan(4);
    expect(perSet).toBeLessThan(4.5);
    const slots = upperB.exercises!;
    const r = capSlots({ slots, fullMinutes: upperB.durationVariants.full, minutesPerSet: perSet, cap: 60 });
    expect(r.fromMinutes).toBeGreaterThan(90);
    expect(r.minutes).toBeLessThanOrEqual(60);
    expect(r.setsRemoved + r.dropped.length).toBeGreaterThan(0);
    for (const core of slots.filter((s) => s.priority === 'core')) expect(r.slots.find((s) => s.id === core.id)?.sets).toBe(core.sets);
    expect(timeCapLine(r)).toMatch(/^Ingekort tot ongeveer (55|60) minuten/);
  });

  it('ook met de pull-up als bijwerk, zoals in een opgeslagen sjabloon van voor deze wijziging', () => {
    const slots = upperB.exercises!.map((s) => (s.id === 'ex17' ? { ...s, priority: 'accessory' as const } : s));
    const r = capSlots({ slots, fullMinutes: 75, minutesPerSet: learnedMinutesPerSet(upperB, logs), cap: 60 });
    expect(r.minutes).toBeLessThanOrEqual(60);
    expect(r.slots.find((s) => s.id === 'ex17')?.sets).toBe(2);
  });
});
