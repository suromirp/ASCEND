import { describe, expect, it } from 'vitest';
import { writeThroughTemp, type TempFs } from './backupFolder';
import { AutoBackupError, NameTakenError } from '../engine/autoBackup';

const NAME = 'ascend-2026-11-02.ascend-backup.json';

// Een map in het geheugen. `hidden`: namen die bezet zijn maar die de app niet ziet (Android 11 en
// nieuwer, een bestand van een vorige installatie). `failRenameTo`: hernoemen naar die naam mislukt.
function memoryFs(start: Record<string, string> = {}, opts: { hidden?: string[]; failRenameTo?: string[] } = {}) {
  const files = new Map(Object.entries(start));
  const hidden = new Set(opts.hidden ?? []);
  const failTo = new Set(opts.failRenameTo ?? []);
  const fs: TempFs = {
    exists: async (n) => files.has(n),
    writeFile: async (n, text) => {
      files.set(n, text);
    },
    rename: async (from, to) => {
      if (hidden.has(to) || failTo.has(to) || files.has(to)) throw new Error('rename failed');
      if (!files.has(from)) throw new Error('missing');
      files.set(to, files.get(from)!);
      files.delete(from);
    },
    remove: async (n) => {
      files.delete(n);
    },
  };
  return { fs, files };
}

describe('schrijven via een tijdelijk bestand', () => {
  it('een vrije naam: tijdelijk bestand met de id van de poging, dan hernoemd', async () => {
    const { fs, files } = memoryFs();
    await writeThroughTemp(fs, NAME, 'nieuw', 'p1');
    expect([...files]).toEqual([[NAME, 'nieuw']]);
  });

  it('een eigen bestand van vandaag gaat eerst opzij en pas na een gelukte rename weg', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'oud' });
    const renames: string[] = [];
    const spy: TempFs = { ...fs, rename: async (from, to) => { renames.push(`${from} > ${to}`); await fs.rename(from, to); } };
    await writeThroughTemp(spy, NAME, 'nieuw', 'p1');
    expect(renames).toEqual([`${NAME} > ${NAME}.p1.old`, `${NAME}.p1.tmp > ${NAME}`]);
    expect([...files]).toEqual([[NAME, 'nieuw']]);
  });

  it('mislukt de rename, dan komt het eigen bestand terug en is het tijdelijke weg', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'oud' });
    let first = true;
    const flaky: TempFs = {
      ...fs,
      rename: async (from, to) => {
        if (from.endsWith('.tmp') && first) {
          first = false;
          throw new Error('rename failed');
        }
        await fs.rename(from, to);
      },
    };
    await expect(writeThroughTemp(flaky, NAME, 'nieuw', 'p1')).rejects.toBeInstanceOf(AutoBackupError);
    expect([...files]).toEqual([[NAME, 'oud']]);
  });

  it('een naam die vrij leek maar bezet is: NameTakenError, en niets blijft achter', async () => {
    const { fs, files } = memoryFs({}, { hidden: [NAME] });
    await expect(writeThroughTemp(fs, NAME, 'nieuw', 'p1')).rejects.toBeInstanceOf(NameTakenError);
    expect(files.size).toBe(0);
  });

  it('een tijdelijk bestand van een afgebroken oude poging blijft onaangeroerd', async () => {
    const { fs, files } = memoryFs({ [`${NAME}.oud.tmp`]: 'half', [`${NAME}.oud.old`]: 'vorige' });
    await writeThroughTemp(fs, NAME, 'nieuw', 'p2');
    expect(files.get(`${NAME}.oud.tmp`)).toBe('half');
    expect(files.get(`${NAME}.oud.old`)).toBe('vorige');
    expect(files.get(NAME)).toBe('nieuw');
  });

  it('neverReplace: een bestaande naam geeft meteen NameTakenError en er verandert niets', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'vreemd' });
    await expect(writeThroughTemp(fs, NAME, 'nieuw', 'p1', { neverReplace: true })).rejects.toBeInstanceOf(NameTakenError);
    expect([...files]).toEqual([[NAME, 'vreemd']]);
  });

  it('neverReplace op een vrije naam schrijft gewoon', async () => {
    const { fs, files } = memoryFs();
    await writeThroughTemp(fs, NAME, 'nieuw', 'p1', { neverReplace: true });
    expect([...files]).toEqual([[NAME, 'nieuw']]);
  });
});
