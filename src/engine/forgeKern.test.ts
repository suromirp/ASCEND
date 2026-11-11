// Besluit 2026-11-11-forge-kern-zichtbaar: de rol per oefening, de regel onder de klok, niet inkorten als advies en
// afronden met open bijwerk dat niet als gemist telt. Alles nagemaakt.
import { describe, expect, it } from 'vitest';
import type { ExercisePrescription, ExercisePriority, PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { capSlots, overTimeLine, referenceMinutes, resolveTimeCap, roleLabel } from './forgeTimeCap';
import { cleanSettings } from '../storage/backupClean';
import { deriveSessionStatus } from './sessionStatus';
import { buildWeekReview } from './weekReview';
import { planMissed, MISSED_ADVICE } from './missedTraining';
import { strengthCount } from './weekBudget';

const slot = (id: string, priority: ExercisePriority, sets: number): ExercisePrescription => ({ id, exerciseName: id, sets, reps: '8-10', priority });
const upper = [slot('Bankdrukken', 'core', 3), slot('Roeien', 'core', 3), slot('Schouderdrukken', 'accessory', 3), slot('Triceps pushdown', 'optional', 2)];
const template = (lowerBodyLoad: 'heavy' | 'light'): SessionTemplate => ({
  id: 'tpl_eigen', name: 'Eigen', type: 'strength', durationVariants: { full: 90 }, exercises: upper,
  baseStressProfile: { lowerBodyLoad, impact: 'none', eccentricLoad: 'light', intensity: 'moderate' },
} as SessionTemplate);

describe('de rol bij de oefening', () => {
  it('Kern, Bijwerk en Extra uit één functie', () => {
    expect((['core', 'accessory', 'optional'] as const).map(roleLabel)).toEqual(['Kern', 'Bijwerk', 'Extra']);
  });
});

describe('niet inkorten als advies', () => {
  it('zonder keuze blijft de hele training staan, ook als hij langer duurt dan 60 minuten', () => {
    const cap = resolveTimeCap(undefined);
    const r = capSlots({ slots: upper, fullMinutes: 110, cap: cap.strength });
    expect(r.slots).toEqual(upper);
    expect(r.setsRemoved).toBe(0);
    expect(r.dropped).toEqual([]);
  });
  it('een gekozen grens kort nog in', () => {
    const r = capSlots({ slots: upper, fullMinutes: 110, cap: 60 });
    expect(r.setsRemoved + r.dropped.length).toBeGreaterThan(0);
  });
  it('de referentie: 60, een beendag 75, een gekozen grens gaat voor, en geen krachttraining heeft er geen', () => {
    const none = resolveTimeCap(undefined);
    expect(referenceMinutes(template('light'), none)).toBe(60);
    expect(referenceMinutes(template('heavy'), none)).toBe(75);
    expect(referenceMinutes(template('light'), resolveTimeCap({ forgeCapStrength: 45 }))).toBe(45);
    expect(referenceMinutes({ ...template('light'), type: 'cardio' } as SessionTemplate, none)).toBe(0);
  });
  it('een oude back-up met 0, 60 of zonder veld: 0 en zonder veld zijn het advies, 60 blijft inkorten, rommel valt weg', () => {
    const read = (raw: Record<string, unknown>) => {
      const skipped = { n: 0 };
      return { s: resolveTimeCap(cleanSettings(raw, skipped)), skipped: skipped.n };
    };
    expect(read({ forgeCapStrength: 0, forgeCapLegs: 0 }).s).toEqual({ strength: 0, legs: 0 });
    expect(read({ forgeCapStrength: 60, forgeCapLegs: 75 }).s).toEqual({ strength: 60, legs: 75 });
    expect(read({}).s).toEqual({ strength: 0, legs: 0 });
    expect(read({ forgeCapStrength: 61 })).toEqual({ s: { strength: 0, legs: 0 }, skipped: 1 });
  });
});

describe('de regel onder de klok', () => {
  const rows = (n: number, done: number) => Array.from({ length: n }, (_, i) => ({ kind: 'work', done: i < done }));
  const prio: Record<string, ExercisePriority> = { a: 'core', b: 'core', c: 'accessory', d: 'optional' };
  const priorityOf = (s: string) => prio[s];
  const workout = (doneB: number, doneC: number, doneD: number) => [
    { slot: 'a', rows: [{ kind: 'warmup', done: false }, ...rows(3, 3)] },
    { slot: 'b', rows: rows(3, doneB) },
    { slot: 'c', rows: rows(3, doneC) },
    { slot: 'd', rows: rows(2, doneD) },
  ];
  const at = (min: number) => min * 60 + 30;

  it('over de referentie, kern af en bijwerk en extra open', () => {
    expect(overTimeLine({ activeSec: at(64), reference: 60, exercises: workout(3, 1, 0), priorityOf })).toBe('Je zit op 64 minuten. Wat nog komt is bijwerk en extra; stoppen kan.');
  });
  it('noemt alleen wat nog open is', () => {
    expect(overTimeLine({ activeSec: at(61), reference: 60, exercises: workout(3, 3, 0), priorityOf })).toBe('Je zit op 61 minuten. Wat nog komt is extra; stoppen kan.');
    expect(overTimeLine({ activeSec: at(61), reference: 60, exercises: workout(3, 2, 2), priorityOf })).toBe('Je zit op 61 minuten. Wat nog komt is bijwerk; stoppen kan.');
  });
  it('niet op of onder de referentie (actieve tijd: pauzes tellen niet)', () => {
    expect(overTimeLine({ activeSec: 60 * 60, reference: 60, exercises: workout(3, 0, 0), priorityOf })).toBeUndefined();
    expect(overTimeLine({ activeSec: at(59), reference: 60, exercises: workout(3, 0, 0), priorityOf })).toBeUndefined();
  });
  it('kern niet klaar maar tijd om: geen regel', () => {
    expect(overTimeLine({ activeSec: at(80), reference: 60, exercises: workout(2, 0, 0), priorityOf })).toBeUndefined();
  });
  it('niets meer open behalve kern, of alles af: geen regel', () => {
    expect(overTimeLine({ activeSec: at(80), reference: 60, exercises: workout(2, 3, 2), priorityOf })).toBeUndefined();
    expect(overTimeLine({ activeSec: at(80), reference: 60, exercises: workout(3, 3, 2), priorityOf })).toBeUndefined();
  });
  it('een opwarmset die open staat telt niet als open', () => {
    expect(overTimeLine({ activeSec: at(70), reference: 60, exercises: [{ slot: 'a', rows: [{ kind: 'warmup', done: false }, ...rows(2, 2)] }, { slot: 'c', rows: rows(2, 0) }], priorityOf })).toContain('bijwerk');
  });
});

describe('afronden met open bijwerk of extra telt niet als gemist', () => {
  const { templates } = buildDefaultProgramData();
  const W = '2026-10-26';
  const planned: PlannedSession = { id: 'ua', templateId: 'tpl_upper_a', scheduledDate: '2026-10-27', weekStartDate: W, status: 'planned', order: 0 };
  // Alleen de kern afgevinkt: twee oefeningen, het bijwerk staat niet in het log.
  const log: SessionLog = {
    id: 'l-ua', plannedSessionId: 'ua', templateId: 'tpl_upper_a', type: 'strength', completedDate: '2026-10-27', completedAt: '2026-10-27T18:00:00Z',
    variant: 'full', durationMinutes: 66, source: 'manual',
    strengthData: [{ exerciseName: 'Bench Press', sets: [{ reps: 8, weightKg: 60, rir: 2, rirAssumed: true }, { reps: 8, weightKg: 60, rir: 2, rirAssumed: true }] }],
  } as SessionLog;

  it('de training is gedaan', () => {
    expect(deriveSessionStatus(planned, [log]).status).toBe('completed');
  });
  it('niet in de weekterugblik als blijven liggen', () => {
    const review = buildWeekReview({ weekStart: W, plannedSessions: [planned], logs: [log], templates, program: { id: 'p', name: 'P', startDate: '2026-10-19', phases: [{ id: 'f', name: 'BASISFASE', order: 1, weekCount: 4 }] }, planChangeLog: [], asOf: '2026-11-02' })!;
    expect(review.done).toBe(1);
    expect(review.missed).toEqual([]);
  });
  it('geen vraag "Niet gedaan?" en telt mee in het weekbudget', () => {
    expect(planMissed({ plannedSessions: [planned], logs: [log], templates, today: '2026-10-30', settings: MISSED_ADVICE, memory: {} }).item).toBeUndefined();
    expect(strengthCount([log], W)).toBe(1);
  });
});
