import { describe, expect, it } from 'vitest';
import { logIdsForBackup, resolveStreamsBackup } from './streamsBackup';

describe('resolveStreamsBackup', () => {
  it('standaard de laatste 2 jaar', () => {
    expect(resolveStreamsBackup(undefined)).toBe('twoYears');
    expect(resolveStreamsBackup({})).toBe('twoYears');
    expect(resolveStreamsBackup({ streamsInBackup: true })).toBe('twoYears');
  });
  it('de oude schakelaar uit wordt Geen reeksen', () => {
    expect(resolveStreamsBackup({ streamsInBackup: false })).toBe('none');
  });
  it('een gekozen waarde gaat voor de oude schakelaar', () => {
    expect(resolveStreamsBackup({ streamsBackup: 'all', streamsInBackup: false })).toBe('all');
    expect(resolveStreamsBackup({ streamsBackup: 'none' })).toBe('none');
    expect(resolveStreamsBackup({ streamsBackup: 'wat' as never })).toBe('twoYears');
  });
});

describe('logIdsForBackup', () => {
  const logs = [
    { id: 'nieuw', completedDate: '2026-10-01' },
    { id: 'grens', completedDate: '2024-10-31' },
    { id: 'oud', completedDate: '2024-10-30' },
  ];
  it('de laatste 2 jaar, vanaf de dag precies 2 jaar terug', () => {
    expect([...logIdsForBackup(logs, 'twoYears', '2026-10-31')]).toEqual(['nieuw', 'grens']);
  });
  it('alle of geen', () => {
    expect(logIdsForBackup(logs, 'all', '2026-10-31').size).toBe(3);
    expect(logIdsForBackup(logs, 'none', '2026-10-31').size).toBe(0);
  });
});
