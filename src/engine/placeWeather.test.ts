import { describe, expect, it } from 'vitest';

(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import type { PlannedSession, SessionTemplate } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { resolveWatchModel } from './watchFields';
import { makeForecast } from './fixtures/weatherFixture';
import { briefing, type BriefingInput } from './briefing';
import { PLACE_WEATHER_FROM_HOME, briefingWeather, placeWeatherFailed, placeWeatherTarget } from './placeWeather';
import { WEATHER_AT_PLACE_KM } from './places';
import { metersBetween } from './routeGeometry';
import { addDays } from '../utils/dates';

// Verzonnen punten: de coördinaten wijzen nergens heen. Een graad breedte is ongeveer 111 km.
const HOME = { lat: 50, lon: 4 };
const north = (km: number) => ({ lat: HOME.lat + km / 111.195, lon: HOME.lon });
const place = (km: number, name = 'Verwegdal') => ({ name, point: north(km) });

describe('placeWeatherTarget: voor welke plek een eigen voorspelling', () => {
  it('rond de grens van 10 km: net eronder niet, net erboven wel', () => {
    expect(metersBetween(north(9.9), HOME)).toBeLessThan(WEATHER_AT_PLACE_KM * 1000);
    expect(metersBetween(north(10.1), HOME)).toBeGreaterThan(WEATHER_AT_PLACE_KM * 1000);
    expect(placeWeatherTarget({ on: true, place: place(9.9), home: HOME })).toBeUndefined();
    expect(placeWeatherTarget({ on: true, place: place(10.1), home: HOME })).toMatchObject({ name: 'Verwegdal' });
  });
  it('rondt de plek af op twee decimalen, zoals het weer van huis', () => {
    const t = placeWeatherTarget({ on: true, place: { name: ' Verwegdal ', point: { lat: 50.87654, lon: 4.12345 } }, home: HOME });
    expect(t).toEqual({ name: 'Verwegdal', lat: 50.88, lon: 4.12 });
  });
  it('een plek zonder coördinaten of met kapotte coördinaten: geen eigen voorspelling', () => {
    expect(placeWeatherTarget({ on: true, place: { name: 'Zonder punt', point: undefined }, home: HOME })).toBeUndefined();
    expect(placeWeatherTarget({ on: true, place: { name: 'Kapot', point: { lat: Number.NaN, lon: 4 } }, home: HOME })).toBeUndefined();
    expect(placeWeatherTarget({ on: true, place: { name: 'Buiten de aarde', point: { lat: 95, lon: 4 } }, home: HOME })).toBeUndefined();
  });
  it('geen plek gekozen of de instelling uit: niets', () => {
    expect(placeWeatherTarget({ on: true, home: HOME })).toBeUndefined();
    expect(placeWeatherTarget({ on: false, place: place(80), home: HOME })).toBeUndefined();
  });
  it('geen Thuis: de afstand tot de plaats van het weer telt', () => {
    expect(placeWeatherTarget({ on: true, place: place(80), weatherHome: { name: 'Teststad', ...HOME } })).toBeDefined();
    expect(placeWeatherTarget({ on: true, place: place(3), weatherHome: { name: 'Teststad', ...HOME } })).toBeUndefined();
    // Een kapot Thuis telt als geen Thuis.
    expect(placeWeatherTarget({ on: true, place: place(3), home: { lat: 'x' }, weatherHome: HOME })).toBeUndefined();
  });
  it('geen Thuis en geen plaats voor het weer: er is geen weer van huis, dus de plek telt', () => {
    expect(placeWeatherTarget({ on: true, place: place(3) })).toBeDefined();
  });
  it('dicht bij Thuis maar ver van de plaats van het weer (je bent op reis): de plek telt', () => {
    expect(placeWeatherTarget({ on: true, place: place(3), home: HOME, weatherHome: north(300) })).toBeDefined();
  });
});

const TODAY = '2026-11-11';
const TOMORROW = addDays(TODAY, 1);
const homeForecast = makeForecast(TODAY, () => ({ tempC: 9, feelsC: 8 }));
// Op de plek is het vandaag 3 graden en morgen 1 graad.
const awayForecast = makeForecast(TODAY, (date) => (date === TODAY ? { tempC: 3, feelsC: 1 } : { tempC: 1, feelsC: -2 }));
const TARGET = { name: 'Verwegdal', lat: 50.72, lon: 4 };

describe('briefingWeather: welke voorspelling het vak leest', () => {
  it('geen plek ver weg: het weer van huis, zonder naam', () => {
    expect(briefingWeather(undefined, undefined, homeForecast)).toEqual({ forecast: homeForecast });
  });
  it('zolang de plek laadt: het weer van huis, nooit leeg', () => {
    expect(briefingWeather(TARGET, { status: 'loading' }, homeForecast)).toEqual({ forecast: homeForecast });
  });
  it('gelukt: de voorspelling van de plek, met de naam', () => {
    expect(briefingWeather(TARGET, { status: 'ok', forecast: awayForecast }, homeForecast)).toEqual({ forecast: awayForecast, place: { name: 'Verwegdal', state: 'shown' } });
  });
  it('netwerkfout of time-out: het weer van huis, en de plek staat als mislukt', () => {
    expect(briefingWeather(TARGET, { status: 'failed' }, homeForecast)).toEqual({ forecast: homeForecast, place: { name: 'Verwegdal', state: 'failed' } });
  });
});

const { templates } = buildDefaultProgramData();
const EASY = templates.find((t) => t.id === 'tpl_easy_run') as SessionTemplate;
const plan = (date: string): PlannedSession => ({ id: 'p1', templateId: EASY.id, scheduledDate: date, weekStartDate: '2026-11-09', status: 'planned', order: 0 });

function input(over: Partial<BriefingInput> = {}): BriefingInput {
  return {
    template: EASY, session: plan(TODAY), date: TODAY, now: new Date(2026, 10, 11, 8, 0), program: null, logs: [], routeOn: true,
    watchLink: { linked: true, autoTick: true, activities: true },
    watch: { showStatus: true, fieldsShown: true, model: resolveWatchModel(undefined), store: undefined, hasZonesNote: false },
    forecast: homeForecast, weatherOn: true, clothingOn: true, fuelOn: true, ...over,
  };
}
const weatherLine = (i: BriefingInput) => briefing(i)?.rows.find((r) => r.id === 'weather')?.line;

describe('de rij Weer in de Briefing met een plek ver weg', () => {
  it('zonder plek blijft de regel zoals hij was', () => {
    expect(weatherLine(input())).toMatch(/^9 graden, /);
  });
  it('toont het weer van de plek met de naam ervoor', () => {
    expect(weatherLine(input({ forecast: awayForecast, weatherPlace: { name: 'Verwegdal', state: 'shown' } }))).toMatch(/^In Verwegdal: 3 graden, /);
  });
  it('een plek zonder naam heet je plek', () => {
    expect(weatherLine(input({ forecast: awayForecast, weatherPlace: { name: '', state: 'shown' } }))).toMatch(/^In je plek: 3 graden/);
  });
  it('mislukt: het weer van huis met één eerlijke regel erachter', () => {
    const line = weatherLine(input({ weatherPlace: { name: 'Verwegdal', state: 'failed' } })) ?? '';
    expect(line).toMatch(/^9 graden, /);
    expect(line.endsWith(`${placeWeatherFailed('Verwegdal')} ${PLACE_WEATHER_FROM_HOME}`)).toBe(true);
    expect(line).not.toMatch(/[–—]/);
  });
  it('mislukt en ook geen weer van huis: nooit een leeg vak, de regel zegt wat er mis is', () => {
    expect(weatherLine(input({ forecast: undefined, weatherPlace: { name: 'Verwegdal', state: 'failed' } }))).toBe('Weer in Verwegdal laadde niet.');
  });
  it('alleen kleding aan: de naam staat er nog steeds bij', () => {
    expect(weatherLine(input({ weatherOn: false, forecast: awayForecast, weatherPlace: { name: 'Verwegdal', state: 'shown' } }))).toMatch(/^In Verwegdal: /);
  });
  it('binnen (loopband) is er geen rij Weer, ook niet met een plek', () => {
    const view = briefing(input({ storedPlace: 'run_treadmill', forecast: awayForecast, weatherPlace: { name: 'Verwegdal', state: 'shown' } }));
    expect(view?.place).toBe('run_treadmill');
    expect(view?.rows.find((r) => r.id === 'weather')).toBeUndefined();
  });
});

describe('de juiste dag uit de voorspelling van de plek', () => {
  const at = { name: 'Verwegdal', state: 'shown' } as const;
  it('de dag zelf: het weer van vandaag op de plek', () => {
    expect(weatherLine(input({ forecast: awayForecast, weatherPlace: at }))).toMatch(/^In Verwegdal: 3 graden/);
  });
  it('de avond ervoor, 23:30 in Amsterdam: het weer van morgen op de plek', () => {
    const line = weatherLine(input({ session: plan(TOMORROW), date: TOMORROW, now: new Date(2026, 10, 11, 23, 30), forecast: awayForecast, weatherPlace: at }));
    expect(line).toMatch(/^In Verwegdal: 1 graad, /);
  });
  it('net na middernacht in Amsterdam is morgen vandaag geworden: dezelfde dag uit de voorspelling', () => {
    // 00:15 in Amsterdam is in UTC nog de dag ervoor (23:15); de dag van de training blijft 12 november.
    const now = new Date('2026-11-11T23:15:00Z');
    expect(now.getHours()).toBe(0);
    const line = weatherLine(input({ session: plan(TOMORROW), date: TOMORROW, now, forecast: awayForecast, weatherPlace: at }));
    expect(line).toMatch(/^In Verwegdal: 1 graad, /);
  });
});
