// Het doel Vaardigheid rond middernacht in Nederland: de dag komt uit `todayISO()` (lokale tijd), nooit uit UTC.
// 22:59 UTC op 8 november is 23:59 in Amsterdam (nog 8 november); 23:00 UTC is 00:00 op 9 november.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { skillLadderById } from '../data/skillLadders';
import type { SessionLog } from '../models/training';
import { todayISO } from '../utils/dates';
import { clearedSkillSteps } from './skillGoal';
import { skillReadinessFor } from './goalReadinessFor';

const pull = skillLadderById('pull-up')!;
const training: SessionLog = {
  id: 'log_nacht', templateId: 'tpl_test', type: 'strength', completedDate: '2026-11-09', completedAt: '2026-11-08T23:10:00.000Z', variant: 'full', durationMinutes: 30, source: 'manual',
  strengthData: [{ exerciseId: 'pull-up', exerciseName: 'Pull-Up', sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] }],
};
const goal = { id: 'skill_n', name: 'Pull-Up', ladderId: 'pull-up', targetStep: 4, createdAt: '', updatedAt: '' };

afterEach(() => { vi.useRealTimers(); });

describe('een vaardigheid rond 00:00 Europe/Amsterdam', () => {
  it('om 23:59 telt een training van morgen nog niet', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T22:59:00.000Z'));
    expect(todayISO()).toBe('2026-11-08');
    expect(clearedSkillSteps(pull, [training], todayISO()).size).toBe(0);
    expect(skillReadinessFor(goal, [training], todayISO(), [])!.line).toBe('Nog geen training op deze ladder.');
  });

  it('om 00:00 is het de nieuwe dag en telt hij wel', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T23:00:00.000Z'));
    expect(todayISO()).toBe('2026-11-09');
    expect(clearedSkillSteps(pull, [training], todayISO()).get(4)).toBe('2026-11-09');
    expect(skillReadinessFor(goal, [training], todayISO(), [])!.reached).toBe(true);
  });
});
