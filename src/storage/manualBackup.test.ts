import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoBackupError } from '../engine/autoBackup';

// Een nagebouwde Android-map in het geheugen, achter de nagebootste plugin Filesystem.
const mem = vi.hoisted(() => ({
  files: new Map<string, string>(),
  permission: 'granted' as string,
  hang: false,
  failWrite: false,
  hidden: new Set<string>(),
  // De map ASCEND bestaat pas na een schrijfactie met `recursive`.
  noDir: false,
  // De volgende zoveel renames mislukken zonder iets te doen (koude start).
  renameFails: 0,
  // De volgende rename kopieert naar de echte naam en meldt dan een fout (zo valt de plugin terug).
  renameCopiesThenFails: 0,
  // De volgende zoveel keer geeft stat op een back-up nog niets terug (nakijken komt te vroeg).
  statMisses: 0,
  deleteFails: false,
  // Schrijven antwoordt pas na zoveel ms (een laat antwoord van de telefoon).
  writeDelayMs: 0,
  writes: 0,
}));

vi.mock('@capacitor/core', async (original) => ({
  ...(await original<typeof import('@capacitor/core')>()),
  Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
}));
vi.mock('@capacitor/filesystem', async () => {
  const { fakeCapacitorPlugin } = await import('../test/capacitorProxy');
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  return {
    Directory: { Documents: 'DOCUMENTS', Data: 'DATA' },
    Encoding: { UTF8: 'utf8' },
    Filesystem: fakeCapacitorPlugin({
      checkPermissions: () => ({ publicStorage: mem.permission }),
      requestPermissions: () => {
        mem.permission = mem.permission === 'denied' ? 'denied' : 'granted';
        return { publicStorage: mem.permission };
      },
      stat: (o) => {
        const p = (o as { path: string }).path;
        if (!mem.files.has(p)) throw new Error('File does not exist');
        if (p.endsWith('.json') && mem.statMisses > 0) {
          mem.statMisses--;
          throw new Error('File does not exist');
        }
        return { size: bytes(mem.files.get(p)!) };
      },
      readFile: (o) => ({ data: mem.files.get((o as { path: string }).path) ?? '' }),
      writeFile: (o) => {
        if (mem.hang) return new Promise(() => undefined);
        if (mem.failWrite) throw new Error('No space left on device');
        const { path, data, recursive } = o as { path: string; data: string; recursive?: boolean };
        if (mem.noDir && !recursive) throw new Error('Parent directory does not exist');
        mem.noDir = false;
        mem.writes++;
        if (mem.writeDelayMs > 0) {
          return new Promise((resolve) => setTimeout(() => {
            mem.files.set(path, data);
            resolve({});
          }, mem.writeDelayMs));
        }
        mem.files.set(path, data);
        return {};
      },
      rename: (o) => {
        const { from, to } = o as { from: string; to: string };
        if (mem.renameFails > 0) {
          mem.renameFails--;
          throw new Error('rename failed');
        }
        if (mem.renameCopiesThenFails > 0) {
          mem.renameCopiesThenFails--;
          mem.files.set(to, mem.files.get(from)!);
          throw new Error('Unknown error');
        }
        if (mem.hidden.has(to) || mem.files.has(to)) throw new Error('rename failed');
        mem.files.set(to, mem.files.get(from)!);
        mem.files.delete(from);
      },
      deleteFile: (o) => {
        const p = (o as { path: string }).path;
        if (mem.deleteFails && p.endsWith('.json')) throw new Error('delete failed');
        mem.files.delete(p);
      },
    }),
  };
});

import { webBackupFileAdapter } from './backupFileAdapter';
import { forgetManualBackupAttempts, runManualBackup, saveManualBackup } from './manualBackup';
import { APP_BACKUP_LABEL, appBackupFolder } from '../integrations/backupFolder';

const NOW = new Date(2026, 10, 2, 14, 30);
const NAME = 'ascend-2026-11-02-14u30.ascend-backup.json';
const TEXT = JSON.stringify({ backupSchemaVersion: 5, payload: {} });

beforeEach(() => {
  forgetManualBackupAttempts();
  mem.files.clear();
  mem.permission = 'granted';
  mem.hang = false;
  mem.failWrite = false;
  mem.hidden.clear();
  mem.noDir = false;
  mem.renameFails = 0;
  mem.renameCopiesThenFails = 0;
  mem.statMisses = 0;
  mem.deleteFails = false;
  mem.writeDelayMs = 0;
  mem.writes = 0;
});

describe('Back-up maken in de Android-app', () => {
  it('schrijft naar Documenten/ASCEND onder een eigen naam met datum en tijd', async () => {
    const folder = appBackupFolder()!;
    const { name } = await saveManualBackup(folder, TEXT, { now: NOW });
    expect(name).toBe(NAME);
    expect([...mem.files.keys()]).toEqual([`ASCEND/${NAME}`]);
    expect(mem.files.get(`ASCEND/${NAME}`)).toBe(TEXT);
  });

  it('overschrijft een bestaand bestand nooit, ook geen vreemd bestand met dezelfde naam', async () => {
    mem.files.set(`ASCEND/${NAME}`, 'vreemd');
    const { name } = await saveManualBackup(appBackupFolder()!, TEXT, { now: NOW });
    expect(name).toBe('ascend-2026-11-02-14u30-2.ascend-backup.json');
    expect(mem.files.get(`ASCEND/${NAME}`)).toBe('vreemd');
  });

  it('een naam die bezet blijkt maar die de app niet ziet: het volgende volgnummer', async () => {
    mem.hidden.add(`ASCEND/${NAME}`);
    const { name } = await saveManualBackup(appBackupFolder()!, TEXT, { now: NOW });
    expect(name).toBe('ascend-2026-11-02-14u30-2.ascend-backup.json');
    expect([...mem.files.keys()].some((k) => k.endsWith('.tmp'))).toBe(false);
  });

  it('vraagt na de tik om toestemming als die nog ontbreekt (Android 10 en ouder)', async () => {
    mem.permission = 'prompt';
    await saveManualBackup(appBackupFolder()!, TEXT, { now: NOW });
    expect(mem.permission).toBe('granted');
  });

  it('geen toestemming: een duidelijke fout en geen bestand', async () => {
    mem.permission = 'denied';
    await expect(saveManualBackup(appBackupFolder()!, TEXT, { now: NOW })).rejects.toMatchObject({ reason: 'permission' });
    expect(mem.files.size).toBe(0);
  });

  it('time-out: de belofte eindigt met een fout in plaats van te blijven hangen', async () => {
    mem.hang = true;
    await expect(saveManualBackup(appBackupFolder()!, TEXT, { now: NOW, limitMs: 50 })).rejects.toMatchObject({ reason: 'timeout' });
  });

  it('de adapter geeft de map en de naam terug', async () => {
    const result = await webBackupFileAdapter.saveBackup(new Blob([TEXT]), 'ascend-2026-11-02.ascend-backup.json');
    expect(result.success).toBe(true);
    expect(result.folder).toBe(APP_BACKUP_LABEL);
    expect(result.savedTo).toMatch(/^ascend-\d{4}-\d{2}-\d{2}-\d{2}u\d{2}(-\d+)?\.ascend-backup\.json$/);
    expect(result.viaDownload).toBeUndefined();
  });
});

describe('uitkomst en Laatste back-up', () => {
  const prepare = async () => ({ text: TEXT, fileName: 'x.ascend-backup.json' });

  it('gelukt: zichtbare uitkomst en Laatste back-up bijgewerkt', async () => {
    const markMade = vi.fn(async () => undefined);
    const outcome = await runManualBackup({ prepare, adapter: webBackupFileAdapter, markMade });
    expect(outcome.status).toBe('saved');
    expect(markMade).toHaveBeenCalledTimes(1);
    expect(markMade.mock.calls[0]).toMatchObject([expect.any(String), { kind: 'folder', label: APP_BACKUP_LABEL }]);
  });

  it('mislukt: een fout met reden en Laatste back-up blijft onaangeraakt', async () => {
    mem.failWrite = true;
    const markMade = vi.fn(async () => undefined);
    const outcome = await runManualBackup({ prepare, adapter: webBackupFileAdapter, markMade });
    expect(outcome).toEqual({ status: 'failed', message: expect.stringMatching(/^Opslaan lukte niet: /) });
    expect(markMade).not.toHaveBeenCalled();
  });

  it('time-out: een fout en Laatste back-up blijft onaangeraakt', async () => {
    const markMade = vi.fn(async () => undefined);
    const adapter = { saveBackup: async () => { throw new AutoBackupError('timeout'); } };
    const outcome = await runManualBackup({ prepare, adapter, markMade });
    expect(outcome).toMatchObject({ status: 'failed', message: expect.stringContaining('te lang') });
    expect(markMade).not.toHaveBeenCalled();
  });

  it('het hele traject heeft een tijdsgrens, ook als het klaarmaken blijft hangen', async () => {
    const markMade = vi.fn(async () => undefined);
    const outcome = await runManualBackup({ prepare: () => new Promise(() => undefined), adapter: webBackupFileAdapter, markMade, limitMs: 50 });
    expect(outcome).toMatchObject({ status: 'failed', message: expect.stringContaining('Kijk in de map of hij er toch staat') });
    expect(markMade).not.toHaveBeenCalled();
  });

  it('een gelukte back-up wordt nooit als mislukt gemeld, ook niet als Laatste back-up niet lukt', async () => {
    const markMade = vi.fn(async () => { throw new Error('opslag vol'); });
    const outcome = await runManualBackup({ prepare, adapter: webBackupFileAdapter, markMade });
    expect(outcome.status).toBe('saved');
  });

  it('een bestaand bestand wordt in de map zelf ook niet vervangen (neverReplace)', async () => {
    mem.files.set(`ASCEND/${NAME}`, 'vreemd');
    mem.hidden.add(`ASCEND/${NAME}`);
    await saveManualBackup(appBackupFolder()!, TEXT, { now: NOW });
    expect(mem.files.get(`ASCEND/${NAME}`)).toBe('vreemd');
  });

  it('afgebroken door de gebruiker: geen fout en niets bijgewerkt', async () => {
    const markMade = vi.fn(async () => undefined);
    const outcome = await runManualBackup({ prepare, adapter: { saveBackup: async () => ({ success: false }) }, markMade });
    expect(outcome).toEqual({ status: 'cancelled' });
    expect(markMade).not.toHaveBeenCalled();
  });
});

// De melding van 15 november: de eerste tik na het openen meldde "kon niet worden geschreven" terwijl
// het bestand er stond, en de tweede tik zette er een bestand met -2 naast.
describe('de eerste tik na het openen', () => {
  const N2 = 'ascend-2026-11-02-14u30-2.ascend-backup.json';
  const names = () => [...mem.files.keys()];
  const fast = { now: NOW, verifyPauseMs: 0 };

  it('koude start, de rename mislukt een keer: toch de eerste naam, geen volgnummer en geen rest', async () => {
    mem.renameFails = 1;
    expect(await saveManualBackup(appBackupFolder()!, TEXT, fast)).toEqual({ name: NAME });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
  });

  it('de rename meldt een fout terwijl het bestand er staat: gelukt onder de eerste naam, nooit -2', async () => {
    mem.renameCopiesThenFails = 1;
    expect(await saveManualBackup(appBackupFolder()!, TEXT, fast)).toEqual({ name: NAME });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
    expect(mem.files.get(`ASCEND/${NAME}`)).toBe(TEXT);
  });

  it('de map ASCEND bestaat nog niet: hij wordt bij het schrijven gemaakt', async () => {
    mem.noDir = true;
    expect(await saveManualBackup(appBackupFolder()!, TEXT, fast)).toEqual({ name: NAME });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
  });

  it('naam bezet door een echt ander bestand: een volgnummer, en het andere blijft heel', async () => {
    mem.files.set(`ASCEND/${NAME}`, 'een eerdere back-up');
    expect(await saveManualBackup(appBackupFolder()!, TEXT, fast)).toEqual({ name: N2 });
    expect(mem.files.get(`ASCEND/${NAME}`)).toBe('een eerdere back-up');
  });

  it('schrijven lukt, nakijken komt te vroeg: de tweede blik is goed en er komt geen fout', async () => {
    mem.statMisses = 2; // de eerste twee keer nakijken ziet het bestand nog niet
    expect(await saveManualBackup(appBackupFolder()!, TEXT, fast)).toEqual({ name: NAME });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
  });

  it('schrijven lukt, nakijken blijft mislukken: de echte reden, het bestand is weg en de volgende tik krijgt de eerste naam', async () => {
    const original = mem.files.set.bind(mem.files);
    // Het bestand komt beschadigd aan: korter dan wat er geschreven werd.
    mem.files.set = (k, v) => original(k, k.endsWith('.tmp') ? v.slice(0, 5) : v);
    const outcome = await runManualBackup({ prepare: async () => ({ text: TEXT, fileName: 'x.json' }), adapter: { saveBackup: async (d) => ({ success: true, savedTo: (await saveManualBackup(appBackupFolder()!, await d.text(), fast)).name }) }, markMade: async () => undefined });
    mem.files.set = original;
    expect(outcome).toEqual({ status: 'failed', message: 'Opslaan lukte niet: het bestand is geschreven, maar teruglezen lukte niet. Probeer het nog eens.' });
    expect(names()).toEqual([]);
    expect(await saveManualBackup(appBackupFolder()!, TEXT, fast)).toEqual({ name: NAME });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
  });

  it('nakijken mislukt en weghalen ook: de volgende tik vervangt het eigen halve bestand, zonder -2', async () => {
    const original = mem.files.set.bind(mem.files);
    mem.files.set = (k, v) => original(k, k.endsWith('.tmp') ? v.slice(0, 5) : v);
    mem.deleteFails = true;
    await expect(saveManualBackup(appBackupFolder()!, TEXT, fast)).rejects.toMatchObject({ reason: 'write', step: 'verify' });
    mem.files.set = original;
    expect(names()).toEqual([`ASCEND/${NAME}`]);
    mem.deleteFails = false;
    expect(await saveManualBackup(appBackupFolder()!, TEXT, fast)).toEqual({ name: NAME });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
    expect(mem.files.get(`ASCEND/${NAME}`)).toBe(TEXT);
  });

  it('het tijdelijke bestand lukt niet: de zin over ruimte, en er blijft niets achter', async () => {
    mem.failWrite = true;
    await expect(saveManualBackup(appBackupFolder()!, TEXT, fast)).rejects.toMatchObject({ reason: 'write', step: 'temp' });
    expect(names()).toEqual([]);
  });

  it('tweede tik terwijl de eerste nog loopt: dezelfde poging, één bestand, dezelfde naam', async () => {
    mem.writeDelayMs = 30;
    const folder = appBackupFolder()!;
    const [a, b] = await Promise.all([saveManualBackup(folder, TEXT, fast), saveManualBackup(folder, TEXT, fast)]);
    expect(a).toEqual({ name: NAME });
    expect(b).toEqual({ name: NAME });
    expect(mem.writes).toBe(1);
    expect(names()).toEqual([`ASCEND/${NAME}`]);
  });

  it('laat antwoord na de tijdsgrens: eerst "duurde te lang", de tik daarna meldt hetzelfde bestand en maakt geen tweede', async () => {
    mem.writeDelayMs = 60;
    const folder = appBackupFolder()!;
    await expect(saveManualBackup(folder, TEXT, { ...fast, limitMs: 10 })).rejects.toMatchObject({ reason: 'timeout' });
    // De telefoon antwoordt alsnog; de volgende tik valt in dezelfde minuut.
    expect(await saveManualBackup(folder, TEXT, fast)).toEqual({ name: NAME });
    expect(mem.writes).toBe(1);
    expect(names()).toEqual([`ASCEND/${NAME}`]);
    expect(mem.files.get(`ASCEND/${NAME}`)).toBe(TEXT);
  });

  it('een poging die nooit antwoordt houdt de knop niet voor altijd vast: na de grens begint een nieuwe', async () => {
    mem.hang = true;
    const folder = appBackupFolder()!;
    await expect(saveManualBackup(folder, TEXT, { ...fast, limitMs: 10 })).rejects.toMatchObject({ reason: 'timeout' });
    mem.hang = false;
    expect(await saveManualBackup(folder, TEXT, { ...fast, staleMs: 0 })).toEqual({ name: NAME });
    expect(names()).toEqual([`ASCEND/${NAME}`]);
  });
});
