import { describe, expect, it } from 'vitest';
import { logDay, logsInRange, plannedByIdOf, withoutLog } from './logDay';

const planned = plannedByIdOf([{ id: 'p1', scheduledDate: '2026-10-29' }, { id: 'p2', scheduledDate: '2026-11-05' }]);
const mf = { source: 'macrofactor' as const };

describe('logDay', () => {
  it('neemt de dag van de geplande training als een MacroFactor-log een dag eerder staat', () => {
    expect(logDay({ completedDate: '2026-10-28', plannedSessionId: 'p1', ...mf }, planned)).toBe('2026-10-29');
  });
  it('houdt de eigen datum bij een handmatige log of een horlogelog', () => {
    expect(logDay({ completedDate: '2026-10-28', plannedSessionId: 'p1', source: 'manual' }, planned)).toBe('2026-10-28');
    expect(logDay({ completedDate: '2026-10-28', plannedSessionId: 'p1', source: 'garmin' }, planned)).toBe('2026-10-28');
  });
  it('houdt de eigen datum als de geplande sessie een dag eerder ligt', () => {
    expect(logDay({ completedDate: '2026-10-30', plannedSessionId: 'p1', ...mf }, planned)).toBe('2026-10-30');
  });
  it('houdt de eigen datum bij meer dan een dag verschil of dezelfde dag', () => {
    expect(logDay({ completedDate: '2026-10-27', plannedSessionId: 'p1', ...mf }, planned)).toBe('2026-10-27');
    expect(logDay({ completedDate: '2026-10-29', plannedSessionId: 'p2', ...mf }, planned)).toBe('2026-10-29');
    expect(logDay({ completedDate: '2026-10-29', plannedSessionId: 'p1', ...mf }, planned)).toBe('2026-10-29');
  });
  it('houdt de eigen datum zonder geplande training', () => {
    expect(logDay({ completedDate: '2026-10-28', ...mf }, planned)).toBe('2026-10-28');
    expect(logDay({ completedDate: '2026-10-28', plannedSessionId: 'weg', ...mf }, planned)).toBe('2026-10-28');
  });
});

describe('logsInRange', () => {
  it('telt een log in de maand van zijn geplande dag, de lijst blijft op het bestand', () => {
    const p = plannedByIdOf([{ id: 'p1', scheduledDate: '2026-11-01' }]);
    const late = { completedDate: '2026-10-31', plannedSessionId: 'p1', ...mf };
    expect(logsInRange([late], p, '2026-10-01', '2026-10-31')).toEqual([]);
    expect(logsInRange([late], p, '2026-11-01', '2026-11-30')).toEqual([late]);
    const plain = { completedDate: '2026-10-31', plannedSessionId: 'p1', source: 'manual' as const };
    expect(logsInRange([plain], p, '2026-10-01', '2026-10-31')).toEqual([plain]);
  });
});

describe('withoutLog', () => {
  it('laat sessies met een log eruit', () => {
    expect(withoutLog([{ id: 'a' }, { id: 'b' }], [{ plannedSessionId: 'a' }, {}])).toEqual([{ id: 'b' }]);
  });
});

describe('vandaag zit erop', () => {
  it('een gewone log van vandaag telt op vandaag, ook zonder geplande sessie', () => {
    const p = plannedByIdOf([]);
    expect(logDay({ completedDate: '2026-10-31', source: 'manual' }, p)).toBe('2026-10-31');
    expect(logDay({ completedDate: '2026-10-31', plannedSessionId: 'weg', source: 'garmin' }, p)).toBe('2026-10-31');
  });
});
