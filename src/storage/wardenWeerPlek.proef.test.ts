// Warden, 15 november: proeftests voor de randen van Weer van de plek en De avond ervoor kent de plek
// (I-37, besluit docs/beslissingen/2026-11-15-avond-ervoor-kent-de-plek.md). Verzonnen plekken: de
// coördinaten wijzen nergens heen. Draai ook met TZ=Europe/Lisbon en TZ=Pacific/Auckland.
// Een test met "ROOD NU" is met opzet rood: hij beschrijft wat de herstelopdracht vraagt.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetaRepo, wipeAllData } from './database';
import { MAX_CACHED_PLACES, PLACE_WEATHER_KEY, loadPlaceWeather, readPlaceCache } from './placeWeather';
import { START_PLACE_CHOICE_KEY, readStartPlaceChoices, resetStartPlaceChoiceCache, saveStartPlaceChoice } from './startPlaceChoice';
import { buildBackupEnvelope } from './backupExport';
import { choiceFor, cleanChoices, eveningPlaceTarget, restoredStart, withChoice, type EveningPlaceInput, type StartPlaceChoice } from '../engine/startPlaceChoice';
import { rawOpenMeteo } from '../engine/fixtures/weatherFixture';
import { addDays, toISODate } from '../utils/dates';

const HOME = { lat: 50.01, lon: 4.01 };
const DAY = '2026-11-16';
const FAR: StartPlaceChoice = { date: DAY, name: 'Verwegdal', lat: 50.72345, lon: 4.10987, placeId: 'pl-1' };
const okFetch = () => vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(rawOpenMeteo()), { status: 200 }));
const asFetch = (f: unknown) => f as typeof fetch;
const T0 = new Date('2026-10-22T10:00:00Z');
const later = (min: number) => new Date(T0.getTime() + min * 60_000);
const spot = (n: number) => ({ name: `Plek ${n}`, lat: 50 + n, lon: 4.01 });

const evening = (over: Partial<EveningPlaceInput> = {}): EveningPlaceInput => ({
  placeWeatherOn: true,
  rememberOn: true,
  routeOn: true,
  sessions: [{ id: 's1', date: DAY, routeShown: true }],
  choices: { s1: FAR },
  today: addDays(DAY, -1),
  home: HOME,
  ...over,
});

describe('de gekozen plek per geplande training: de dag, middernacht en de klok van de telefoon', () => {
  it('telt de hele dag van de training op de klok van de telefoon, en is om 00:00 de dag erna weg', () => {
    const lateOnDay = toISODate(new Date(2026, 10, 16, 23, 59, 30));
    const justAfter = toISODate(new Date(2026, 10, 17, 0, 0, 0));
    expect(choiceFor({ s1: FAR }, 's1', DAY, lateOnDay)).toEqual(FAR);
    expect(choiceFor({ s1: FAR }, 's1', DAY, justAfter)).toBeUndefined();
  });
  it('de avond ervoor om 23:59 nog wel, na middernacht is morgen een andere dag en zwijgt de plek', () => {
    expect(eveningPlaceTarget(evening({ today: toISODate(new Date(2026, 10, 15, 23, 59)) }))?.target.name).toBe('Verwegdal');
    // Na middernacht vraagt de kaart om de trainingen van 17 november; die van de 16e staat er niet meer bij.
    expect(eveningPlaceTarget(evening({ today: DAY, sessions: [{ id: 's2', date: addDays(DAY, 1), routeShown: true }] }))).toBeUndefined();
  });
  it('een verplaatste training begint zonder plek; overslaan haalt hem uit de lijst van De avond ervoor', () => {
    expect(choiceFor({ s1: FAR }, 's1', addDays(DAY, 2), addDays(DAY, -1))).toBeUndefined();
    expect(eveningPlaceTarget(evening({ sessions: [{ id: 's1', date: addDays(DAY, 2), routeShown: true }] }))).toBeUndefined();
    expect(eveningPlaceTarget(evening({ sessions: [] }))).toBeUndefined();
  });
  it('vastleggen (mag): terug verplaatst naar de oude dag staat de oude plek er weer, zonder nieuwe tik', () => {
    expect(choiceFor({ s1: FAR }, 's1', DAY, addDays(DAY, -1))).toEqual(FAR);
  });
  it('opruimen: gisteren blijft (een dag speling voor een klok die terug gaat), eergisteren gaat weg; hoogstens zestig', () => {
    const today = '2026-11-20';
    const map = { a: { ...FAR, date: '2026-11-19' }, b: { ...FAR, date: '2026-11-18' } };
    expect(Object.keys(withChoice(map, 'c', { ...FAR, date: today }, today)).sort()).toEqual(['a', 'c']);
    const many = Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`s${i}`, { ...FAR, date: addDays(today, i) }]));
    const kept = withChoice(many, 'new', { ...FAR, date: today }, today);
    expect(Object.keys(kept)).toHaveLength(60);
    // Het plafond gooit de dichtste dagen weg, ook de keuze van zojuist: zestig latere dagen winnen.
    expect(kept.new).toBeUndefined();
  });
  it('een kapotte keuze (geen getal, buiten de aarde, geen dag) leest als geen keuze', () => {
    expect(cleanChoices({ a: { ...FAR, lat: Number.NaN }, b: { ...FAR, lon: 181 }, c: { ...FAR, date: '16-11-2026' }, d: { ...FAR, name: 3 } })).toEqual({});
  });
});

describe('privacy van de plek', () => {
  it('het weerdoel is op twee decimalen, ook als de plek preciezer bewaard staat; id en treffer gaan niet mee', () => {
    const found = eveningPlaceTarget(evening());
    expect(found?.target).toEqual({ name: 'Verwegdal', lat: 50.72, lon: 4.11 });
  });
  it('de aanroep naar het weer draagt alleen twee decimalen en geen naam', async () => {
    await wipeAllData();
    const f = okFetch();
    await loadPlaceWeather({ name: 'Verwegdal', lat: 50.72345, lon: 4.10987 }, { fetchImpl: asFetch(f), now: T0 });
    const url = String(f.mock.calls[0][0]);
    expect(url).toContain('latitude=50.72&');
    expect(url).toContain('longitude=4.11&');
    expect(url).not.toContain('Verwegdal');
    expect(url).not.toContain('72345');
  });
  it('binnen 10 km van huis: geen doel, dus geen aanroep; instelling uit: ook niet', () => {
    expect(eveningPlaceTarget(evening({ choices: { s1: { ...FAR, lat: 50.03, lon: 4.02 } } }))).toBeUndefined();
    expect(eveningPlaceTarget(evening({ rememberOn: false }))).toBeUndefined();
    expect(eveningPlaceTarget(evening({ placeWeatherOn: false }))).toBeUndefined();
    expect(eveningPlaceTarget(evening({ routeOn: false }))).toBeUndefined();
    expect(eveningPlaceTarget(evening({ sessions: [{ id: 's1', date: DAY, routeShown: false }] }))).toBeUndefined();
  });
  it('de keuze en het weer van de plek staan niet in de back-up', async () => {
    await wipeAllData();
    resetStartPlaceChoiceCache();
    await saveStartPlaceChoice('s1', FAR, addDays(DAY, -1));
    await loadPlaceWeather({ name: 'Verwegdal', lat: 50.72, lon: 4.11 }, { fetchImpl: asFetch(okFetch()), now: T0 });
    const text = JSON.stringify(await buildBackupEnvelope());
    for (const word of [START_PLACE_CHOICE_KEY, PLACE_WEATHER_KEY, 'Verwegdal', '50.72']) expect(text).not.toContain(word);
  });
  it('ROOD NU (moet 1): een bewaarde plek die gewist is krijgt in De avond ervoor geen weer meer, net als in de Briefing', () => {
    // De Briefing zet hem niet terug (restoredStart leest de lijst met plekken).
    expect(restoredStart(FAR, [])).toBeUndefined();
    // De avond ervoor kent de lijst niet en toont en haalt het weer van de gewiste plek nog steeds.
    expect(eveningPlaceTarget({ ...evening(), places: [] } as never)).toBeUndefined();
  });
  it('ROOD NU (moet 1): een hernoemde plek heet in De avond ervoor zoals in de Briefing', () => {
    const places = [{ id: 'pl-1', name: 'Nieuwe naam', lat: FAR.lat, lon: FAR.lon }];
    expect(restoredStart(FAR, places)?.name).toBe('Nieuwe naam');
    expect(eveningPlaceTarget({ ...evening(), places } as never)?.target.name).toBe('Nieuwe naam');
  });
});

describe('weercache per plek', () => {
  beforeEach(async () => {
    await wipeAllData();
  });
  it('zes plekken blijven, de zevende duwt de oudste eruit; de zes nieuwste kosten binnen het uur geen aanroep', async () => {
    const f = okFetch();
    for (let n = 0; n < MAX_CACHED_PLACES + 1; n++) await loadPlaceWeather(spot(n), { fetchImpl: asFetch(f), now: later(n) });
    const stored = readPlaceCache(await MetaRepo.get<unknown>(PLACE_WEATHER_KEY));
    expect(Object.keys(stored)).toHaveLength(MAX_CACHED_PLACES);
    expect(stored['50,4.01']).toBeUndefined();
    for (let n = 1; n <= MAX_CACHED_PLACES; n++) await loadPlaceWeather(spot(n), { fetchImpl: asFetch(f), now: later(20) });
    expect(f).toHaveBeenCalledTimes(MAX_CACHED_PLACES + 1);
    await loadPlaceWeather(spot(0), { fetchImpl: asFetch(f), now: later(21) });
    expect(f).toHaveBeenCalledTimes(MAX_CACHED_PLACES + 2);
  });
  it('de oude vorm (één forecast) leest nog, kost geen aanroep, en blijft staan als er een plek bij komt', async () => {
    const f = okFetch();
    const first = await loadPlaceWeather(spot(1), { fetchImpl: asFetch(f), now: T0 });
    if (first.status !== 'ok') throw new Error('geen voorspelling');
    await MetaRepo.set(PLACE_WEATHER_KEY, { forecast: first.forecast });
    expect((await loadPlaceWeather(spot(1), { fetchImpl: asFetch(f), now: later(30) })).status).toBe('ok');
    expect(f).toHaveBeenCalledTimes(1);
    await loadPlaceWeather(spot(2), { fetchImpl: asFetch(f), now: later(31) });
    const raw = await MetaRepo.get<{ forecast?: unknown; places?: Record<string, unknown> }>(PLACE_WEATHER_KEY);
    expect(raw?.forecast).toBeUndefined();
    expect(Object.keys(raw?.places ?? {}).sort()).toEqual(['51,4.01', '52,4.01']);
  });
  it('rommel in de sleutel (tekst, lijst, een halve voorspelling) is een lege cache en nooit een fout', async () => {
    for (const junk of ['x', [1, 2], { places: [{ fetchedAt: 'x' }] }, { places: { a: { fetchedAt: 3 } } }, { forecast: { hours: [] } }, null]) {
      expect(readPlaceCache(junk)).toEqual({});
      await MetaRepo.set(PLACE_WEATHER_KEY, junk);
      expect((await loadPlaceWeather(spot(1), { fetchImpl: asFetch(okFetch()), now: T0 })).status).toBe('ok');
    }
  });
  it('twee plekken tegelijk: beide staan er daarna in', async () => {
    const f = okFetch();
    await Promise.all([loadPlaceWeather(spot(1), { fetchImpl: asFetch(f), now: T0 }), loadPlaceWeather(spot(2), { fetchImpl: asFetch(f), now: T0 })]);
    expect(Object.keys(readPlaceCache(await MetaRepo.get<unknown>(PLACE_WEATHER_KEY))).sort()).toEqual(['51,4.01', '52,4.01']);
  });
  it('Nu verversen haalt altijd op, twee keer tikken is één aanroep, en een mislukte verversing laat het oude weer staan', async () => {
    const f = okFetch();
    await loadPlaceWeather(spot(1), { fetchImpl: asFetch(f), now: T0 });
    await Promise.all([
      loadPlaceWeather(spot(1), { fetchImpl: asFetch(f), now: later(1), force: true }),
      loadPlaceWeather(spot(1), { fetchImpl: asFetch(f), now: later(1), force: true }),
    ]);
    expect(f).toHaveBeenCalledTimes(2);
    const down = vi.fn(async () => { throw new TypeError('offline'); });
    expect((await loadPlaceWeather(spot(1), { fetchImpl: asFetch(down), now: later(2), force: true })).status).toBe('failed');
    const still = await loadPlaceWeather(spot(1), { fetchImpl: asFetch(down), now: later(3) });
    expect(still.status).toBe('ok');
  });
});

describe('opslag van de keuze', () => {
  beforeEach(async () => {
    await wipeAllData();
    resetStartPlaceChoiceCache();
  });
  it('twee trainingen tegelijk bewaard: beide staan er', async () => {
    const today = addDays(DAY, -1);
    await Promise.all([saveStartPlaceChoice('s1', FAR, today), saveStartPlaceChoice('s2', { ...FAR, name: 'Andersdorp' }, today)]);
    expect(Object.keys(await readStartPlaceChoices()).sort()).toEqual(['s1', 's2']);
  });
  it('wissen van een training zonder keuze schrijft niets en laat de rest staan', async () => {
    const today = addDays(DAY, -1);
    await saveStartPlaceChoice('s1', FAR, today);
    expect(await saveStartPlaceChoice('s9', undefined, today)).toBe(true);
    expect(await readStartPlaceChoices()).toEqual({ s1: FAR });
  });
  it('ROOD NU (mag 6): na Alles wissen kent ook het geheugen de plek niet meer', async () => {
    const { peekStartPlaceChoices } = await import('./startPlaceChoice');
    await saveStartPlaceChoice('s1', FAR, addDays(DAY, -1));
    await wipeAllData();
    expect(peekStartPlaceChoices()?.s1).toBeUndefined();
  });
});
