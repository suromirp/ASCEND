import { describe, expect, it } from 'vitest';
import type { TrainingGoal } from '../models/goals';
import { isMarathonGoal, mainGoal } from './mainGoal';

const base = { requirements: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const goal = (id: string, status: TrainingGoal['status'], name = id): TrainingGoal =>
  status === 'active' ? { ...base, id, name, status, targetDate: '2027-01-01' } : { ...base, id, name, status };

describe('mainGoal', () => {
  const goals = [goal('a', 'paused'), goal('b', 'active'), goal('c', 'archived')];

  it('vindt het actieve doel met een ladder', () => {
    expect(mainGoal(goals, [{ goalId: 'b' }])?.id).toBe('b');
  });

  it('negeert een actief doel zonder ladder', () => {
    expect(mainGoal(goals, [{ goalId: 'a' }])).toBeUndefined();
  });

  it('live telt een gepauzeerd doel mee maar geen gearchiveerd doel', () => {
    expect(mainGoal(goals, [{ goalId: 'a' }], 'live')?.id).toBe('a');
    expect(mainGoal(goals, [{ goalId: 'c' }], 'live')).toBeUndefined();
  });

  it('activeFirst geeft het actieve doel voor het gepauzeerde', () => {
    expect(mainGoal(goals, [{ goalId: 'a' }, { goalId: 'b' }], 'activeFirst')?.id).toBe('b');
    expect(mainGoal(goals, [{ goalId: 'a' }], 'activeFirst')?.id).toBe('a');
  });

  it('neemt ook een verzameling id\'s aan', () => {
    expect(mainGoal(goals, new Set(['b']))?.id).toBe('b');
  });

  it('geeft niets zonder doelen', () => {
    expect(mainGoal([], [{ goalId: 'b' }])).toBeUndefined();
  });
});

describe('isMarathonGoal', () => {
  it('herkent het marathondoel op naam', () => {
    expect(isMarathonGoal({ name: 'Marathon' })).toBe(true);
    expect(isMarathonGoal({ name: 'Halve' })).toBe(false);
  });
});
