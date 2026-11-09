// Calisthenics in Forge (docs/beslissingen/2026-11-09-calisthenics-forge-rij.md): de rijen van een houding, een stap
// waar je naartoe tikte, wat naar het log gaat, het cijferblok en de nuance van de decline push-up. Nagemaakte data.

import { describe, expect, it } from 'vitest';
import { exerciseById } from '../data/exercises';
import { FAMILY } from '../data/exerciseFamilies';
import type { ExercisePrescription, SessionLog, SetLog } from '../models/training';
import { applySeconds, exerciseSummary, firstField, nextField, takeTarget, weightStepFor } from './forgeInput';
import { addRow, planExercise, planState, previousText, swapGroups, swapReasonSame, targetText, tickRow, toStrengthData, type PlanContext, type WorkoutExercise } from './forgeWorkout';
import { resolveStrengthSettings } from './strengthSettings';

const settings = resolveStrengthSettings(undefined);
const profile = settings.profile;
const ex = (id: string) => exerciseById(id)!;

let n = 0;
function log(date: string, sets: Record<string, SetLog[]>): SessionLog {
  n += 1;
  return {
    id: `log_${n}`,
    templateId: 'tpl_test',
    type: 'strength',
    completedDate: date,
    completedAt: `${date}T10:00:00.000Z`,
    variant: 'full',
    durationMinutes: 40,
    source: 'manual',
    strengthData: Object.entries(sets).map(([exerciseId, s]) => ({ exerciseId, exerciseName: ex(exerciseId).name, sets: s })),
  };
}

const ctx = (logs: SessionLog[] = [], over: Partial<PlanContext> = {}): PlanContext => ({ logs, templates: [], program: null, bodyKg: 75, settings, date: '2026-11-20', modelOn: true, ...over });
const slot = (id: string, exerciseName: string, sets: number, reps: string): ExercisePrescription => ({ id, exerciseName, sets, reps, priority: 'core' });
const plan = (s: ExercisePrescription, c: PlanContext, swapTo?: string) => planExercise(s, c, planState(c), swapTo ? ex(swapTo) : undefined);

describe('een houding in Forge', () => {
  it('Dead Hang krijgt een eigen houdingsrij: seconden, geen RIR, geen timed', () => {
    const e = plan(slot('h', 'Dead Hang', 3, '30s'), ctx());
    expect(e.hold).toBe(true);
    expect(e.timed).toBe(false);
    expect(e.rows.filter((r) => r.kind === 'work')).toHaveLength(3);
    for (const r of e.rows) {
      expect(r.target.holdSec).toBe(10);
      expect(r.seconds).toBe(10);
      expect(r.target.rir).toBeUndefined();
      expect(r.rir).toBeUndefined();
    }
    expect(targetText(e.rows[0], ex('dead-hang'))).toBe('10 sec');
  });

  it('een gewone timed oefening (plank) blijft zoals hij was', () => {
    const e = plan(slot('p', 'Plank', 3, '45s'), ctx());
    expect(e.timed).toBe(true);
    expect(e.hold).toBeUndefined();
  });

  it('het voorschrift is je laatste keer op deze stap, hoogstens de toets', () => {
    const logs = [log('2026-11-10', { 'support-hold': [{ reps: 1, seconds: 20 }, { reps: 1, seconds: 25 }] })];
    expect(plan(slot('h', 'Parallel Bar Support Hold', 3, '30s'), ctx(logs)).rows[0].seconds).toBe(25);
    const long = [log('2026-11-10', { 'support-hold': [{ reps: 1, seconds: 50 }] })];
    expect(plan(slot('h', 'Parallel Bar Support Hold', 3, '30s'), ctx(long)).rows[0].seconds).toBe(30);
  });

  it('afvinken zonder invullen neemt het voorschrift over; naar het log als seconds met reps 1, zonder RIR', () => {
    const e = plan(slot('h', 'Dead Hang', 2, '30s'), ctx());
    const empty: WorkoutExercise = { ...e, rows: e.rows.map((r) => ({ ...r, seconds: undefined })) };
    const ticked = tickRow([empty], 'h', empty.rows[0].id).workout;
    expect(ticked[0].rows[0].seconds).toBe(10);
    const typed = applySeconds(ticked[0], ticked[0].rows[1].id, 27);
    const done = tickRow([typed], 'h', typed.rows[1].id).workout;
    const out = toStrengthData(done)!;
    expect(out[0].exerciseId).toBe('dead-hang');
    expect(out[0].sets).toEqual([
      expect.objectContaining({ reps: 1, seconds: 10, kind: 'work' }),
      expect.objectContaining({ reps: 1, seconds: 27, kind: 'work' }),
    ]);
    for (const s of out[0].sets) {
      expect(s.rir).toBeUndefined();
      expect(s.rirAssumed).toBeUndefined();
    }
  });

  it('Set toevoegen houdt de seconden; Voorschrift overnemen zet de seconden terug; de samenvatting telt sets', () => {
    const e = plan(slot('h', 'Dead Hang', 2, '30s'), ctx());
    const more = addRow(applySeconds(e, e.rows[1].id, 40), 'work');
    expect(more.rows.at(-1)!.seconds).toBe(40);
    expect(takeTarget(applySeconds(e, e.rows[0].id, 40), e.rows[0].id).rows[0].seconds).toBe(10);
    expect(applySeconds(e, e.rows[0].id, 99999).rows[0].seconds).toBe(3600);
    expect(exerciseSummary({ ...e, rows: e.rows.map((r) => ({ ...r, done: true })) })).toBe('2 sets');
    expect(previousText({ reps: 1, seconds: 25 })).toBe('25 sec');
  });

  it('het cijferblok gaat in een houding van seconden naar de seconden van de volgende set', () => {
    const h = plan(slot('h', 'Dead Hang', 2, '30s'), ctx());
    const p = plan(slot('p', 'Push-Up', 2, '8-12'), ctx());
    expect(firstField(h)).toBe('seconds');
    expect(nextField([h, p], { slot: 'h', rowId: h.rows[0].id, field: 'seconds' })).toEqual({ slot: 'h', rowId: h.rows[1].id, field: 'seconds' });
    expect(nextField([p, h], { slot: 'p', rowId: p.rows.at(-1)!.id, field: 'reps' })).toEqual({ slot: 'h', rowId: h.rows[0].id, field: 'seconds' });
  });
});

describe('een tik naar een andere stap (Ruilen)', () => {
  it('Push-Up naar Diamond: het aantal sets blijft, het doel is 5, de kop zegt voor Push-Up', () => {
    const s = slot('p', 'Push-Up', 3, '8-12');
    const e = plan(s, ctx(), 'diamond-push-up');
    expect(e.exerciseId).toBe('diamond-push-up');
    expect(e.swappedFrom).toBe('Push-Up');
    expect(e.rows.filter((r) => r.kind === 'work')).toHaveLength(3);
    expect(e.rows.every((r) => r.reps === 5 && r.target.repsLow === 5 && r.target.repsHigh === 5)).toBe(true);
  });

  it('je herhalingen van de vorige stap gaan niet mee; die van je laatste keer op de nieuwe stap wel', () => {
    const logs = [log('2026-11-10', { 'push-up': [{ reps: 12 }, { reps: 12 }], 'diamond-push-up': [{ reps: 7 }, { reps: 6 }] })];
    const e = plan(slot('p', 'Push-Up', 3, '8-12'), ctx(logs), 'diamond-push-up');
    expect(e.rows[0].reps).toBe(7);
  });

  it('een andere meeteenheid bouwt de rij opnieuw: Dead Hang naar Scapular Pull-Up en terug', () => {
    const s = slot('h', 'Dead Hang', 3, '30s');
    const reps = plan(s, ctx(), 'scapular-pull-up');
    expect(reps.hold).toBeUndefined();
    expect(reps.rows[0].reps).toBe(5);
    expect(reps.rows[0].seconds).toBeUndefined();
    const back = plan(slot('s', 'Scapular Pull-Up', 3, '8'), ctx(), 'dead-hang');
    expect(back.hold).toBe(true);
    expect(back.rows[0].seconds).toBe(10);
  });

  it('naar de stap met extra gewicht: 2,5 kg, in stappen van 2,5', () => {
    const e = plan(slot('pu', 'Pull-Up', 3, '5-8'), ctx(), 'weighted-pull-up');
    expect(e.rows[0]).toMatchObject({ weightKg: 2.5, reps: 5 });
    expect(weightStepFor(ex('weighted-pull-up'), profile)).toBe(2.5);
    expect(weightStepFor(ex('weighted-dip'), profile)).toBe(2.5);
  });
});

describe('de band op Pull-Up en Dip', () => {
  const logs = [log('2026-11-10', { 'pull-up': [{ reps: 6, band: 'middel' }, { reps: 5, band: 'middel' }] })];
  it('de band van je vorige keer staat klaar op de werksets en gaat naar het log', () => {
    const e = plan(slot('pu', 'Pull-Up', 2, '5-8'), ctx(logs));
    const work = e.rows.filter((r) => r.kind === 'work');
    expect(work.every((r) => r.band === 'middel')).toBe(true);
    const done = tickRow([e], 'pu', work[0].id).workout;
    expect(toStrengthData(done)![0].sets.find((s) => s.kind === 'work')!.band).toBe('middel');
  });

  it('met de instelling uit (of Stappen uit) staat er geen band klaar', () => {
    for (const over of [{ askBand: false }, { ladderRow: false }]) {
      const e = plan(slot('pu', 'Pull-Up', 2, '5-8'), ctx(logs, { settings: resolveStrengthSettings(over) }));
      expect(e.rows.some((r) => r.band !== undefined)).toBe(false);
    }
  });

  it('"Ging het netjes?" gaat als clean naar het log; leeg blijft leeg', () => {
    const e = plan(slot('p', 'Push-Up', 2, '8-12'), ctx());
    const rows = e.rows.filter((r) => r.kind === 'work');
    const marked: WorkoutExercise = { ...e, rows: e.rows.map((r) => (r.id === rows[0].id ? { ...r, done: true, clean: false } : r.id === rows[1].id ? { ...r, done: true } : r)) };
    const sets = toStrengthData([marked])![0].sets.filter((s) => s.kind === 'work');
    expect(sets[0].clean).toBe(false);
    expect('clean' in sets[1]).toBe(false);
  });
});

describe('de nuance van de decline push-up', () => {
  it('Push-Up naar Decline Push-Up zegt "met je voeten verhoogd"; de split squat houdt "met je voet verhoogd"', () => {
    expect(swapReasonSame(ex('push-up'), ex('decline-push-up'))).toBe('Zelfde beweging en spieren, met je voeten verhoogd.');
    expect(swapReasonSame(ex('decline-push-up'), ex('push-up'))).toBe('Zelfde beweging en spieren, met je voeten op de grond.');
    expect(swapReasonSame(ex('split-squat'), ex('bulgarian-split-squat'))).toBe('Zelfde beweging en spieren, met je voet verhoogd.');
  });

  it('de ruillijst van elk lid van de push-upfamilie blijft volledig; de decline push-up heet overal voeten, nooit voet', () => {
    const members = [...FAMILY.entries()].filter(([, f]) => f === 'push_up').map(([id]) => id);
    for (const id of members) {
      const same = swapGroups(ex(id), profile, [], 50).same;
      expect(same.map((s) => s.exercise.id).sort(), id).toEqual(members.filter((m) => m !== id).sort());
      const decline = same.find((s) => s.exercise.id === 'decline-push-up');
      if (decline) expect(decline.reason, id).toContain('met je voeten verhoogd');
      for (const s of same) expect(s.reason, `${id} naar ${s.exercise.id}`).not.toMatch(/met je voet (verhoogd|op de grond)/);
    }
  });
});
