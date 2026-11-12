// Andere plek: de pure regels (besluit 2026-11-12-andere-plek.md). Alle namen en punten zijn nagemaakt.
import { describe, expect, it } from 'vitest';
import { PLACE_NONE_LINE, PLACE_OFFLINE_LINE, PLACE_SHORT_LINE, PLACE_TIMEOUT_LINE, SAME_PLACE_M, clipName, placeLabel, placeQuery, placeSearchLine, placeToSave, placeWhere, savedAt, type FoundPlace } from './placeSearch';
import { savePlace, readPlaceStore, type PlacesMeta } from '../storage/places';
import { metersBetween } from './routeGeometry';
import type { Place } from '../models/place';

const found = (name: string, lat: number, lon: number, region?: string, country = 'Nederland'): FoundPlace => ({ name, lat, lon, region, country });
const saved = (id: string, name: string, lat: number, lon: number, home = false): Place => ({ id, name, lat, lon, source: 'search', createdAt: '2026-11-01', ...(home ? { home: true as const } : {}) });

describe('placeQuery en de regel', () => {
  it('leeg en één letter zoeken niet', () => {
    expect(placeQuery('')).toBe('empty');
    expect(placeQuery('   ')).toBe('empty');
    expect(placeQuery('H')).toBe('short');
    expect(placeQuery(' H ')).toBe('short');
    expect(placeQuery('He')).toBe('ok');
  });
  it('elke stand heeft een zichtbare uitkomst, behalve niets getypt en treffers', () => {
    expect(placeSearchLine({ kind: 'idle' })).toBe('');
    expect(placeSearchLine({ kind: 'short' })).toBe(PLACE_SHORT_LINE);
    expect(placeSearchLine({ kind: 'busy', query: 'Heuveltop' })).toBe('Zoeken naar Heuveltop');
    expect(placeSearchLine({ kind: 'none', query: 'Xyz' })).toBe(PLACE_NONE_LINE);
    expect(placeSearchLine({ kind: 'offline' })).toBe(PLACE_OFFLINE_LINE);
    expect(placeSearchLine({ kind: 'timeout' })).toBe(PLACE_TIMEOUT_LINE);
    expect(placeSearchLine({ kind: 'error', message: 'Storing.' })).toBe('Storing.');
    expect(placeSearchLine({ kind: 'results', query: 'He', results: [] })).toBe('');
  });
  it('geen gedachtestreepjes in de regels', () => {
    for (const l of [PLACE_SHORT_LINE, PLACE_NONE_LINE, PLACE_OFFLINE_LINE, PLACE_TIMEOUT_LINE]) expect(l).not.toMatch(/[–—]/);
  });
  it('regio en land onder de naam, wat er is', () => {
    expect(placeWhere(found('Heuvelrug', 52, 5, 'Gelderland'))).toBe('Gelderland, Nederland');
    expect(placeWhere({ country: 'België' })).toBe('België');
    expect(placeWhere({})).toBe('');
  });
});

describe('bewaren zonder dubbel', () => {
  const ridge = found('Heuvelrug', 52.0, 5.5, 'Gelderland');
  it('een nieuwe treffer wordt een nieuwe plek met herkomst zoeken', () => {
    const next = placeToSave(ridge, [], '2026-11-12', 'place_a');
    expect(next).toEqual({ kind: 'new', place: { id: 'place_a', name: 'Heuvelrug', lat: 52, lon: 5.5, source: 'search', createdAt: '2026-11-12' } });
  });
  it('dezelfde plek twee keer bewaren geeft de bewaarde plek terug', () => {
    const first = placeToSave(ridge, [], '2026-11-12', 'place_a');
    const second = placeToSave(ridge, [first.place], '2026-11-12', 'place_b');
    expect(second).toEqual({ kind: 'same', place: first.place });
  });
  it('binnen 100 m is dezelfde plek, Thuis ook; verder weg niet', () => {
    const home = saved('place_home', 'Thuis', 52.0, 5.5005, true);
    expect(metersBetween(ridge, home)).toBeLessThan(SAME_PLACE_M);
    expect(savedAt(ridge, [home])?.id).toBe('place_home');
    expect(savedAt(found('Heuvelrug', 52.01, 5.5), [home])).toBeUndefined();
  });
  it('een bewaarde plek met dezelfde naam ergens anders: de regio komt erbij, daarna een nummer', () => {
    const other = saved('place_x', 'Heuvelrug', 52.3, 5.9);
    const far = found('Heuvelrug', 52.0, 5.5, 'Gelderland');
    expect(placeLabel(far, [other])).toBe('Heuvelrug, Gelderland');
    expect(placeLabel(far, [other, saved('place_y', 'heuvelrug, gelderland', 51, 4)])).toBe('Heuvelrug, Gelderland 2');
    expect(placeToSave(far, [other], '2026-11-12', 'place_b').place.name).toBe('Heuvelrug, Gelderland');
  });
  it('een lange naam wordt op een woordgrens afgekapt met een beletselteken (route-blok)', () => {
    expect(clipName('Uitkijkpunt aan de oostkant van het rivierdal')).toBe('Uitkijkpunt aan de oostkant van het…');
    expect(clipName('Kort')).toBe('Kort');
    expect(clipName('Eenheelerglangwoordzonderspatiesdatnietpastinveertigtekens')).toHaveLength(40);
    expect(clipName('Eenheelerglangwoordzonderspatiesdatnietpastinveertigtekens').endsWith('…')).toBe(true);
  });
  it('een lange naam blijft binnen 40 tekens', () => {
    const long = found('Natuurgebied met een heel erg lange naam die niet past', 52, 5);
    expect(placeLabel(long, []).length).toBeLessThanOrEqual(40);
  });
  it('twee keer bewaren via de bestaande opslag geeft één plek', async () => {
    const data = new Map<string, unknown>();
    const meta: PlacesMeta = { get: async (k) => data.get(k), write: async (puts) => { for (const [k, v] of Object.entries(puts)) data.set(k, v); } };
    for (const id of ['place_a', 'place_b']) {
      const { places } = await readPlaceStore(meta);
      const next = placeToSave(ridge, places, '2026-11-12', id);
      if (next.kind === 'new') expect(await savePlace(next.place, meta)).toBe(true);
    }
    const read = await readPlaceStore(meta);
    expect(read.places.map((p) => p.id)).toEqual(['place_a']);
  });
});
