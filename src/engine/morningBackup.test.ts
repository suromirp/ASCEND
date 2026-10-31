import { describe, expect, it } from 'vitest';
import { morningsForBackup, resolveMorningBackup } from './morningBackup';
import type { RecoveryMetric } from '../models/metrics';

const m = (date: string, extra: Partial<RecoveryMetric> = {}): RecoveryMetric => ({ id: `intervals.icu:${date}`, date, source: 'import', ...extra });

describe('ochtendgetallen in de back-up', () => {
  it('staat standaard aan, uit alleen als je hem uitzet', () => {
    expect(resolveMorningBackup(undefined)).toBe(true);
    expect(resolveMorningBackup({})).toBe(true);
    expect(resolveMorningBackup({ morningInBackup: false })).toBe(false);
  });

  it('neemt alleen datum, rusthartslag, HRV, slaapduur en slaapscore mee', () => {
    const out = morningsForBackup([m('2026-10-20', { restingHeartRate: 52, hrv: 61.5, sleepMinutes: 430, sleepScore: 81, bodyBattery: 70, stress: 20 })]);
    expect(out).toEqual([{ id: 'intervals.icu:2026-10-20', date: '2026-10-20', source: 'import', restingHeartRate: 52, hrv: 61.5, sleepMinutes: 430, sleepScore: 81 }]);
  });

  it('laat een ochtend zonder een van de vier getallen weg en sorteert op datum', () => {
    const out = morningsForBackup([m('2026-10-21', { hrv: 50 }), m('2026-10-19', { bodyBattery: 40 }), m('2026-10-20', { sleepMinutes: 400 })]);
    expect(out.map((r) => r.date)).toEqual(['2026-10-20', '2026-10-21']);
  });
});
