import { describe, expect, it } from 'vitest';
import { verifySettled, writeThroughTemp, type TempFs } from './backupFolder';
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

  it('blijft de rename mislukken, dan komt het eigen bestand terug en is het tijdelijke weg', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'oud' });
    const broken: TempFs = {
      ...fs,
      pauseMs: 0,
      rename: async (from, to) => {
        if (from.endsWith('.tmp')) throw new Error('rename failed');
        await fs.rename(from, to);
      },
    };
    const err = await writeThroughTemp(broken, NAME, 'nieuw', 'p1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AutoBackupError);
    expect((err as AutoBackupError).step).toBe('rename');
    expect([...files]).toEqual([[NAME, 'oud']]);
  });

  it('eerste aanroep na een koude start: de rename mislukt een keer en lukt daarna, zonder volgnummer', async () => {
    const { fs, files } = memoryFs();
    let calls = 0;
    const cold: TempFs = {
      ...fs,
      pauseMs: 0,
      rename: async (from, to) => {
        if (++calls === 1) throw new Error('rename failed');
        await fs.rename(from, to);
      },
    };
    await writeThroughTemp(cold, NAME, 'nieuw', 'p1', { neverReplace: true });
    expect(calls).toBe(2);
    expect([...files]).toEqual([[NAME, 'nieuw']]);
  });

  it('de rename meldt een fout terwijl het bestand er al staat: gelukt, en het tijdelijke bestand is weg', async () => {
    // Zo doet de plugin het: hernoemen lukt niet, hij kopieert naar de echte naam en meldt daarna een fout
    // omdat het tijdelijke bestand niet weg wilde.
    const { fs, files } = memoryFs();
    let calls = 0;
    const copied: TempFs = {
      ...fs,
      pauseMs: 0,
      holds: async (n, text) => files.get(n) === text,
      rename: async (from, to) => {
        calls++;
        files.set(to, files.get(from)!);
        throw new Error('Unknown error');
      },
    };
    await writeThroughTemp(copied, NAME, 'nieuw', 'p1', { neverReplace: true });
    expect(calls).toBe(1);
    expect([...files]).toEqual([[NAME, 'nieuw']]);
  });

  it('de kopie van de plugin brak halverwege af: het halve bestand gaat weg en er komt geen volgnummer', async () => {
    const { fs, files } = memoryFs();
    const half: TempFs = {
      ...fs,
      pauseMs: 0,
      holds: async (n, text) => files.get(n) === text,
      rename: async (from, to) => {
        files.set(to, files.get(from)!.slice(0, 2));
        throw new Error('Unknown error');
      },
    };
    const err = await writeThroughTemp(half, NAME, 'nieuw', 'p1', { neverReplace: true }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AutoBackupError);
    expect((err as AutoBackupError).step).toBe('rename');
    expect(files.size).toBe(0);
  });

  it('de rename meldt een fout en er staat iets anders onder de naam: geen succes', async () => {
    const { fs, files } = memoryFs({}, { hidden: [NAME] });
    const other: TempFs = { ...fs, pauseMs: 0, holds: async () => false };
    await expect(writeThroughTemp(other, NAME, 'nieuw', 'p1')).rejects.toBeInstanceOf(NameTakenError);
    expect(files.size).toBe(0);
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

describe('nakijken geeft niet te vroeg op', () => {
  it('de eerste keer nog niet te lezen, de tweede keer wel: goed', async () => {
    let calls = 0;
    expect(await verifySettled({ verify: async () => ++calls > 1 }, NAME, 5, { pauseMs: 0 })).toBe(true);
    expect(calls).toBe(2);
  });

  it('blijft het mislukken, dan stopt het na drie keer', async () => {
    let calls = 0;
    const verify = async () => {
      calls++;
      throw new Error('stat failed');
    };
    expect(await verifySettled({ verify }, NAME, 5, { pauseMs: 0 })).toBe(false);
    expect(calls).toBe(3);
  });
});
