import { describe, expect, it } from 'vitest';
import {
  AUTO_BACKUP_ADVICE,
  AUTO_BACKUP_KEEP_ADVICE,
  autoBackupFailureText,
  autoBackupFileName,
  autoBackupSlot,
  backupCardOnToday,
  backupWhereText,
  filesToPrune,
  isAutoBackupDue,
  isAutoBackupName,
  mayRetryAutoBackup,
  rememberFile,
  resolveAutoBackup,
  resolveAutoBackupKeep,
} from './autoBackup';

// Lokale tijd, zoals de telefoon hem ziet. 1 november 2026 is een zondag.
const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min);
const iso = (y: number, m: number, d: number, h: number, min = 0) => at(y, m, d, h, min).toISOString();

const name = (day: string) => `ascend-${day}.ascend-backup.json`;

describe('de keuzes van Automatische back-up', () => {
  it('het advies is wekelijks en de laatste 8 bewaren', () => {
    expect(AUTO_BACKUP_ADVICE).toBe('weekly');
    expect(AUTO_BACKUP_KEEP_ADVICE).toBe(8);
  });

  it('leest defensief: iets onbekends wordt het advies', () => {
    expect(resolveAutoBackup('daily')).toBe('daily');
    expect(resolveAutoBackup('off')).toBe('off');
    expect(resolveAutoBackup('elk uur')).toBe('weekly');
    expect(resolveAutoBackup(undefined)).toBe('weekly');
    expect(resolveAutoBackupKeep(16)).toBe(16);
    expect(resolveAutoBackupKeep(0)).toBe(0);
    expect(resolveAutoBackupKeep(7)).toBe(8);
  });
});

describe('het moment', () => {
  it('wekelijks is zondagavond om 18:00, de laatste die al voorbij is', () => {
    expect(autoBackupSlot('weekly', at(2026, 10, 31, 10))).toEqual(at(2026, 10, 25, 18));
    expect(autoBackupSlot('weekly', at(2026, 11, 1, 17, 59))).toEqual(at(2026, 10, 25, 18));
    expect(autoBackupSlot('weekly', at(2026, 11, 1, 18))).toEqual(at(2026, 11, 1, 18));
    expect(autoBackupSlot('weekly', at(2026, 11, 2, 8))).toEqual(at(2026, 11, 1, 18));
  });

  it('dagelijks is elke avond om 18:00', () => {
    expect(autoBackupSlot('daily', at(2026, 11, 2, 8))).toEqual(at(2026, 11, 1, 18));
    expect(autoBackupSlot('daily', at(2026, 11, 2, 19))).toEqual(at(2026, 11, 2, 18));
  });

  it('uit heeft geen moment', () => {
    expect(autoBackupSlot('off', at(2026, 11, 2, 19))).toBeNull();
  });
});

describe('is er een back-up nodig', () => {
  const base = { frequency: 'weekly' as const, hasData: true };

  it('wekelijks: niet voor zondagavond, wel daarna', () => {
    const last = iso(2026, 10, 25, 19);
    expect(isAutoBackupDue({ ...base, now: at(2026, 10, 31, 10), lastBackupAt: last })).toBe(false);
    expect(isAutoBackupDue({ ...base, now: at(2026, 11, 1, 17), lastBackupAt: last })).toBe(false);
    expect(isAutoBackupDue({ ...base, now: at(2026, 11, 1, 18, 30), lastBackupAt: last })).toBe(true);
  });

  it('wekelijks: een gemiste zondag komt bij de volgende keer openen', () => {
    expect(isAutoBackupDue({ ...base, now: at(2026, 11, 2, 8), lastBackupAt: iso(2026, 10, 25, 19) })).toBe(true);
  });

  it('wekelijks: een back-up op zondag zelf telt, ook die van de ochtend', () => {
    expect(isAutoBackupDue({ ...base, now: at(2026, 11, 1, 20), lastBackupAt: iso(2026, 11, 1, 9) })).toBe(false);
    expect(isAutoBackupDue({ ...base, now: at(2026, 11, 3, 8), lastBackupAt: iso(2026, 11, 1, 9) })).toBe(false);
  });

  it('dagelijks: al gemaakt vandaag is genoeg', () => {
    const daily = { frequency: 'daily' as const, hasData: true };
    expect(isAutoBackupDue({ ...daily, now: at(2026, 11, 2, 19), lastBackupAt: iso(2026, 11, 2, 8) })).toBe(false);
    expect(isAutoBackupDue({ ...daily, now: at(2026, 11, 2, 19), lastBackupAt: iso(2026, 11, 1, 19) })).toBe(true);
    // 's Ochtends telt de avond van gisteren nog; die back-up was er.
    expect(isAutoBackupDue({ ...daily, now: at(2026, 11, 2, 8), lastBackupAt: iso(2026, 11, 1, 18, 30) })).toBe(false);
    expect(isAutoBackupDue({ ...daily, now: at(2026, 11, 2, 8), lastBackupAt: iso(2026, 10, 31, 18, 30) })).toBe(true);
  });

  it('nog nooit een back-up: meteen, als er iets te bewaren is', () => {
    expect(isAutoBackupDue({ ...base, now: at(2026, 11, 2, 8) })).toBe(true);
    expect(isAutoBackupDue({ ...base, hasData: false, now: at(2026, 11, 2, 8) })).toBe(false);
  });

  it('uit is nooit nodig', () => {
    expect(isAutoBackupDue({ frequency: 'off', hasData: true, now: at(2026, 11, 2, 8) })).toBe(false);
  });

  it('Niet nu op de kaart wacht tot het volgende moment', () => {
    const last = iso(2026, 10, 25, 19);
    expect(isAutoBackupDue({ ...base, now: at(2026, 11, 2, 8), lastBackupAt: last, dismissedAt: iso(2026, 11, 2, 7) })).toBe(false);
    expect(isAutoBackupDue({ ...base, now: at(2026, 11, 8, 19), lastBackupAt: last, dismissedAt: iso(2026, 11, 2, 7) })).toBe(true);
  });

  it('een kapotte datum telt als geen back-up', () => {
    expect(isAutoBackupDue({ ...base, now: at(2026, 11, 2, 8), lastBackupAt: 'gisteren' })).toBe(true);
  });
});

describe('de kaart op Vandaag', () => {
  const base = { frequency: 'weekly' as const, hasData: true, now: at(2026, 11, 2, 8), lastBackupAt: iso(2026, 10, 25, 19) };

  it('uit: de oude herinnering na 7 dagen, verder niets', () => {
    expect(backupCardOnToday({ ...base, frequency: 'off', checked: true, reminderDue: true })).toBe('reminder');
    expect(backupCardOnToday({ ...base, frequency: 'off', checked: true, reminderDue: false })).toBeNull();
  });

  it('aan: Tijd voor je back-up op het moment, pas als er gekeken is of het stil kon', () => {
    expect(backupCardOnToday({ ...base, checked: false, reminderDue: true })).toBeNull();
    expect(backupCardOnToday({ ...base, checked: true, reminderDue: false })).toBe('due');
    expect(backupCardOnToday({ ...base, checked: true, reminderDue: true, lastBackupAt: iso(2026, 11, 1, 19) })).toBeNull();
  });
});

describe('na een mislukte poging', () => {
  it('pas na een uur opnieuw, niet bij elke keer terugkomen in de app', () => {
    expect(mayRetryAutoBackup(undefined, at(2026, 11, 2, 8))).toBe(true);
    expect(mayRetryAutoBackup(iso(2026, 11, 2, 8), at(2026, 11, 2, 8, 30))).toBe(false);
    expect(mayRetryAutoBackup(iso(2026, 11, 2, 8), at(2026, 11, 2, 9))).toBe(true);
    expect(mayRetryAutoBackup('kapot', at(2026, 11, 2, 9))).toBe(true);
  });
});

describe('oude bestanden opruimen', () => {
  const days = ['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27', '2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01', '2026-11-08'];

  it('houdt de laatste 8 en ruimt de oudste op', () => {
    expect(filesToPrune(days.map(name), 8)).toEqual([name('2026-09-06'), name('2026-09-13')]);
  });

  it('kijkt naar de datum in de naam, niet naar de volgorde van de lijst', () => {
    expect(filesToPrune([...days].reverse().map(name), 8)).toEqual([name('2026-09-06'), name('2026-09-13')]);
  });

  it('alleen bestanden die ASCEND zelf maakte: een vreemde naam blijft altijd staan', () => {
    const own = [...days.map(name), 'vakantiefoto.json', 'ascend-2026-01-01.json'];
    const out = filesToPrune(own, 2);
    expect(out).not.toContain('vakantiefoto.json');
    expect(out).not.toContain('ascend-2026-01-01.json');
    expect(out).toHaveLength(8);
  });

  it('alles bewaren ruimt niets op', () => {
    expect(filesToPrune(days.map(name), 0)).toEqual([]);
  });

  it('weinig bestanden: niets op te ruimen', () => {
    expect(filesToPrune(days.slice(0, 3).map(name), 8)).toEqual([]);
  });

  it('een naam herkennen en onthouden, zonder dubbele', () => {
    expect(isAutoBackupName(name('2026-11-01'))).toBe(true);
    expect(isAutoBackupName('ascend-2026-11-01.json')).toBe(false);
    expect(isAutoBackupName('../ascend-2026-11-01.ascend-backup.json')).toBe(false);
    expect(rememberFile([name('2026-11-01')], name('2026-11-01'))).toEqual([name('2026-11-01')]);
    expect(rememberFile([name('2026-11-01')], name('2026-11-08'))).toEqual([name('2026-11-01'), name('2026-11-08')]);
    expect(rememberFile([], 'vreemd.txt')).toEqual([]);
  });

  it('een tweede naam op dezelfde dag, als de eerste niet van ASCEND is', () => {
    expect(autoBackupFileName('2026-11-02', 1)).toBe(name('2026-11-02'));
    expect(autoBackupFileName('2026-11-02', 2)).toBe('ascend-2026-11-02-2.ascend-backup.json');
    expect(isAutoBackupName('ascend-2026-11-02-2.ascend-backup.json')).toBe(true);
    expect(isAutoBackupName('ascend-2026-11-02-0.ascend-backup.json')).toBe(false);
    expect(isAutoBackupName('ascend-2026-11-02-1.ascend-backup.json')).toBe(false);
  });

  it('opruimen kijkt naar dag en volgnummer: -2 is nieuwer dan de gewone naam van die dag', () => {
    const own = [name('2026-11-01'), 'ascend-2026-11-01-2.ascend-backup.json', name('2026-10-25'), 'ascend-2026-11-08-10.ascend-backup.json', 'ascend-2026-11-08-9.ascend-backup.json'];
    expect(filesToPrune(own, 2)).toEqual([name('2026-10-25'), name('2026-11-01'), 'ascend-2026-11-01-2.ascend-backup.json']);
  });
});

describe('wat de gebruiker leest', () => {
  it('waar de laatste back-up staat', () => {
    expect(backupWhereText({ kind: 'folder', label: 'Documenten/ASCEND' })).toBe('In Documenten/ASCEND');
    expect(backupWhereText({ kind: 'download' })).toBe('In je downloads');
    expect(backupWhereText({ kind: 'file' })).toBe('Op de plek die je koos');
    expect(backupWhereText(undefined)).toBeUndefined();
  });

  it('een mislukte back-up zegt wat je kunt doen, in een zin', () => {
    for (const reason of ['permission', 'folder', 'write', 'timeout'] as const) {
      for (const platform of ['app', 'browser'] as const) {
        const text = autoBackupFailureText(reason, platform);
        expect(text.startsWith('De automatische back-up lukte niet')).toBe(true);
        expect(text).not.toMatch(/[\u2013\u2014!]/);
      }
    }
    expect(autoBackupFailureText('permission', 'app')).toContain('Vaste map');
    expect(autoBackupFailureText('folder', 'browser')).toContain('Vaste map');
  });
});
