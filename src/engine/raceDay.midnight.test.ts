// Racedag rond middernacht in Nederland: de dag komt uit `todayISO()` (lokale tijd), nooit uit UTC.
// 22:59 UTC op 19 maart 2027 is 23:59 in Amsterdam (nog de dag voor de race); 23:00 UTC is 00:00 op de racedag.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrainingGoal } from '../models/goals';
import { todayISO } from '../utils/dates';
import { raceDayMoment } from './raceDay';

const goal = {
  id: 'g', name: '10 km', status: 'active', targetDate: '2027-03-20', kind: 'run_race',
  requirements: [{ kind: 'distance', discipline: 'running', target: { amount: 10, unit: 'km' } }],
  createdAt: '', updatedAt: '',
} as TrainingGoal;

afterEach(() => { vi.useRealTimers(); });

describe('een race rond 00:00 Europe/Amsterdam', () => {
  it('om 23:59 is het nog morgen', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-03-19T22:59:00.000Z'));
    expect(raceDayMoment([goal], todayISO())).toMatchObject({ phase: 'before', days: 1 });
  });

  it('om 00:00 is het de racedag', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-03-19T23:00:00.000Z'));
    expect(raceDayMoment([goal], todayISO())).toMatchObject({ phase: 'today', days: 0 });
  });

  it('om 00:00 de dag erna begint de terugblik', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-03-20T23:00:00.000Z'));
    expect(raceDayMoment([goal], todayISO())).toMatchObject({ phase: 'after', days: -1 });
  });
});
