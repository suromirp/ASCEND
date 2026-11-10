import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutoBackupError } from '../engine/autoBackup';
import { gpxCourseName, routeGpx } from '../engine/gpx';
import { sendLine } from '../engine/routeSend';
import { cacheSender, type CacheShare, type FileSender, type SendResult } from '../integrations/fileSender';
import { APP_LIMIT_MS, BROWSER_LIMIT_MS, sendRouteGpx } from './routeSend';

function sender(platform: 'app' | 'browser', run: () => Promise<SendResult>) {
  const calls: string[] = [];
  const s: FileSender = { platform, send: (name, text, mimeType, title) => { calls.push(`${name}|${mimeType}|${title}|${text}`); return run(); } };
  return { s, calls };
}

afterEach(() => vi.useRealTimers());

describe('sendRouteGpx', () => {
  it('biedt het bestand aan met een naam zonder plek, voor Simpel en Avontuurlijk', async () => {
    const { s, calls } = sender('app', async () => 'offered');
    expect(await sendRouteGpx('<gpx/>', 'simple', '2026-11-10', s)).toEqual({ kind: 'offered' });
    expect(await sendRouteGpx('<gpx/>', 'adventure', '2026-11-10', s)).toEqual({ kind: 'offered' });
    expect(calls).toEqual([
      'ascend-route-simpel-2026-11-10.gpx|application/gpx+xml|Koers openen met|<gpx/>',
      'ascend-route-avontuurlijk-2026-11-10.gpx|application/gpx+xml|Koers openen met|<gpx/>',
    ]);
  });

  it('delen geannuleerd is geen fout', async () => {
    const outcome = await sendRouteGpx('<gpx/>', 'simple', '2026-11-10', sender('browser', async () => 'cancelled').s);
    expect(outcome).toEqual({ kind: 'cancelled' });
    expect(sendLine(outcome)).toEqual({ text: 'Niets gedeeld.', warn: false });
  });

  it('delen niet beschikbaar: een uitkomst die naar de download wijst', async () => {
    const outcome = await sendRouteGpx('<gpx/>', 'simple', '2026-11-10', null);
    expect(outcome).toEqual({ kind: 'unavailable' });
    expect(sendLine(outcome).text).toContain('GPX downloaden');
  });

  it('schrijven mislukt: er is niets aangeboden en dat staat er', async () => {
    const outcome = await sendRouteGpx('<gpx/>', 'simple', '2026-11-10', sender('app', async () => { throw new AutoBackupError('write'); }).s);
    expect(outcome).toEqual({ kind: 'failed', step: 'file' });
    expect(sendLine(outcome)).toEqual({ text: 'Het bestand klaarzetten lukte niet. Probeer het nog eens.', warn: true });
  });

  it('het venster openen mislukt: gooit niet en wijst naar de download', async () => {
    const outcome = await sendRouteGpx('<gpx/>', 'simple', '2026-11-10', sender('app', async () => { throw new Error('geen app'); }).s);
    expect(outcome).toEqual({ kind: 'failed', step: 'open' });
    expect(sendLine(outcome).warn).toBe(true);
  });

  it('in de app is een antwoord dat niet komt na de grens een fout, geen eeuwig wachten', async () => {
    vi.useFakeTimers();
    const pending = sendRouteGpx('<gpx/>', 'simple', '2026-11-10', sender('app', () => new Promise<SendResult>(() => undefined)).s);
    await vi.advanceTimersByTimeAsync(APP_LIMIT_MS + 1);
    expect(await pending).toEqual({ kind: 'failed', step: 'slow' });
  });

  // De hele keten met de echte weg van de app (cacheSender) op een nagemaakte cachemap.
  function chain(writeFile: CacheShare['fs']['writeFile']) {
    const files = new Map<string, string>();
    const opened: string[] = [];
    const s = cacheSender({
      fs: {
        exists: async (n) => files.has(n),
        writeFile: (n, t) => writeFile(n, t).then(() => { files.set(n, t); }),
        rename: async (from, to) => { files.set(to, files.get(from)!); files.delete(from); },
        remove: async (n) => { files.delete(n); },
      },
      clear: async () => files.clear(),
      open: async (name) => { opened.push(name); },
    });
    return { s, files, opened };
  }

  it('schrijven mislukt halverwege: geen bestand, geen venster, en dat staat er', async () => {
    const { s, files, opened } = chain(async () => { throw new Error('schijf vol'); });
    const outcome = await sendRouteGpx('<gpx/>', 'adventure', '2026-11-10', s);
    expect(outcome).toEqual({ kind: 'failed', step: 'file' });
    expect([...files.keys()]).toEqual([]);
    expect(opened).toEqual([]);
  });

  it('schrijven dat pas na de grens klaar is, opent geen venster meer', async () => {
    vi.useFakeTimers();
    const { s, opened } = chain(() => new Promise<void>((resolve) => setTimeout(resolve, APP_LIMIT_MS + 5000)));
    const pending = sendRouteGpx('<gpx/>', 'simple', '2026-11-10', s);
    await vi.advanceTimersByTimeAsync(APP_LIMIT_MS + 1);
    expect(await pending).toEqual({ kind: 'failed', step: 'slow' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(opened).toEqual([]);
  });

  it('de keten lukt: het bestand staat klaar en de keuzelijst opent één keer', async () => {
    const { s, files, opened } = chain(async () => undefined);
    expect(await sendRouteGpx('<gpx/>', 'simple', '2026-11-10', s)).toEqual({ kind: 'offered' });
    expect([...files.keys()]).toEqual(['ascend-route-simpel-2026-11-10.gpx']);
    expect(opened).toEqual(['ascend-route-simpel-2026-11-10.gpx']);
  });

  it('in de browser is de knop na de grens weer vrij, zonder fout', async () => {
    vi.useFakeTimers();
    const pending = sendRouteGpx('<gpx/>', 'simple', '2026-11-10', sender('browser', () => new Promise<SendResult>(() => undefined)).s);
    await vi.advanceTimersByTimeAsync(BROWSER_LIMIT_MS + 1);
    const outcome = await pending;
    expect(outcome).toEqual({ kind: 'waiting' });
    expect(sendLine(outcome).warn).toBe(false);
  });
});

describe('het bestand bij Startpunt Precies en Ongeveer', () => {
  // Nagemaakte punten, geen echte plek. Precies begint bij een eigen punt, Ongeveer bij de afgeronde plek.
  const rest = [{ lat: 52.104, lon: 5.906, ele: 30 }, { lat: 52.108, lon: 5.902, ele: 42 }];
  const approx = [{ lat: 52.1, lon: 5.9, ele: 21 }, ...rest, { lat: 52.1, lon: 5.9, ele: 21 }];
  const exact = [{ lat: 52.10123, lon: 5.90456, ele: 22 }, ...rest, { lat: 52.10123, lon: 5.90456, ele: 22 }];
  const name = gpxCourseName('adventure', 8240);

  it('is gelijk op de punten na: zelfde naam, zelfde opbouw, geen extra veld voor het startpunt', () => {
    const a = routeGpx(approx, name);
    const e = routeGpx(exact, name);
    const strip = (gpx: string) => gpx.split('\n').filter((l) => !l.includes('<trkpt '));
    expect(strip(e)).toEqual(strip(a));
    expect(e).not.toMatch(/<wpt|<time|<desc|<author>|<link/);
    expect(e).toContain('<trkpt lat="52.101230" lon="5.904560"><ele>22.0</ele></trkpt>');
    expect(a.split('\n').filter((l) => l.includes('<trkpt ')).slice(1, 3)).toEqual(e.split('\n').filter((l) => l.includes('<trkpt ')).slice(1, 3));
  });
});
