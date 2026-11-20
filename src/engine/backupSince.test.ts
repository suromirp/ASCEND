import { describe, expect, it } from 'vitest';
import { backupMadeSettings, backupPairAfterRestore, logsNotInLastBackup, newestBackupPair, readLastBackupLogs, straightBackupPair } from './backupSince';

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
  const NOW_AT = '2026-11-20T12:00:00.000Z';
  const NOW = Date.parse(NOW_AT);

  it('het toestel is nieuwer dan het bestand: het paar van het toestel blijft', () => {
    expect(backupPairAfterRestore(device, OLDER, ['x'], NOW)).toEqual(device);
  });

  it('het toestel is even oud als het bestand: het paar van het toestel blijft', () => {
    expect(backupPairAfterRestore(device, BACKUP_AT, ['x'], NOW)).toEqual(device);
  });

  it('het bestand is nieuwer: zijn tijdstip, met de trainingen die erin staan', () => {
    const old = backupMadeSettings(OLDER, ['log_oud']);
    expect(backupPairAfterRestore(old, BACKUP_AT, ['log_oud', 'log_morgen'], NOW)).toEqual(backupMadeSettings(BACKUP_AT, ['log_oud', 'log_morgen']));
  });

  it('een toestel zonder back-up: het bestand is de laatste back-up, ook als het leeg is', () => {
    expect(backupPairAfterRestore({}, BACKUP_AT, [], NOW)).toEqual({ lastExportedAt: BACKUP_AT, lastBackupLogs: { at: BACKUP_AT, ids: [] } });
  });

  it('een bestand zonder bruikbaar tijdstip verandert niets', () => {
    for (const at of [undefined, '', 'geen datum']) {
      expect(backupPairAfterRestore(device, at, ['x'], NOW)).toEqual(device);
      expect(backupPairAfterRestore({}, at, ['x'], NOW)).toEqual({ lastExportedAt: undefined, lastBackupLogs: undefined });
    }
  });

  it('vergelijkt het moment, niet de tekst: een tijdstip met een tijdzone telt goed en wordt als UTC bewaard', () => {
    // 21:00 in +02:00 is 19:00 UTC, gelijk aan het toestel.
    expect(backupPairAfterRestore(device, '2026-11-15T21:00:00+02:00', ['x'], NOW)).toEqual(device);
    expect(backupPairAfterRestore({}, '2026-11-15T21:00:00+02:00', ['x'], NOW)).toEqual(backupMadeSettings(BACKUP_AT, ['x']));
  });

  it('een toestel met alleen een tijdstip (een oudere app) houdt dat, zonder lijst', () => {
    expect(backupPairAfterRestore({ lastExportedAt: BACKUP_AT }, OLDER, ['x'], NOW)).toEqual({ lastExportedAt: BACKUP_AT, lastBackupLogs: undefined });
  });

  it('een kapot tijdstip op het toestel telt als geen back-up: het bestand wint', () => {
    expect(backupPairAfterRestore({ lastExportedAt: 'kapot', lastBackupLogs: 7 }, OLDER, ['x'], NOW)).toEqual(backupMadeSettings(OLDER, ['x']));
  });

  it('een bestand uit de toekomst telt als nu: Laatste back-up is nu, met de trainingen uit het bestand', () => {
    expect(backupPairAfterRestore(device, '2027-11-20T12:00:00.000Z', ['x'], NOW)).toEqual(backupMadeSettings(NOW_AT, ['x']));
    expect(backupPairAfterRestore({}, '2027-11-20T12:00:00.000Z', ['x'], NOW)).toEqual(backupMadeSettings(NOW_AT, ['x']));
  });

  it('een bestand precies op nu of een seconde ervoor houdt zijn eigen tijdstip', () => {
    expect(backupPairAfterRestore(device, NOW_AT, ['x'], NOW)).toEqual(backupMadeSettings(NOW_AT, ['x']));
    expect(backupPairAfterRestore(device, '2026-11-20T11:59:59.000Z', ['x'], NOW)).toEqual(backupMadeSettings('2026-11-20T11:59:59.000Z', ['x']));
  });

  it('een toestel dat al op nu staat wint van een bestand uit de toekomst', () => {
    const fresh = backupMadeSettings(NOW_AT, ['log_oud']);
    expect(backupPairAfterRestore(fresh, '2027-11-20T12:00:00.000Z', ['x'], NOW)).toEqual(fresh);
  });
});

// Laatste back-up hoogstens nu, en het nieuwste paar bij een kopie van voor een import (I-93,
// docs/beslissingen/2026-11-20-backup-kopie-en-toekomst.md).
describe('straightBackupPair', () => {
  const NOW_AT = '2026-11-20T12:00:00.000Z';
  const NOW = Date.parse(NOW_AT);

  it('een tijdstip in de toekomst wordt nu, en de lijst die erbij hoorde krijgt hetzelfde tijdstip', () => {
    const future = backupMadeSettings('2027-11-20T12:00:00.000Z', ['a', 'b']);
    const straight = straightBackupPair(future, NOW);
    expect(straight).toEqual(backupMadeSettings(NOW_AT, ['a', 'b']));
    // De telling blijft op id: niets telt te weinig.
    expect(logsNotInLastBackup([{ id: 'a', completedAt: '2026-11-01T10:00:00.000Z' }, { id: 'c', completedAt: '2026-11-01T10:00:00.000Z' }], straight)).toBe(1);
  });

  it('de dag zelf: eerder vandaag en precies nu blijven zoals ze zijn, later vandaag wordt nu', () => {
    for (const at of ['2026-11-20T00:00:01.000Z', '2026-11-20T11:59:59.999Z', NOW_AT]) {
      const pair = backupMadeSettings(at, ['a']);
      expect(straightBackupPair(pair, NOW)).toBe(pair);
    }
    expect(straightBackupPair(backupMadeSettings('2026-11-20T12:00:00.001Z', ['a']), NOW)).toEqual(backupMadeSettings(NOW_AT, ['a']));
    expect(straightBackupPair(backupMadeSettings('2026-11-20T23:30:00.000Z', ['a']), NOW)).toEqual(backupMadeSettings(NOW_AT, ['a']));
  });

  it('een lijst die niet bij het tijdstip hoort blijft zoals hij is, en telt dus op tijd', () => {
    const loose = { lastExportedAt: '2027-01-01T00:00:00.000Z', lastBackupLogs: { at: '2026-11-08T19:00:00.000Z', ids: ['a'] } };
    expect(straightBackupPair(loose, NOW)).toEqual({ lastExportedAt: NOW_AT, lastBackupLogs: loose.lastBackupLogs });
    expect(straightBackupPair({ lastExportedAt: '2027-01-01T00:00:00.000Z' }, NOW)).toEqual({ lastExportedAt: NOW_AT });
  });

  it('geen tijdstip of een onleesbaar tijdstip: niets verandert, andere velden blijven', () => {
    for (const pair of [{}, { lastExportedAt: 'geen datum' }, { lastExportedAt: '' }]) expect(straightBackupPair(pair, NOW)).toBe(pair);
    expect(straightBackupPair({ lastExportedAt: '2027-01-01T00:00:00.000Z', restDay: 1 }, NOW)).toEqual({ lastExportedAt: NOW_AT, restDay: 1 });
  });

  it('een toestel met een tijdstip in de toekomst wint niet meer van een bestand van daarna', () => {
    const future = backupMadeSettings('2027-11-20T12:00:00.000Z', ['a']);
    // Een bestand van een uur voor nu is ouder dan het rechtgezette toestel: het toestel blijft, rechtgezet.
    expect(backupPairAfterRestore(future, '2026-11-20T11:00:00.000Z', ['x'], NOW)).toEqual(backupMadeSettings(NOW_AT, ['a']));
    // Een week later is een nieuw bestand wel nieuwer dan het toestel.
    const later = NOW + 7 * 86_400_000;
    const straight = straightBackupPair(future, NOW);
    expect(backupPairAfterRestore(straight, '2026-11-25T12:00:00.000Z', ['a', 'b'], later)).toEqual(backupMadeSettings('2026-11-25T12:00:00.000Z', ['a', 'b']));
  });
});

describe('newestBackupPair', () => {
  const OLDER = '2026-11-08T19:00:00.000Z';
  const NOW_AT = '2026-11-20T12:00:00.000Z';
  const NOW = Date.parse(NOW_AT);
  const newer = backupMadeSettings(BACKUP_AT, ['a', 'b']);
  const older = backupMadeSettings(OLDER, ['a']);

  it('het toestel is nieuwer dan de kopie: het paar van het toestel blijft', () => {
    expect(newestBackupPair(newer, older, NOW)).toEqual(newer);
  });

  it('de kopie is nieuwer dan het toestel: het paar van de kopie komt terug, tijdstip en lijst samen', () => {
    expect(newestBackupPair(older, newer, NOW)).toEqual(newer);
  });

  it('even oud: het toestel blijft', () => {
    const own = backupMadeSettings(BACKUP_AT, ['a', 'b', 'x']);
    expect(newestBackupPair(own, newer, NOW)).toEqual(own);
  });

  it('een toestel zonder back-up krijgt het paar van de kopie; een kopie zonder back-up verandert niets', () => {
    expect(newestBackupPair({}, older, NOW)).toEqual(older);
    expect(newestBackupPair(newer, {}, NOW)).toEqual(newer);
    expect(newestBackupPair(newer, { lastExportedAt: 'geen datum', lastBackupLogs: { at: 'geen datum', ids: ['z'] } }, NOW)).toEqual(newer);
    expect(newestBackupPair({}, {}, NOW)).toEqual({ lastExportedAt: undefined, lastBackupLogs: undefined });
  });

  it('een kopie met een tijdstip in de toekomst telt als nu', () => {
    const future = backupMadeSettings('2027-11-20T12:00:00.000Z', ['a']);
    expect(newestBackupPair(older, future, NOW)).toEqual(backupMadeSettings(NOW_AT, ['a']));
    // En een toestel in de toekomst wordt rechtgezet, ook als het wint.
    expect(newestBackupPair(future, older, NOW)).toEqual(backupMadeSettings(NOW_AT, ['a']));
  });

  it('vergelijkt het moment, niet de tekst', () => {
    // 20:30 in +02:00 is 18:30 UTC, ouder dan het toestel van 19:00 UTC, al sorteert de tekst erna.
    expect(newestBackupPair(newer, { lastExportedAt: '2026-11-15T20:30:00+02:00' }, NOW)).toEqual(newer);
  });
});
