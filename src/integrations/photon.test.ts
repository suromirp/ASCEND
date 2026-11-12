// Photon als tweede zoekdienst van Andere plek: de aanvraag en de vertaling. Nagemaakte namen en plekken.
import { describe, expect, it, vi } from 'vitest';
import { mapPhoton, photonKind, photonUrl, searchPhoton } from './photon';

const feature = (name: unknown, key: string, value: string, lon: unknown, lat: unknown, more: Record<string, unknown> = {}) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [lon, lat] },
  properties: { name, osm_key: key, osm_value: value, ...more },
});
const body = (...features: unknown[]) => ({ type: 'FeatureCollection', features });

describe('photonUrl', () => {
  it('stuurt alleen het zoekwoord en een aantal, zonder taal of plek', () => {
    const url = new URL(photonUrl('  Verzonnen Kop '));
    expect(url.origin + url.pathname).toBe('https://photon.komoot.io/api/');
    expect([...url.searchParams.keys()].sort()).toEqual(['limit', 'q']);
    expect(url.searchParams.get('q')).toBe('Verzonnen Kop');
    expect(url.searchParams.get('limit')).toBe('8');
  });
});

describe('photonKind', () => {
  it('een top, natuur of plaats; al het andere hoort hier niet', () => {
    expect(photonKind('natural', 'peak')).toBe('peak');
    expect(photonKind('natural', 'hill')).toBe('peak');
    expect(photonKind('natural', 'heath')).toBe('nature');
    expect(photonKind('leisure', 'nature_reserve')).toBe('nature');
    expect(photonKind('boundary', 'national_park')).toBe('nature');
    expect(photonKind('place', 'village')).toBe('place');
    expect(photonKind('place', 'house')).toBeUndefined();
    expect(photonKind('shop', 'bakery')).toBeUndefined();
    expect(photonKind('highway', 'residential')).toBeUndefined();
    expect(photonKind(undefined, 'peak')).toBeUndefined();
  });
});

describe('mapPhoton', () => {
  it('een top met naam, soort, regio en land; de plek op vijf decimalen', () => {
    const found = mapPhoton(body(feature('Verzonnen Kop', 'natural', 'peak', 9.5678912, 47.1234567, { state: 'Fantasieland-Noord', country: 'Fantasia' })));
    expect(found).toEqual([{ name: 'Verzonnen Kop', lat: 47.12346, lon: 9.56789, kind: 'peak', region: 'Fantasieland-Noord', country: 'Fantasia' }]);
  });
  it('de regio is de staat, anders de streek, en nooit de naam zelf', () => {
    const [a, b] = mapPhoton(body(
      feature('Nepveen', 'leisure', 'nature_reserve', 5.5, 52.5, { county: 'Verzinstreek' }),
      feature('Fopdorp', 'place', 'village', 5.6, 52.6, { state: 'Fopdorp', country: 'Fantasia' }),
    ));
    expect(a.region).toBe('Verzinstreek');
    expect(a.country).toBeUndefined();
    expect(b.region).toBeUndefined();
  });
  it('rijen zonder naam, zonder plek of van een andere soort vallen weg', () => {
    const found = mapPhoton(body(
      feature(undefined, 'natural', 'peak', 9.5, 47.1),
      feature('  ', 'natural', 'peak', 9.5, 47.1),
      feature('Bakker Nep', 'shop', 'bakery', 9.5, 47.1),
      feature('Geen plek', 'natural', 'peak', undefined, 47.1),
      feature('Naast de aarde', 'natural', 'peak', 9.5, 147.1),
      feature('Niet eindig', 'natural', 'peak', Number.NaN, 47.1),
      null,
      feature('Blijft', 'natural', 'peak', 9.5, 47.1),
    ));
    expect(found.map((f) => f.name)).toEqual(['Blijft']);
  });
  it('niets gevonden is een lege lijst; een vreemd antwoord gooit', () => {
    expect(mapPhoton(body())).toEqual([]);
    expect(() => mapPhoton({})).toThrow();
    expect(() => mapPhoton(null)).toThrow();
  });
});

describe('searchPhoton', () => {
  it('vraagt het adres van photonUrl met het signaal en geeft de treffers', async () => {
    const stop = new AbortController();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(body(feature('Verzonnen Kop', 'natural', 'peak', 9.5, 47.1)))));
    const found = await searchPhoton('Verzonnen Kop', { signal: stop.signal, fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(found[0].name).toBe('Verzonnen Kop');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(photonUrl('Verzonnen Kop'));
    expect(init.signal).toBe(stop.signal);
  });
  it('een fout van de dienst gooit', async () => {
    const fetchImpl = (async () => new Response('x', { status: 503 })) as unknown as typeof fetch;
    await expect(searchPhoton('Verzonnen Kop', { fetchImpl })).rejects.toThrow();
  });
});
