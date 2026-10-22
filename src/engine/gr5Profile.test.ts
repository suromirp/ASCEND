import { describe, it, expect } from 'vitest';
import type { TrainingGoal, GoalRequirement } from '../models/goals';
import { HUT_PACK_KG, TENT_PACK_KG, packWeightOf, tentPackProposal, tripShape, tripShapeNote, withPackWeight } from './gr5Profile';

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
