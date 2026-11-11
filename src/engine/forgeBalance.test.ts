// Enkel en evenwicht in Forge (docs/beslissingen/2026-11-11-enkel-evenwicht.md): de nieuwe oefeningen volgen de
// bestaande regels. Een houding krijgt seconden en je beste tijd van de vorige keer, reiken gaat in herhalingen, en
// Ruilen houdt ze binnen hun familie. Nagemaakte data.

import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById } from '../data/exercises';
import type { ExercisePrescription, SessionLog, SetLog } from '../models/training';
import { addedSlotsFor } from './addedExercises';
import { guideLinks } from './exerciseGuide';
import { planExercise, planState, swapGroups, type PlanContext } from './forgeWorkout';
import { resolveStrengthSettings } from './strengthSettings';

const settings = resolveStrengthSettings(undefined);
const ex = (id: string) => exerciseById(id)!;

function log(date: string, sets: Record<string, SetLog[]>): SessionLog {
  return {
    id: `l-${date}`, templateId: 'tpl_lower_a', type: 'strength', completedDate: date, completedAt: `${date}T10:00:00.000Z`, variant: 'full', durationMinutes: 50, source: 'manual',
    strengthData: Object.entries(sets).map(([exerciseId, s]) => ({ exerciseId, exerciseName: ex(exerciseId).name, sets: s })),
  };
}
const ctx = (logs: SessionLog[] = []): PlanContext => ({ logs, templates: [], program: null, bodyKg: 75, settings, date: '2026-11-20', modelOn: true });
const added = (id: string): ExercisePrescription => addedSlotsFor({ addedExercises: { tpl_lower_a: [id] } }, 'tpl_lower_a')[0];

describe('enkel en evenwicht in Forge', () => {
  it('op één been staan, toegevoegd na Akkoord: drie houdingen van 10 seconden, zonder RIR en zonder gewicht', () => {
    const slot = added('single-leg-stance');
    expect(slot).toMatchObject({ id: 'plus:single-leg-stance', sets: 3, priority: 'accessory' });
    const e = planExercise(slot, ctx(), planState(ctx()));
    expect(e.hold).toBe(true);
    const work = e.rows.filter((r) => r.kind === 'work');
    expect(work).toHaveLength(3);
    for (const r of work) {
      expect(r.target.holdSec).toBe(10);
      expect(r.target.rir).toBeUndefined();
      expect(r.weightKg).toBeUndefined();
    }
  });

  it('de volgende keer je beste tijd van de vorige keer: zo groeit het vanzelf', () => {
    const logs = [log('2026-11-13', { 'single-leg-stance': [{ reps: 1, seconds: 30 }, { reps: 1, seconds: 40 }] })];
    const e = planExercise(added('single-leg-stance'), ctx(logs), planState(ctx(logs)));
    expect(e.rows[0].target.holdSec).toBe(40);
  });

  it('reiken op één been gaat in herhalingen, zonder gewicht', () => {
    const e = planExercise({ id: 'r', exerciseName: 'Star Excursion Reach', sets: 3, reps: '4-6', priority: 'accessory' }, ctx(), planState(ctx()));
    expect(e.hold).toBeUndefined();
    expect(e.timed).toBe(false);
    expect(e.rows.filter((r) => r.kind === 'work').every((r) => r.weightKg === undefined || r.weightKg === 0)).toBe(true);
  });

  it('Ruilen: evenwicht alleen binnen de familie, nooit bij een kuitheffing', () => {
    const balance = EXERCISES.filter((e) => e.pattern === 'balance').map((e) => e.id);
    expect(balance).toEqual(['single-leg-stance', 'single-leg-stance-eyes-closed', 'single-leg-stance-cushion', 'star-excursion-reach']);
    const fromStance = swapGroups(ex('single-leg-stance'), settings.profile, [], 50).same.map((s) => s.exercise.id);
    expect(fromStance).toEqual(expect.arrayContaining(['single-leg-stance-eyes-closed', 'single-leg-stance-cushion', 'star-excursion-reach']));
    const fromCalf = swapGroups(ex('single-leg-calf-raise'), settings.profile, [], 50);
    expect([...fromCalf.same.map((s) => s.exercise.id), ...fromCalf.other.map((e) => e.id)].filter((id) => balance.includes(id))).toEqual([]);
  });

  it('Zwaarder in de uitleg: ogen dicht, dan een kussen; reiken leidt terug naar staan', () => {
    expect(guideLinks(ex('single-leg-stance').guide!, exerciseById).harder?.id).toBe('single-leg-stance-eyes-closed');
    expect(guideLinks(ex('single-leg-stance-eyes-closed').guide!, exerciseById).harder?.id).toBe('single-leg-stance-cushion');
    expect(guideLinks(ex('star-excursion-reach').guide!, exerciseById).easier?.id).toBe('single-leg-stance');
  });
});
