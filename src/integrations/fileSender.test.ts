import { describe, expect, it } from 'vitest';
import { AutoBackupError } from '../engine/autoBackup';
import { browserSender, cacheSender, type CacheShare } from './fileSender';

// Een nagemaakte cachemap: namen en inhoud in het geheugen.
function fakeShare(over: Partial<CacheShare['fs']> = {}) {
  const files = new Map<string, string>([['oud.gpx', 'oud']]);
  const opened: string[] = [];
  const share: CacheShare = {
    fs: {
      exists: async (n) => files.has(n),
      writeFile: async (n, t) => { files.set(n, t); },
      rename: async (from, to) => { files.set(to, files.get(from)!); files.delete(from); },
      remove: async (n) => { files.delete(n); },
      ...over,
    },
    clear: async () => files.clear(),
    open: async (name, mimeType, title) => { opened.push(`${name}|${mimeType}|${title}|${files.get(name)}`); },
  };
  return { share, files, opened };
}

describe('cacheSender (de weg in de Android-app)', () => {
  it('zet alleen dit ene bestand klaar en opent daarna de keuzelijst', async () => {
    const { share, files, opened } = fakeShare();
    expect(await cacheSender(share).send('lus.gpx', '<gpx/>', 'application/gpx+xml', 'Koers openen met')).toBe('offered');
    expect([...files.keys()]).toEqual(['lus.gpx']);
    expect(opened).toEqual(['lus.gpx|application/gpx+xml|Koers openen met|<gpx/>']);
  });

  it('schrijven mislukt halverwege: geen half bestand en geen venster', async () => {
    const { share, files, opened } = fakeShare({
      writeFile: async (n) => { files.set(n, '<gp'); throw new Error('schijf vol'); },
    });
    await expect(cacheSender(share).send('lus.gpx', '<gpx/>', 'application/gpx+xml', 't')).rejects.toBeInstanceOf(AutoBackupError);
    expect([...files.keys()]).toEqual([]);
    expect(opened).toEqual([]);
  });

  it('hernoemen mislukt: het tijdelijke bestand gaat weg en er opent niets', async () => {
    const { share, files, opened } = fakeShare({ rename: async () => { throw new Error('nee'); } });
    await expect(cacheSender(share).send('lus.gpx', '<gpx/>', 'application/gpx+xml', 't')).rejects.toThrow();
    expect([...files.keys()]).toEqual([]);
    expect(opened).toEqual([]);
  });

  it('opruimen dat mislukt houdt het aanbieden niet tegen', async () => {
    const { share, opened } = fakeShare();
    share.clear = async () => { throw new Error('map bestaat niet'); };
    expect(await cacheSender(share).send('lus.gpx', '<gpx/>', 'application/gpx+xml', 't')).toBe('offered');
    expect(opened).toHaveLength(1);
  });
});

describe('browserSender (het deelvenster van de browser)', () => {
  const probe = { name: 'lus.gpx', mimeType: 'application/gpx+xml' };

  it('is er niet zonder delen van bestanden', () => {
    expect(browserSender(undefined, probe)).toBeNull();
    expect(browserSender({}, probe)).toBeNull();
    // Delen van tekst kan, van bestanden niet.
    expect(browserSender({ share: async () => undefined }, probe)).toBeNull();
    // De browser weigert dit type.
    expect(browserSender({ share: async () => undefined, canShare: () => false }, probe)).toBeNull();
    expect(browserSender({ share: async () => undefined, canShare: () => { throw new Error('x'); } }, probe)).toBeNull();
  });

  it('deelt het bestand met naam en type', async () => {
    const seen: File[] = [];
    const sender = browserSender({ share: async (d) => { seen.push(...d.files); }, canShare: () => true }, probe)!;
    expect(sender.platform).toBe('browser');
    expect(await sender.send('lus.gpx', '<gpx/>', 'application/gpx+xml', 't')).toBe('shared');
    expect(seen.map((f) => `${f.name}|${f.type}|${f.size}`)).toEqual(['lus.gpx|application/gpx+xml|6']);
  });

  it('wegtikken is geen fout, iets anders wel', async () => {
    const abort = Object.assign(new Error('weg'), { name: 'AbortError' });
    const cancelled = browserSender({ share: async () => { throw abort; }, canShare: () => true }, probe)!;
    expect(await cancelled.send('lus.gpx', 'x', 'application/gpx+xml', 't')).toBe('cancelled');
    const broken = browserSender({ share: async () => { throw new Error('stuk'); }, canShare: () => true }, probe)!;
    await expect(broken.send('lus.gpx', 'x', 'application/gpx+xml', 't')).rejects.toThrow('stuk');
  });
});
