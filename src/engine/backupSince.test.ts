import { describe, expect, it } from 'vitest';
import { backupMadeSettings, logsNotInLastBackup, readLastBackupLogs } from './backupSince';

// Nagemaakte logs. De back-up is van vandaag 20:00; "gisteren" is een Forge-log die pas na de back-up is
// afgerond, op de dag van de laatste set.
const BACKUP_AT = '2026-11-15T19:00:00.000Z';
const before = { id: 'log_oud', completedAt: '2026-11-10T08:00:00.000Z' };
const yesterdayAfterBackup = { id: 'log_forge_gisteren', completedAt: '2026-11-14T17:30:00.000Z' };
const later = { id: 'log_morgen', completedAt: '2026-11-16T07:00:00.000Z' };

describe('trainingen die niet in je laatste back-up staan', () => {
  it('nog nooit een back-up: alles telt', () => {
    expect(logsNotInLastBackup([before, later], {})).toBe(2);
  });

  it('telt op id: een log van gisteren dat na de back-up van vandaag is bewaard, telt mee', () => {
    const settings = backupMadeSettings(BACKUP_AT, ['log_oud']);
    expect(logsNotInLastBackup([before, yesterdayAfterBackup, later], settings)).toBe(2);
  });

  it('een log in de back-up telt nooit, ook als zijn tijd na de back-up ligt', () => {
    const settings = backupMadeSettings(BACKUP_AT, ['log_oud', 'log_morgen']);
    expect(logsNotInLastBackup([before, later], settings)).toBe(0);
  });

  it('zonder lijst (een oudere app of een oude back-up): zoals eerst, op tijd', () => {
    expect(logsNotInLastBackup([before, yesterdayAfterBackup, later], { lastExportedAt: BACKUP_AT })).toBe(1);
  });

  it('een lijst van een andere back-up dan de laatste telt niet: zoals eerst, op tijd', () => {
    const settings = { lastExportedAt: BACKUP_AT, lastBackupLogs: { at: '2026-11-01T19:00:00.000Z', ids: [] } };
    expect(logsNotInLastBackup([before, later], settings)).toBe(1);
  });

  it('een kapotte waarde leest als niet bekend, nooit als fout', () => {
    expect(readLastBackupLogs(undefined)).toBeUndefined();
    expect(readLastBackupLogs('x')).toBeUndefined();
    expect(readLastBackupLogs({ at: BACKUP_AT })).toBeUndefined();
    expect(readLastBackupLogs({ at: BACKUP_AT, ids: ['a', 3, null] })).toEqual({ at: BACKUP_AT, ids: ['a'] });
    expect(logsNotInLastBackup([before, later], { lastExportedAt: BACKUP_AT, lastBackupLogs: { at: BACKUP_AT, ids: 'kapot' } })).toBe(1);
  });

  it('zonder ids na een back-up alleen het tijdstip', () => {
    expect(backupMadeSettings(BACKUP_AT, undefined)).toEqual({ lastExportedAt: BACKUP_AT });
  });
});
