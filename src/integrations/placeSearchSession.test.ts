// Zoeken op plaatsnaam in het blad Nieuwe plek: pauze, grens in tijd, uitkomst en sluiten. Nagemaakte namen.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaceSearch } from './placeSearchSession';
import { OpenMeteoError } from './openMeteo';
import { PLACE_SEARCH_LIMIT_MS, PLACE_SEARCH_MAX, PLACE_SEARCH_PAUSE_MS, type FoundPlace, type PlaceSearchView } from '../engine/placeSearch';

const hit = (name: string): FoundPlace => ({ name, lat: 52, lon: 5, region: 'Gelderland', country: 'Nederland' });

function setup(answer: (q: string, signal: AbortSignal) => Promise<FoundPlace[]>, online = true) {
  const views: PlaceSearchView[] = [];
  const search = vi.fn(answer);
  const s = createPlaceSearch((v) => views.push(v), { search, online: () => online });
  return { s, views, search, last: () => views[views.length - 1] };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createPlaceSearch', () => {
  it('leeg zoekwoord: geen aanroep, niets te melden', async () => {
    const t = setup(async () => [hit('Heuvelrug')]);
    t.s.type('');
    t.s.type('   ');
    t.s.submit();
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS * 3);
    expect(t.search).not.toHaveBeenCalled();
    expect(t.last()).toEqual({ kind: 'idle' });
  });
  it('één letter: geen aanroep, wel de regel', async () => {
    const t = setup(async () => [hit('Heuvelrug')]);
    t.s.type('H');
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS * 3);
    expect(t.search).not.toHaveBeenCalled();
    expect(t.last()).toEqual({ kind: 'short' });
  });
  it('zoekt na een pauze in het typen, niet per letter', async () => {
    const t = setup(async () => [hit('Heuvelrug')]);
    for (const q of ['He', 'Heu', 'Heuv', 'Heuve']) {
      t.s.type(q);
      await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS - 100);
    }
    expect(t.search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(t.search).toHaveBeenCalledTimes(1);
    expect(t.search.mock.calls[0][0]).toBe('Heuve');
    expect(t.last()).toEqual({ kind: 'results', query: 'Heuve', results: [hit('Heuvelrug')] });
  });
  it('Zoek op het toetsenbord zoekt meteen; hoogstens acht treffers', async () => {
    const t = setup(async () => Array.from({ length: 12 }, (_, i) => hit(`Plek ${i}`)));
    t.s.type('Plek');
    t.s.submit();
    await vi.advanceTimersByTimeAsync(0);
    expect(t.search).toHaveBeenCalledTimes(1);
    const v = t.last();
    expect(v.kind === 'results' && v.results.length).toBe(PLACE_SEARCH_MAX);
  });
  it('geen resultaten', async () => {
    const t = setup(async () => []);
    t.s.type('Xyzzy');
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS);
    expect(t.last()).toEqual({ kind: 'none', query: 'Xyzzy' });
  });
  it('offline: geen aanroep, de regel zonder netwerk', async () => {
    const t = setup(async () => [hit('Heuvelrug')], false);
    t.s.type('Heuvelrug');
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS);
    expect(t.search).not.toHaveBeenCalled();
    expect(t.last()).toEqual({ kind: 'offline' });
  });
  it('een netwerkfout telt als offline, een andere fout zegt zijn eigen regel', async () => {
    const t = setup(async () => { throw new OpenMeteoError('network', 'x'); });
    t.s.type('Heuvelrug');
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS);
    expect(t.last()).toEqual({ kind: 'offline' });
    const u = setup(async () => { throw new OpenMeteoError('server', 'Open-Meteo heeft een storing.'); });
    u.s.type('Heuvelrug');
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS);
    expect(u.last()).toEqual({ kind: 'error', message: 'Open-Meteo heeft een storing.' });
  });
  it('trage dienst: na de grens Zoeken duurde te lang, de vraag is gestopt en een laat antwoord telt niet', async () => {
    let resolve: (r: FoundPlace[]) => void = () => undefined;
    let signal: AbortSignal | undefined;
    const t = setup((_q, s) => { signal = s; return new Promise((r) => { resolve = r; }); });
    t.s.type('Heuvelrug');
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS);
    expect(t.last()).toEqual({ kind: 'busy', query: 'Heuvelrug' });
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_LIMIT_MS);
    expect(t.last()).toEqual({ kind: 'timeout' });
    expect(signal?.aborted).toBe(true);
    resolve([hit('Heuvelrug')]);
    await vi.advanceTimersByTimeAsync(0);
    expect(t.last()).toEqual({ kind: 'timeout' });
  });
  it('een nieuw woord stopt de vraag die liep', async () => {
    const signals: AbortSignal[] = [];
    const t = setup((_q, s) => { signals.push(s); return new Promise(() => undefined); });
    t.s.type('Heuvel');
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS);
    t.s.type('Heuvelrug');
    expect(signals[0].aborted).toBe(true);
  });
  it('sluiten tijdens de pauze: geen aanroep meer', async () => {
    const t = setup(async () => [hit('Heuvelrug')]);
    t.s.type('Heuvelrug');
    t.s.close();
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_LIMIT_MS * 2);
    expect(t.search).not.toHaveBeenCalled();
    t.s.type('Andere');
    t.s.submit();
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_LIMIT_MS);
    expect(t.search).not.toHaveBeenCalled();
  });
  it('sluiten tijdens het zoeken: de vraag stopt en er komt geen uitkomst meer', async () => {
    let signal: AbortSignal | undefined;
    let resolve: (r: FoundPlace[]) => void = () => undefined;
    const t = setup((_q, s) => { signal = s; return new Promise((r) => { resolve = r; }); });
    t.s.type('Heuvelrug');
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS);
    const before = t.views.length;
    t.s.close();
    expect(signal?.aborted).toBe(true);
    resolve([hit('Heuvelrug')]);
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_LIMIT_MS);
    expect(t.views.length).toBe(before);
    expect(t.search).toHaveBeenCalledTimes(1);
  });
});
