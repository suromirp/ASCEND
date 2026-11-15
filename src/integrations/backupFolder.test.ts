import { describe, expect, it } from 'vitest';
import { verifySettled, writeThroughTemp, type Held, type TempFs } from './backupFolder';
import { AutoBackupError, NameTakenError } from '../engine/autoBackup';

const NAME = 'ascend-2026-11-02.ascend-backup.json';

// Een map in het geheugen, die hernoemt zoals de plugin het echt doet (ionfilesystem `renameFile`): het
// doel gaat eerst weg, dan komt de bron ervoor in de plaats. Een bestaand bestand beschermt dus zichzelf
// niet; dat moet de laag doen. `hidden`: namen die bezet zijn maar die de app niet ziet (Android 11 en
// nieuwer, een bestand van een vorige installatie): hernoemen ernaartoe mislukt. `failRenameTo` ook.
function memoryFs(start: Record<string, string> = {}, opts: { hidden?: string[]; failRenameTo?: string[] } = {}) {
  const files = new Map(Object.entries(start));
  const hidden = new Set(opts.hidden ?? []);
  const failTo = new Set(opts.failRenameTo ?? []);
  const fs: TempFs = {
    pauseMs: 0,
    exists: async (n) => files.has(n),
    writeFile: async (n, text) => {
      files.set(n, text);
    },
    rename: async (from, to) => {
      if (!files.has(from)) throw new Error('missing');
      files.delete(to);
      if (hidden.has(to) || failTo.has(to)) throw new Error('rename failed');
      files.set(to, files.get(from)!);
      files.delete(from);
    },
    remove: async (n) => {
      files.delete(n);
    },
    holds: async (n, text): Promise<Held> => (!files.has(n) ? 'absent' : files.get(n) === text ? 'same' : 'different'),
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

  it('de rename meldt een fout en de naam blijft leeg: bezet door een bestand dat de app niet ziet', async () => {
    const { fs, files } = memoryFs({}, { hidden: [NAME] });
    await expect(writeThroughTemp(fs, NAME, 'nieuw', 'p1')).rejects.toBeInstanceOf(NameTakenError);
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
  it('hernoemen lukt, de brug meldt toch een fout en het eerste teruglezen faalt: het bestand blijft en het is gelukt', async () => {
    const { fs, files } = memoryFs();
    let reads = 0;
    const bridge: TempFs = {
      ...fs,
      rename: async (from, to) => {
        await fs.rename(from, to);
        throw new Error('bridge error');
      },
      holds: async (n, text) => {
        if (++reads === 1) throw new Error('read failed');
        return fs.holds!(n, text);
      },
    };
    await writeThroughTemp(bridge, NAME, 'nieuw', 'p1', { neverReplace: true });
    expect(reads).toBe(2);
    expect([...files]).toEqual([[NAME, 'nieuw']]);
  });

  it('teruglezen blijft mislukken: het bestand blijft staan en de fout is nakijken, geen volgnummer', async () => {
    const { fs, files } = memoryFs();
    const blind: TempFs = {
      ...fs,
      rename: async (from, to) => {
        await fs.rename(from, to);
        throw new Error('bridge error');
      },
      holds: async () => 'unknown',
    };
    const err = await writeThroughTemp(blind, NAME, 'nieuw', 'p1', { neverReplace: true }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AutoBackupError);
    expect((err as AutoBackupError).step).toBe('verify');
    expect([...files]).toEqual([[NAME, 'nieuw']]);
  });

  it('een eigen bestand ging opzij en teruglezen lukt niet: er gaat niets weg, ook het oude niet', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'oud' });
    const blind: TempFs = {
      ...fs,
      rename: async (from, to) => {
        await fs.rename(from, to);
        if (from.endsWith('.tmp')) throw new Error('bridge error');
      },
      holds: async () => 'unknown',
    };
    await expect(writeThroughTemp(blind, NAME, 'nieuw', 'p1')).rejects.toMatchObject({ step: 'verify' });
    expect(Object.fromEntries(files)).toEqual({ [NAME]: 'nieuw', [`${NAME}.p1.old`]: 'oud' });
  });

  it('de blik of de naam vrij is hapert: dat telt als bezet, en het bestand dat er staat blijft heel', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'van jou' });
    const flaky: TempFs = {
      ...fs,
      exists: async (n) => {
        if (n === NAME) throw new Error('stat failed');
        return fs.exists(n);
      },
    };
    await expect(writeThroughTemp(flaky, NAME, 'nieuw', 'p1', { neverReplace: true })).rejects.toBeInstanceOf(NameTakenError);
    expect([...files]).toEqual([[NAME, 'van jou']]);
  });

  it('neverReplace: komt er tijdens het schrijven iets onder de naam, dan wordt het niet vervangen', async () => {
    const { fs, files } = memoryFs();
    const racing: TempFs = {
      ...fs,
      writeFile: async (n, text) => {
        await fs.writeFile(n, text);
        files.set(NAME, 'van een ander');
      },
    };
    await expect(writeThroughTemp(racing, NAME, 'nieuw', 'p1', { neverReplace: true })).rejects.toBeInstanceOf(NameTakenError);
    expect([...files]).toEqual([[NAME, 'van een ander']]);
  });
});

describe('nakijken geeft niet te vroeg op', () => {
  it('de eerste keer nog niet te lezen, de tweede keer wel: goed', async () => {
    let calls = 0;
    expect(await verifySettled({ verify: async () => ++calls > 1 }, NAME, 5, { pauseMs: 0 })).toBe('ok');
    expect(calls).toBe(2);
  });

  it('blijft het mislukken, dan stopt het na drie keer', async () => {
    let calls = 0;
    const verify = async () => {
      calls++;
      throw new Error('stat failed');
    };
    // Een fout bij het nakijken zelf zegt niets over het bestand.
    expect(await verifySettled({ verify }, NAME, 5, { pauseMs: 0 })).toBe('unknown');
    expect(calls).toBe(3);
  });

  it('gelezen maar het klopt niet: kapot, en dat is iets anders dan niet te lezen', async () => {
    expect(await verifySettled({ verify: async () => 'broken' }, NAME, 5, { pauseMs: 0 })).toBe('broken');
    expect(await verifySettled({ verify: async () => false }, NAME, 5, { pauseMs: 0 })).toBe('broken');
    expect(await verifySettled({ verify: async () => 'unknown' }, NAME, 5, { pauseMs: 0 })).toBe('unknown');
  });
});
