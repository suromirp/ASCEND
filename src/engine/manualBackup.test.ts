import { describe, expect, it } from 'vitest';
import { lastAutoBackupLine, manualBackupName, failedBackupText, savedBackupText } from './manualBackup';
import { isAutoBackupName } from './autoBackup';

describe('naam van een back-up met de hand', () => {
  const at = new Date(2026, 10, 2, 9, 5);
  it('heeft datum en tijd', () => {
    expect(manualBackupName(at)).toBe('ascend-2026-11-02-09u05.ascend-backup.json');
    expect(manualBackupName(at, 3)).toBe('ascend-2026-11-02-09u05-3.ascend-backup.json');
  });
  it('lijkt nooit op een naam van de automatische back-up', () => {
    expect(isAutoBackupName(manualBackupName(at))).toBe(false);
    expect(isAutoBackupName(manualBackupName(at, 2))).toBe(false);
  });
});

describe('teksten', () => {
  it('bevestiging en fout', () => {
    expect(savedBackupText('Documenten/ASCEND', 'a.json')).toBe('Back-up opgeslagen in Documenten/ASCEND als a.json.');
    expect(failedBackupText('timeout')).toMatch(/^Opslaan lukte niet: .*\.$/);
    expect(failedBackupText('unknown')).toMatch(/^Opslaan lukte niet/);
  });
  it('geen gedachtestreepjes', () => {
    for (const r of ['permission', 'folder', 'write', 'timeout', 'unknown'] as const) expect(failedBackupText(r)).not.toMatch(/[–—]/);
  });
});

describe('laatste automatische back-up', () => {
  it('nog niet gedraaid', () => {
    expect(lastAutoBackupLine(undefined, 'Documenten/ASCEND')).toBe('De automatische back-up heeft nog niet gedraaid.');
  });
  it('met datum en tijd', () => {
    const at = new Date(2026, 10, 2, 9, 5).toISOString();
    expect(lastAutoBackupLine(at, 'Documenten/ASCEND')).toContain('lukte op 2 november om 09:05');
  });
});
