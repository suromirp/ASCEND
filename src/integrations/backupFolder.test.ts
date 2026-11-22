import { describe, expect, it } from 'vitest';
import { isAttemptRest, newAttemptId, verifySettled, writeThroughTemp, type Held, type TempFs } from './backupFolder';
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

  it('een eigen bestand van vandaag gaat eerst opzij en pas na een gelukte rename en keep weg', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'oud' });
    const renames: string[] = [];
    const spy: TempFs = { ...fs, rename: async (from, to) => { renames.push(`${from} > ${to}`); await fs.rename(from, to); } };
    await (await writeThroughTemp(spy, NAME, 'nieuw', 'p1')).keep();
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
  it('het oude bestand gaat pas weg na keep: tot dan staat het opzij', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'oud' });
    const written = await writeThroughTemp(fs, NAME, 'nieuw', 'p1');
    expect(Object.fromEntries(files)).toEqual({ [NAME]: 'nieuw', [`${NAME}.p1.old`]: 'oud' });
    await written.keep();
    expect([...files]).toEqual([[NAME, 'nieuw']]);
  });

  it('undo: het nieuwe bestand is kapot, dus het gaat weg en het oude komt terug', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'oud' });
    const written = await writeThroughTemp(fs, NAME, 'nieuw', 'p1');
    await written.undo();
    expect([...files]).toEqual([[NAME, 'oud']]);
  });

  it('undo: weghalen van het kapotte bestand lukt niet, en toch komt het oude terug onder de naam', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'oud' });
    const stuck: TempFs = {
      ...fs,
      remove: async (n) => {
        if (n === NAME) throw new Error('delete failed');
        await fs.remove(n);
      },
    };
    const written = await writeThroughTemp(stuck, NAME, 'nieuw', 'p1');
    await written.undo();
    expect([...files]).toEqual([[NAME, 'oud']]);
  });

  it('undo op een vrije naam haalt alleen het nieuwe bestand weg', async () => {
    const { fs, files } = memoryFs();
    const written = await writeThroughTemp(fs, NAME, 'nieuw', 'p1', { neverReplace: true });
    await written.undo();
    expect(files.size).toBe(0);
  });
});

describe('een poging die niet meer telt (I-69)', () => {
  it('niet meer gewenst: het tijdelijke bestand gaat weg en de nieuwere back-up onder de naam blijft onaangeroerd', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'nieuwer' });
    const err = await writeThroughTemp(fs, NAME, 'ouder', 'p1', { stillWanted: () => false }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AutoBackupError);
    expect([...files]).toEqual([[NAME, 'nieuwer']]);
  });

  it('niet meer gewenst op een vrije naam: er komt niets onder de naam', async () => {
    const { fs, files } = memoryFs();
    await expect(writeThroughTemp(fs, NAME, 'ouder', 'p1', { stillWanted: () => false })).rejects.toBeInstanceOf(AutoBackupError);
    expect(files.size).toBe(0);
  });

  it('de vraag wordt pas gesteld na het tijdelijke bestand, vlak voor de naam', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'nieuwer' });
    let wanted = true;
    const slow: TempFs = { ...fs, writeFile: async (n, t) => { await fs.writeFile(n, t); wanted = false; } };
    await expect(writeThroughTemp(slow, NAME, 'ouder', 'p1', { stillWanted: () => wanted })).rejects.toBeInstanceOf(AutoBackupError);
    expect([...files]).toEqual([[NAME, 'nieuwer']]);
  });

  it('nog gewenst: het gewone pad, met het oude bestand opzij tot keep', async () => {
    const { fs, files } = memoryFs({ [NAME]: 'oud' });
    const written = await writeThroughTemp(fs, NAME, 'nieuw', 'p1', { stillWanted: () => true });
    expect(Object.fromEntries(files)).toEqual({ [NAME]: 'nieuw', [`${NAME}.p1.old`]: 'oud' });
    await written.keep();
    expect([...files]).toEqual([[NAME, 'nieuw']]);
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

describe('resten van een poging', () => {
  it('alleen een id met het vaste begin telt als rest; een eigen woord van tien tekens niet', () => {
    const id = newAttemptId(new Date(2026, 10, 15, 20));
    expect(isAttemptRest(`${NAME}.${id}.tmp`, NAME)).toBe(true);
    expect(isAttemptRest(`${NAME}.${id}.old`, NAME)).toBe(true);
    for (const yours of ['mijnkopie1', 'zondagavond2', 'kopie', 'mi0abc12x9k3', 'ascpoging']) {
      expect(isAttemptRest(`${NAME}.${yours}.old`, NAME)).toBe(false);
    }
    // Een rest op een andere naam valt er niet onder.
    expect(isAttemptRest(`ascend-2026-11-01.ascend-backup.json.${id}.tmp`, NAME)).toBe(false);
  });

  it('twee pogingen krijgen een ander id', () => {
    const now = new Date(2026, 10, 15, 20);
    expect(newAttemptId(now)).not.toBe(newAttemptId(now));
  });
});
