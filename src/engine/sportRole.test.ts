import { describe, expect, it } from 'vitest';
import { parseSportHandling, sportCounts, sportRole } from './sportRole';
import { assumedRpe, feltWordOf, FELT_RPE, sessionLoad } from './sessionLoad';
import { migrateLogRpeAssumed, migrateSportHandling } from '../storage/migrations';
import type { SessionLog } from '../models/training';

describe('sportRole', () => {
  it('zonder keuze de oude instelling: aan is plannen, uit doet niet mee', () => {
    expect(sportRole({}, 'running')).toBe('plan');
    expect(sportRole({}, 'hiking')).toBe('plan');
    expect(sportRole({}, 'cycling')).toBe('off');
    expect(sportRole({ enabledSports: { running: false, hiking: true, cycling: true } }, 'running')).toBe('off');
    expect(sportRole({ enabledSports: { running: true, hiking: true, cycling: true } }, 'cycling')).toBe('plan');
  });

  it('een sport die ASCEND niet plant heeft zonder keuze nog geen rol en telt niet mee', () => {
    expect(sportRole({}, 'padel')).toBeUndefined();
    expect(sportCounts({}, 'padel')).toBe(false);
  });

  it('je keuze gaat voor', () => {
    const settings = { sportHandling: { padel: { role: 'count' }, cycling: { role: 'count' } } };
    expect(sportRole(settings, 'padel')).toBe('count');
    expect(sportRole(settings, 'cycling')).toBe('count');
    expect(sportCounts(settings, 'padel')).toBe(true);
    expect(sportCounts({ sportHandling: { football: { role: 'off' } } }, 'football')).toBe(false);
  });
});

describe('parseSportHandling', () => {
  it('houdt bekende sporten met een rol die ze kennen, en echte vaste afspraken', () => {
    const raw = {
      football: { role: 'fixed', fixed: [{ day: 6, minutes: 90, intensity: 'high' }, { day: 2, minutes: 60, intensity: 'moderate' }] },
      padel: { role: 'plan' },
      tennis: { role: 'count' },
      swimming: { role: 'count', fixed: [{ day: 1, minutes: 45, intensity: 'low' }] },
    };
    const { value, skipped } = parseSportHandling(raw);
    expect(value).toEqual({
      football: { role: 'fixed', fixed: [{ day: 2, minutes: 60, intensity: 'moderate' }, { day: 6, minutes: 90, intensity: 'high' }] },
      swimming: { role: 'count' },
    });
    // padel kan ASCEND niet plannen, tennis bestaat niet.
    expect(skipped).toBe(2);
  });

  it('een kapotte afspraak of een dubbele dag valt weg', () => {
    const { value, skipped } = parseSportHandling({ football: { role: 'fixed', fixed: [{ day: 9, minutes: 60, intensity: 'high' }, { day: 2, minutes: 60, intensity: 'high' }, { day: 2, minutes: 30, intensity: 'low' }] } });
    expect(value).toEqual({ football: { role: 'fixed', fixed: [{ day: 2, minutes: 60, intensity: 'high' }] } });
    expect(skipped).toBe(2);
  });

  it('afwezig is niets, onzin telt als overgeslagen', () => {
    expect(parseSportHandling(undefined)).toEqual({ value: undefined, skipped: 0 });
    expect(parseSportHandling('voetbal')).toEqual({ value: undefined, skipped: 1 });
    expect(migrateSportHandling({ running: { role: 'off' } })).toEqual({ value: { running: { role: 'off' } }, skipped: 0 });
  });
});

describe('sessionLoad', () => {
  const log = (over: Partial<SessionLog>) => ({ durationMinutes: 60, ...over });

  it('minuten maal hoe zwaar het voelde', () => {
    expect(sessionLoad(log({ rpe: 5 }), 'moderate')).toEqual({ load: 300, rpe: 5, assumed: false });
  });

  it('zonder RPE neemt het de zwaarte aan, een punt hoger aan de veilige kant', () => {
    expect(assumedRpe('moderate')).toBe(6);
    expect(sessionLoad(log({}), 'moderate')).toEqual({ load: 420, rpe: 7, assumed: true });
    expect(sessionLoad(log({ rpe: 5, rpeAssumed: true }), 'moderate')).toEqual({ load: 360, rpe: 6, assumed: true });
    expect(sessionLoad(log({ rpe: 10, rpeAssumed: true }), 'high').rpe).toBe(10);
  });

  it('de vier woorden zetten 3, 5, 7 en 9', () => {
    expect(Object.values(FELT_RPE)).toEqual([3, 5, 7, 9]);
    expect(feltWordOf(6)).toBe('pittig');
    expect(feltWordOf(9)).toBe('heel-zwaar');
  });
});

describe('migrateLogRpeAssumed', () => {
  const base = { id: 'l', templateId: 't', type: 'cardio', completedDate: '2026-10-26', completedAt: '2026-10-26T10:00:00.000Z', variant: 'full', durationMinutes: 40, source: 'manual' } as SessionLog;
  it('houdt alleen true over, een oud log blijft zoals het was', () => {
    expect(migrateLogRpeAssumed(base)).toBe(base);
    expect(migrateLogRpeAssumed({ ...base, rpeAssumed: true })).toEqual({ ...base, rpeAssumed: true });
    expect(migrateLogRpeAssumed({ ...base, rpeAssumed: 'ja' } as unknown as SessionLog)).toEqual(base);
  });
});
