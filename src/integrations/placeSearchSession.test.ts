// Zoeken op plaatsnaam in het blad Nieuwe plek: pauze, grens in tijd, uitkomst en sluiten. Nagemaakte namen.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaceSearch, searchInTurn } from './placeSearchSession';
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

describe('searchInTurn: eerst Open-Meteo, dan Photon', () => {
  const top: FoundPlace = { name: 'Verzonnen Kop', lat: 47.1, lon: 9.5, kind: 'peak', country: 'Fantasia' };
  const live = () => new AbortController().signal;
  it('de eerste vindt iets: de tweede wordt niet gevraagd', async () => {
    const second = vi.fn(async () => [top]);
    expect(await searchInTurn('Heuvelrug', live(), async () => [hit('Heuvelrug')], second)).toEqual([hit('Heuvelrug')]);
    expect(second).not.toHaveBeenCalled();
  });
  it('de eerste leeg en de tweede vindt iets: de treffers van de tweede, dubbelen één keer', async () => {
    const second = vi.fn(async () => [top, { ...top, name: 'Verzonnen Kop (punt)' }]);
    expect(await searchInTurn('Verzonnen Kop', live(), async () => [], second)).toEqual([top]);
    expect(second).toHaveBeenCalledWith('Verzonnen Kop', expect.anything());
  });
  it('beide leeg: niets', async () => {
    expect(await searchInTurn('Xyzzy', live(), async () => [], async () => [])).toEqual([]);
  });
  it('de tweede faalt: het blijft bij niets gevonden, geen fout', async () => {
    expect(await searchInTurn('Xyzzy', live(), async () => [], async () => { throw new Error('photon: 503'); })).toEqual([]);
  });
  it('de eerste faalt: zijn fout is de uitkomst en de tweede wordt niet gevraagd', async () => {
    const second = vi.fn(async () => [top]);
    await expect(searchInTurn('Xyzzy', live(), async () => { throw new OpenMeteoError('server', 'x'); }, second)).rejects.toBeInstanceOf(OpenMeteoError);
    expect(second).not.toHaveBeenCalled();
  });
  it('gestopt tijdens de eerste: geen aanroep meer naar de tweede', async () => {
    const stop = new AbortController();
    const second = vi.fn(async () => [top]);
    await searchInTurn('Xyzzy', stop.signal, async () => { stop.abort(); return []; }, second);
    expect(second).not.toHaveBeenCalled();
  });
});

describe('createPlaceSearch met twee bronnen', () => {
  const top: FoundPlace = { name: 'Verzonnen Kop', lat: 47.1, lon: 9.5, kind: 'peak', country: 'Fantasia' };
  it('een adres met komma: alleen het deel ervoor gaat naar de dienst, het veld houdt de hele tekst', async () => {
    const t = setup(async () => [top]);
    t.s.type('Verzonnen Kop, Bergweg 1, 1234 AB Fopdorp');
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS);
    expect(t.search.mock.calls[0][0]).toBe('Verzonnen Kop');
    expect(t.last()).toEqual({ kind: 'results', query: 'Verzonnen Kop, Bergweg 1, 1234 AB Fopdorp', results: [top] });
  });
  it('de tweede bron hangt: na de ene grens van 8 s Zoeken duurde te lang, en zijn vraag is gestopt', async () => {
    let photonSignal: AbortSignal | undefined;
    const t = setup((q, s) => searchInTurn(q, s, async () => [], (_q, s2) => { photonSignal = s2; return new Promise(() => undefined); }));
    t.s.type('Verzonnen Kop');
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS + PLACE_SEARCH_LIMIT_MS - 1);
    expect(t.last()).toEqual({ kind: 'busy', query: 'Verzonnen Kop' });
    await vi.advanceTimersByTimeAsync(1);
    expect(t.last()).toEqual({ kind: 'timeout' });
    expect(photonSignal?.aborted).toBe(true);
  });
  it('de tweede bron geeft een fout: de melding Geen plaats gevonden blijft', async () => {
    const t = setup((q, s) => searchInTurn(q, s, async () => [], async () => { throw new TypeError('Failed to fetch'); }));
    t.s.type('Verzonnen Kop');
    await vi.advanceTimersByTimeAsync(PLACE_SEARCH_PAUSE_MS);
    expect(t.last()).toEqual({ kind: 'none', query: 'Verzonnen Kop' });
  });
});
