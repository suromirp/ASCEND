import { describe, expect, it } from 'vitest';
import { backupMadeSettings, backupPairAfterRestore, logsNotInLastBackup, readLastBackupLogs } from './backupSince';

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

// Het paar na volledig terugzetten (docs/beslissingen/2026-11-20-backup-terugzetten.md).
describe('backupPairAfterRestore', () => {
  const OLDER = '2026-11-08T19:00:00.000Z';
  const device = backupMadeSettings(BACKUP_AT, ['log_oud']);

  it('het toestel is nieuwer dan het bestand: het paar van het toestel blijft', () => {
    expect(backupPairAfterRestore(device, OLDER, ['x'])).toEqual(device);
  });

  it('het toestel is even oud als het bestand: het paar van het toestel blijft', () => {
    expect(backupPairAfterRestore(device, BACKUP_AT, ['x'])).toEqual(device);
  });

  it('het bestand is nieuwer: zijn tijdstip, met de trainingen die erin staan', () => {
    const old = backupMadeSettings(OLDER, ['log_oud']);
    expect(backupPairAfterRestore(old, BACKUP_AT, ['log_oud', 'log_morgen'])).toEqual(backupMadeSettings(BACKUP_AT, ['log_oud', 'log_morgen']));
  });

  it('een toestel zonder back-up: het bestand is de laatste back-up, ook als het leeg is', () => {
    expect(backupPairAfterRestore({}, BACKUP_AT, [])).toEqual({ lastExportedAt: BACKUP_AT, lastBackupLogs: { at: BACKUP_AT, ids: [] } });
  });

  it('een bestand zonder bruikbaar tijdstip verandert niets', () => {
    for (const at of [undefined, '', 'geen datum']) {
      expect(backupPairAfterRestore(device, at, ['x'])).toEqual(device);
      expect(backupPairAfterRestore({}, at, ['x'])).toEqual({ lastExportedAt: undefined, lastBackupLogs: undefined });
    }
  });

  it('vergelijkt het moment, niet de tekst: een tijdstip met een tijdzone telt goed en wordt als UTC bewaard', () => {
    // 21:00 in +02:00 is 19:00 UTC, gelijk aan het toestel.
    expect(backupPairAfterRestore(device, '2026-11-15T21:00:00+02:00', ['x'])).toEqual(device);
    expect(backupPairAfterRestore({}, '2026-11-15T21:00:00+02:00', ['x'])).toEqual(backupMadeSettings(BACKUP_AT, ['x']));
  });

  it('een toestel met alleen een tijdstip (een oudere app) houdt dat, zonder lijst', () => {
    expect(backupPairAfterRestore({ lastExportedAt: BACKUP_AT }, OLDER, ['x'])).toEqual({ lastExportedAt: BACKUP_AT, lastBackupLogs: undefined });
  });

  it('een kapot tijdstip op het toestel telt als geen back-up: het bestand wint', () => {
    expect(backupPairAfterRestore({ lastExportedAt: 'kapot', lastBackupLogs: 7 }, OLDER, ['x'])).toEqual(backupMadeSettings(OLDER, ['x']));
  });
});
