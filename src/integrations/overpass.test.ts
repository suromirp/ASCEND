import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_RADIUS_M, OVERPASS_URL, OVERPASS_TIMEOUT_MS, distanceMeters, elevationUrl, fetchNearbyTerrain, mapElevation, mapOverpass, overpassQuery } from './overpass';

// Nagemaakte plek en antwoorden: geen netwerk, geen echte plaats.
const place = { name: 'Ergens', lat: 52.123456, lon: 5.654321 };
const rounded = { name: '', lat: 52.12, lon: 5.65 };

const answer = {
  elements: [
    { type: 'node', id: 1, lat: 52.13, lon: 5.65, tags: { natural: 'hill' } },
    { type: 'way', id: 2, center: { lat: 52.121, lon: 5.651 }, tags: { highway: 'steps' } },
    { type: 'way', id: 3, center: { lat: 52.125, lon: 5.66 }, tags: { highway: 'path', surface: 'dirt' } },
    { type: 'way', id: 4, center: { lat: 52.122, lon: 5.652 }, tags: { leisure: 'track', sport: 'athletics' } },
    { type: 'node', id: 5, lat: 52.3, lon: 5.9, tags: { natural: 'hill' } }, // buiten de straal
    { type: 'node', id: 6, tags: { natural: 'hill' } }, // zonder positie
    { type: 'node', id: 7, lat: 52.121, lon: 5.651, tags: { amenity: 'bench' } }, // geen soort van ons
  ],
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('de Overpass-vraag', () => {
  it('stuurt alleen een afgeronde plek mee, nooit de exacte positie of de naam', () => {
    const q = overpassQuery(place);
    expect(q).toContain('52.12,5.65');
    expect(q).not.toContain('52.123456');
    expect(q).not.toContain('5.654321');
    expect(q).not.toContain('Ergens');
    expect(q).toContain(`around:${DEFAULT_RADIUS_M}`);
  });

  it('de hoogte-aanroep krijgt ook alleen afgeronde of kaartpunten', () => {
    expect(elevationUrl([{ lat: 52.12, lon: 5.65 }, { lat: 52.13, lon: 5.65 }])).toBe('https://api.open-meteo.com/v1/elevation?latitude=52.12,52.13&longitude=5.65,5.65');
  });
});

describe('mapOverpass', () => {
  it('maakt van een antwoord soorten met een afstand, dichtstbijzijnde eerst', () => {
    const f = mapOverpass(answer, rounded);
    expect(f.map((x) => x.kind)).toEqual(['steps', 'track', 'dirt_path', 'hill']);
    expect(f[0].distanceM).toBeLessThan(f[1].distanceM + 1);
    expect(f.every((x) => x.distanceM <= DEFAULT_RADIUS_M * 1.1)).toBe(true);
  });

  it('een leeg antwoord is een lege lijst, een kapot antwoord een fout', () => {
    expect(mapOverpass({ elements: [] }, rounded)).toEqual([]);
    expect(() => mapOverpass({ remark: 'te druk' }, rounded)).toThrow();
    expect(() => mapOverpass(null, rounded)).toThrow();
  });

  it('afstand klopt ongeveer: 0,01 graad breedte is ruim een kilometer', () => {
    const d = distanceMeters(52.12, 5.65, 52.13, 5.65);
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1120);
  });
});

describe('mapElevation', () => {
  it('geeft de hoogtes of niets als het aantal of de getallen niet kloppen', () => {
    expect(mapElevation({ elevation: [3, 60] }, 2)).toEqual([3, 60]);
    expect(mapElevation({ elevation: [3] }, 2)).toBeUndefined();
    expect(mapElevation({ elevation: [3, 'x'] }, 2)).toBeUndefined();
    expect(mapElevation({}, 2)).toBeUndefined();
  });
});

describe('fetchNearbyTerrain', () => {
  const route = (overpass: () => Promise<Response>, elevation: () => Promise<Response>) =>
    vi.fn(async (url: string | URL | Request) => (String(url).startsWith(OVERPASS_URL) ? overpass() : elevation()));

  it('zoekt, vraagt de hoogtes en geeft het hoogteverschil met de plek', async () => {
    const f = route(async () => json(answer), async () => json({ elevation: [10, 70] }));
    const t = await fetchNearbyTerrain(place, { fetchImpl: f as unknown as typeof fetch, now: new Date('2026-11-08T10:00:00.000Z') });
    expect(t?.source).toBe('osm');
    expect(t?.place).toEqual(rounded);
    expect(t?.features.find((x) => x.kind === 'hill')?.heightM).toBe(60);
    // Overpass kreeg een POST zonder exacte positie.
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(String(init.body)).not.toContain('52.123456');
    expect(JSON.stringify(t)).not.toContain('Ergens');
  });

  it('een mislukte hoogte laat de heuvel staan zonder maat', async () => {
    const f = route(async () => json(answer), async () => json({}, 500));
    const t = await fetchNearbyTerrain(place, { fetchImpl: f as unknown as typeof fetch });
    expect(t?.features.find((x) => x.kind === 'hill')).toBeDefined();
    expect(t?.features.find((x) => x.kind === 'hill')?.heightM).toBeUndefined();
  });

  it('leeg: er ligt niets in de buurt is een echt antwoord, zonder hoogte-aanroep', async () => {
    const f = route(async () => json({ elements: [] }), async () => json({ elevation: [] }));
    const t = await fetchNearbyTerrain(place, { fetchImpl: f as unknown as typeof fetch });
    expect(t?.features).toEqual([]);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('zwijgt bij een fout, een storing, geen netwerk en een kapot antwoord', async () => {
    expect(await fetchNearbyTerrain(place, { fetchImpl: vi.fn(async () => json({}, 429)) as unknown as typeof fetch })).toBeUndefined();
    expect(await fetchNearbyTerrain(place, { fetchImpl: vi.fn(async () => json({}, 504)) as unknown as typeof fetch })).toBeUndefined();
    expect(await fetchNearbyTerrain(place, { fetchImpl: vi.fn(async () => { throw new TypeError('offline'); }) as unknown as typeof fetch })).toBeUndefined();
    expect(await fetchNearbyTerrain(place, { fetchImpl: vi.fn(async () => json({ remark: 'x' })) as unknown as typeof fetch })).toBeUndefined();
  });

  it('breekt af na de tijdgrens als er niets terugkomt', async () => {
    vi.useFakeTimers();
    try {
      const hanging = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_res, rej) => {
        init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
      }));
      const pending = fetchNearbyTerrain(place, { fetchImpl: hanging as unknown as typeof fetch });
      await vi.advanceTimersByTimeAsync(OVERPASS_TIMEOUT_MS + 100);
      expect(await pending).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});
