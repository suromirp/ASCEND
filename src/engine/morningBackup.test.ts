import { describe, expect, it } from 'vitest';
import { archiveToClear, isBackupOnly, morningsForBackup, morningsToPutBack, planRetire, resolveMorningBackup } from './morningBackup';
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

describe('een ochtend die de cache verlaat (retire)', () => {
  it('herkent een ochtend die al alleen de back-upvelden heeft', () => {
    expect(isBackupOnly(m('2026-10-20', { restingHeartRate: 52, hrv: 61 }))).toBe(true);
    expect(isBackupOnly(m('2026-10-20', { restingHeartRate: 52, bodyBattery: 70 }))).toBe(false);
    expect(isBackupOnly(m('2026-10-20', { restingHeartRate: 52, stress: undefined }))).toBe(true);
  });

  it('slaat een ochtend over die al alleen de back-upvelden heeft, en schrijft niets dubbel', () => {
    const plan = planRetire([m('2026-10-20', { restingHeartRate: 52 }), m('2026-10-21', { hrv: 50, bodyBattery: 40 })], true);
    expect(plan.remove).toEqual([]);
    expect(plan.put).toEqual([{ id: 'intervals.icu:2026-10-21', date: '2026-10-21', source: 'import', hrv: 50 }]);
  });

  it('haalt een ochtend zonder een van de vier getallen helemaal weg', () => {
    const plan = planRetire([m('2026-10-19', { bodyBattery: 40 })], true);
    expect(plan).toEqual({ remove: ['intervals.icu:2026-10-19'], put: [] });
  });

  it('haalt alles weg als de ochtenden niet in de back-up gaan, ook wat al kaal was', () => {
    const plan = planRetire([m('2026-10-20', { restingHeartRate: 52 }), m('2026-10-21', { hrv: 50, bodyBattery: 40 })], false);
    expect(plan).toEqual({ remove: ['intervals.icu:2026-10-20', 'intervals.icu:2026-10-21'], put: [] });
  });

  it('een tweede keer opruimen doet niets meer', () => {
    const first = planRetire([m('2026-10-21', { hrv: 50, bodyBattery: 40 })], true);
    expect(planRetire(first.put, true)).toEqual({ remove: [], put: [] });
  });
});

describe('uitzetten zonder koppeling', () => {
  const hand: RecoveryMetric = { id: 'hand-1', date: '2026-10-18', source: 'manual', restingHeartRate: 50 };
  const records = [m('2026-10-20', { restingHeartRate: 52 }), hand, m('2026-10-21', { hrv: 50 })];

  it('ruimt alleen de opgehaalde ochtenden op, nooit wat je zelf invulde', () => {
    expect(archiveToClear(records, { connected: false, fetchedPrefix: 'intervals.icu:' }).map((r) => r.id)).toEqual(['intervals.icu:2026-10-20', 'intervals.icu:2026-10-21']);
  });

  it('ruimt niets op zolang er een koppeling is die ze opnieuw kan leveren', () => {
    expect(archiveToClear(records, { connected: true, fetchedPrefix: 'intervals.icu:' })).toEqual([]);
  });

  it('Ongedaan maken zet alleen terug wat er nu niet staat', () => {
    const removed = [m('2026-10-20', { restingHeartRate: 52 }), m('2026-10-21', { hrv: 50 })];
    const now = [m('2026-10-21', { hrv: 55 })];
    expect(morningsToPutBack(removed, now).map((r) => r.id)).toEqual(['intervals.icu:2026-10-20']);
  });
});
