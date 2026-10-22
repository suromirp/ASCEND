import { describe, it, expect } from 'vitest';
import type { TrainingGoal, GoalRequirement } from '../models/goals';
import type { GoalMilestone, GoalMilestoneProgress } from '../models/goals';
import type { SessionLog } from '../models/training';
import { HUT_PACK_KG, PACK_MILESTONE_ID, TENT_PACK_KG, keepClearedMilestones, packMilestone, packMilestoneUpdate, packWeightOf, programPackTarget, tentPackProposal, tripShape, tripShapeNote, withPackWeight } from './gr5Profile';

const pack = (kg: number): GoalRequirement => ({ id: 'p1', kind: 'packWeight', scope: 'SINGLE_EVENT', target: { amount: kg, unit: 'kg' } });
const days = (n: number): GoalRequirement => ({ id: 'd1', kind: 'eventDays', scope: 'TOTAL_EVENT', target: { amount: n, unit: 'days' }, discipline: 'hiking' });

function goal(over: Partial<TrainingGoal> & { requirements: GoalRequirement[] }): TrainingGoal {
  return { id: 'g1', name: 'GR5', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', status: 'active', targetDate: '2027-08-01', ...over } as TrainingGoal;
}

describe('withPackWeight', () => {
  it('replaces the rucksack target and keeps its id and the other requirements', () => {
    const g = goal({ requirements: [days(30), pack(12)] });
    const next = withPackWeight(g, 14, '2026-10-21T10:00:00Z');
    expect(packWeightOf(next.requirements)).toBe(14);
    expect(next.requirements.find((r) => r.kind === 'packWeight')?.id).toBe('p1');
    expect(next.requirements.find((r) => r.kind === 'eventDays')?.target?.amount).toBe(30);
    expect(next.updatedAt).toBe('2026-10-21T10:00:00Z');
    // the input is never mutated
    expect(packWeightOf(g.requirements)).toBe(12);
  });
  it('adds one when there was none, and clears it on empty', () => {
    const g = goal({ requirements: [days(30)] });
    expect(packWeightOf(withPackWeight(g, 13.5).requirements)).toBe(13.5);
    expect(packWeightOf(withPackWeight(goal({ requirements: [pack(12)] }), undefined).requirements)).toBeUndefined();
    expect(packWeightOf(withPackWeight(goal({ requirements: [pack(12)] }), 0).requirements)).toBeUndefined();
  });
});

describe('tentPackProposal', () => {
  const ladder = new Set(['g1']);
  it('proposes 12 -> 14 for the main goal that still has the old default', () => {
    const p = tentPackProposal([goal({ requirements: [pack(HUT_PACK_KG)] })], ladder);
    expect(p).toEqual({ id: 'gr5-pack-tent:g1', goalId: 'g1', fromKg: 12, toKg: TENT_PACK_KG });
  });
  it('leaves any other number alone: you chose it', () => {
    expect(tentPackProposal([goal({ requirements: [pack(13)] })], ladder)).toBeUndefined();
    expect(tentPackProposal([goal({ requirements: [pack(14)] })], ladder)).toBeUndefined();
    expect(tentPackProposal([goal({ requirements: [pack(10)] })], ladder)).toBeUndefined();
  });
  it('does nothing without a rucksack target, for archived goals or goals without a ladder', () => {
    expect(tentPackProposal([goal({ requirements: [days(30)] })], ladder)).toBeUndefined();
    expect(tentPackProposal([goal({ requirements: [pack(12)], status: 'archived' })], ladder)).toBeUndefined();
    expect(tentPackProposal([goal({ requirements: [pack(12)] })], new Set())).toBeUndefined();
  });
});

describe('tripShape', () => {
  it('turns 30 walking days into 34 days with 4 rest days', () => {
    expect(tripShape(30)).toEqual({ walkingDays: 30, restDays: 4, totalDays: 34 });
  });
  it('stays inside the 32 to 35 days of the advice for 29 to 31 walking days', () => {
    for (const n of [29, 30, 31]) {
      const total = tripShape(n)!.totalDays;
      expect(total).toBeGreaterThanOrEqual(32);
      expect(total).toBeLessThanOrEqual(35);
    }
  });
  it('plans no rest days for a weekend or a week', () => {
    expect(tripShape(3)?.restDays).toBe(0);
    expect(tripShape(7)?.restDays).toBe(0);
  });
  it('is undefined without a usable day count', () => {
    expect(tripShape(undefined)).toBeUndefined();
    expect(tripShape(0)).toBeUndefined();
  });
});

describe('tripShapeNote', () => {
  it('explains rest days and the calm start for a long trip, without dashes', () => {
    const note = tripShapeNote(30)!;
    expect(note).toContain('34 dagen in totaal');
    expect(note).toContain('4 rustdagen');
    expect(note).toContain('60 tot 70%');
    expect(note).not.toMatch(/[–—]/);
  });
  it('says nothing for a short trip', () => {
    expect(tripShapeNote(3)).toBeUndefined();
    expect(tripShapeNote(undefined)).toBeUndefined();
  });
});

describe('programPackTarget', () => {
  const ms: GoalMilestone[] = [{ id: 'm', goalId: 'g1', order: 1, title: 'x', requirement: { kind: 'manual' } }];
  it('is the rucksack target of the main goal, and undefined without one', () => {
    expect(programPackTarget([goal({ requirements: [pack(16)] })], ms)).toBe(16);
    expect(programPackTarget([goal({ requirements: [days(30)] })], ms)).toBeUndefined();
    expect(programPackTarget([goal({ requirements: [pack(0)] })], ms)).toBeUndefined();
  });
  it('takes the goal with the ascent ladder, an active one first, and no archived goal', () => {
    const other = goal({ id: 'g2', requirements: [pack(9)] });
    expect(programPackTarget([other, goal({ requirements: [pack(15)] })], ms)).toBe(15);
    expect(programPackTarget([goal({ status: 'paused', targetDate: undefined, requirements: [pack(13)] })], ms)).toBe(13);
    expect(programPackTarget([goal({ status: 'archived', targetDate: undefined, requirements: [pack(13)] })], ms)).toBeUndefined();
  });
});

describe('milestone 11, the full rucksack hike', () => {
  const log = (id: string, kg: number, date: string, over: Partial<SessionLog> = {}): SessionLog => ({
    id, templateId: 'tpl_mountain_hike', type: 'hiking', completedDate: date, completedAt: `${date}T12:00:00Z`, variant: 'full', durationMinutes: 300,
    outdoorData: { durationMinutes: 300, distanceKm: 16, backpackWeightKg: kg, source: 'manual' }, source: 'manual', ...over,
  });
  const m11 = (kg: number): GoalMilestone => ({ id: PACK_MILESTONE_ID, goalId: 'g1', order: 11, ...packMilestone(kg) });
  let n = 0;
  const newId = () => `row${++n}`;

  it('is worded with the weight, in Dutch notation', () => {
    expect(packMilestone(14)).toEqual({ title: 'Volle rugzaktocht: 14 kg, 15 km', requirement: { kind: 'backpack', minWeightKg: 14, minKm: 15 } });
    expect(packMilestone(13.5).title).toBe('Volle rugzaktocht: 13,5 kg, 15 km');
  });

  it('gives a milestone reached under the old requirement a row, dated at the first tour that fit', () => {
    const rows = keepClearedMilestones([m11(12)], [m11(14)], [], [log('b', 12.5, '2026-10-02'), log('a', 12, '2026-09-01'), log('c', 11, '2026-08-01')], newId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ goalId: 'g1', milestoneId: PACK_MILESTONE_ID, clearedDate: '2026-09-01' });
    expect(rows[0].sourceSessionLogId).toBeUndefined();
  });

  it('adds nothing when it already has a row, was never reached, or is still reached', () => {
    const own: GoalMilestoneProgress = { id: 'p', goalId: 'g1', milestoneId: PACK_MILESTONE_ID, clearedDate: '2026-01-01' };
    expect(keepClearedMilestones([m11(12)], [m11(14)], [own], [log('a', 12, '2026-09-01')], newId)).toEqual([]);
    expect(keepClearedMilestones([m11(12)], [m11(14)], [], [log('a', 11, '2026-09-01')], newId)).toEqual([]);
    expect(keepClearedMilestones([m11(12)], [m11(14)], [], [log('a', 14.5, '2026-09-01')], newId)).toEqual([]);
    // A tour that was too hard or cut to its minimum never counted, so it is not kept either.
    expect(keepClearedMilestones([m11(12)], [m11(14)], [], [log('a', 12, '2026-09-01', { variant: 'minimum' })], newId)).toEqual([]);
  });

  it('updates the milestone to the weight of the goal, and not when it already fits or is something else', () => {
    const update = packMilestoneUpdate([m11(14)], [], [log('a', 14, '2026-09-01')], 'g1', 16, newId)!;
    expect(update.milestone).toMatchObject({ id: PACK_MILESTONE_ID, order: 11, title: 'Volle rugzaktocht: 16 kg, 15 km', requirement: { minWeightKg: 16 } });
    expect(update.keep).toHaveLength(1);
    expect(packMilestoneUpdate([m11(14)], [], [], 'g1', 14, newId)).toBeUndefined();
    expect(packMilestoneUpdate([m11(14)], [], [], 'other-goal', 16, newId)).toBeUndefined();
    expect(packMilestoneUpdate([{ ...m11(14), requirement: { kind: 'manual' } }], [], [], 'g1', 16, newId)).toBeUndefined();
  });
});
