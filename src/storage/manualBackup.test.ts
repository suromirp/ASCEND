import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutoBackupError } from '../engine/autoBackup';

// Een nagebouwde Android-map in het geheugen, achter de nagebootste plugin Filesystem.
const mem = vi.hoisted(() => ({
  files: new Map<string, string>(),
  permission: 'granted' as string,
  hang: false,
  failWrite: false,
  hidden: new Set<string>(),
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
        return { size: bytes(mem.files.get(p)!) };
      },
      readFile: (o) => ({ data: mem.files.get((o as { path: string }).path) ?? '' }),
      writeFile: (o) => {
        if (mem.hang) return new Promise(() => undefined);
        if (mem.failWrite) throw new Error('No space left on device');
        const { path, data } = o as { path: string; data: string };
        mem.files.set(path, data);
        return {};
      },
      rename: (o) => {
        const { from, to } = o as { from: string; to: string };
        if (mem.hidden.has(to) || mem.files.has(to)) throw new Error('rename failed');
        mem.files.set(to, mem.files.get(from)!);
        mem.files.delete(from);
      },
      deleteFile: (o) => void mem.files.delete((o as { path: string }).path),
    }),
  };
});

import { webBackupFileAdapter } from './backupFileAdapter';
import { runManualBackup, saveManualBackup } from './manualBackup';
import { APP_BACKUP_LABEL, appBackupFolder } from '../integrations/backupFolder';

const NOW = new Date(2026, 10, 2, 14, 30);
const NAME = 'ascend-2026-11-02-14u30.ascend-backup.json';
const TEXT = JSON.stringify({ backupSchemaVersion: 5, payload: {} });

beforeEach(() => {
  mem.files.clear();
  mem.permission = 'granted';
  mem.hang = false;
  mem.failWrite = false;
  mem.hidden.clear();
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
