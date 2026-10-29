import { describe, expect, it } from 'vitest';
import { logDay, plannedByIdOf } from './logDay';

const planned = plannedByIdOf([{ id: 'p1', scheduledDate: '2026-10-29' }, { id: 'p2', scheduledDate: '2026-11-05' }]);

describe('logDay', () => {
  it('neemt de dag van de geplande training als die een dag later ligt', () => {
    expect(logDay({ completedDate: '2026-10-28', plannedSessionId: 'p1' }, planned)).toBe('2026-10-29');
  });
  it('neemt de dag van de geplande training als die een dag eerder ligt', () => {
    expect(logDay({ completedDate: '2026-10-30', plannedSessionId: 'p1' }, planned)).toBe('2026-10-29');
  });
  it('houdt de eigen datum bij meer dan een dag verschil', () => {
    expect(logDay({ completedDate: '2026-10-27', plannedSessionId: 'p1' }, planned)).toBe('2026-10-27');
    expect(logDay({ completedDate: '2026-10-29', plannedSessionId: 'p2' }, planned)).toBe('2026-10-29');
  });
  it('houdt de eigen datum zonder geplande training', () => {
    expect(logDay({ completedDate: '2026-10-28' }, planned)).toBe('2026-10-28');
    expect(logDay({ completedDate: '2026-10-28', plannedSessionId: 'weg' }, planned)).toBe('2026-10-28');
  });
  it('geeft dezelfde dag als de datums gelijk zijn', () => {
    expect(logDay({ completedDate: '2026-10-29', plannedSessionId: 'p1' }, planned)).toBe('2026-10-29');
  });
});
