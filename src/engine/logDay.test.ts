import { describe, expect, it } from 'vitest';
import { logDay, plannedByIdOf } from './logDay';

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
