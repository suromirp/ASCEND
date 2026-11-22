import { describe, expect, it } from 'vitest';
import type { RoutePoint, RouteProposal } from '../models/route';
import { mapForecast } from '../integrations/openMeteo';
import { makeForecast, rawOpenMeteo } from './fixtures/weatherFixture';
import { metersBetween, offsetPoint } from './routeGeometry';
import { WIND_MIN_KMH, orientByWind, windForStart, windEnds, windLine, windWord } from './routeWind';

// Nagemaakt: een startpunt dat nergens is.
const START: RoutePoint = { lat: 52.1, lon: 5.9 };

function line(from: RoutePoint, to: RoutePoint): RoutePoint[] {
  const steps = Math.max(1, Math.round(metersBetween(from, to) / 50));
  return Array.from({ length: steps + 1 }, (_, i) => ({ lat: from.lat + (to.lat - from.lat) * (i / steps), lon: from.lon + (to.lon - from.lon) * (i / steps), ele: 10 }));
}

// Een driehoek uit de start: 4 km naar het zuidzuidoosten, 4 km naar het westnoordwesten en terug.
const A = offsetPoint(START, 165, 4000);
const B = offsetPoint(A, 285, 4000);
const loopPoints: RoutePoint[] = [...line(START, A), ...line(A, B).slice(1), ...line(B, START).slice(1)];
const loop = (points: RoutePoint[] = loopPoints, style: RouteProposal['style'] = 'adventure'): RouteProposal => ({ style, source: 'brouter', points, distanceM: 12000, ascentM: 0, repeatedShare: 0 });

const SW = { fromDeg: 225, kmh: 25 };

describe('windForStart', () => {
  const forecast = makeForecast('2026-11-25', (_d, h) => (h === 9 ? { windKmh: 25, windDirDeg: 225 } : undefined));
  it('leest de wind op het uur van de start', () => {
    expect(windForStart(forecast, '2026-11-25', 9, new Date(2026, 10, 22, 8))).toEqual(SW);
  });
  it('neemt zonder uur het uur van nu, alleen vandaag', () => {
    const now = new Date(2026, 10, 25, 9, 20);
    expect(windForStart(forecast, '2026-11-25', undefined, now)).toEqual(SW);
    expect(windForStart(forecast, '2026-11-26', undefined, now)).toBeUndefined();
  });
  it('geeft niets zonder voorspelling, zonder richting of zonder dat uur', () => {
    expect(windForStart(undefined, '2026-11-25', 9, new Date())).toBeUndefined();
    expect(windForStart(forecast, '2026-11-25', 10, new Date())).toBeUndefined();
    expect(windForStart(forecast, '2026-12-25', 9, new Date())).toBeUndefined();
  });
});

describe('orientByWind', () => {
  it('draait de lus als het eerste derde dan meer tegen de wind in gaat (zuidwestenwind)', () => {
    // Wind uit het zuidwesten: de lus begint naar het zuidzuidoosten (half tegen de wind in); andersom begint recht tegen de wind in.
    const result = orientByWind(loop(), SW);
    expect(result.points[1]).toEqual(loopPoints[loopPoints.length - 2]);
    expect(windEnds(loopPoints, 225)!.start).toBeCloseTo(0.5, 1);
    expect(windEnds(result.points, 225)!.start).toBeGreaterThan(0.9);
  });
  it('laat de lus staan als hij al tegen de wind in begint', () => {
    const p = loop();
    expect(orientByWind(p, { fromDeg: 165, kmh: 25 })).toBe(p);
  });
  it('doet niets bij zwakke of onbekende wind', () => {
    const p = loop();
    expect(orientByWind(p, { fromDeg: 225, kmh: WIND_MIN_KMH - 1 })).toBe(p);
    expect(orientByWind(p, undefined)).toBe(p);
  });
  it('doet niets bij een lus heen en terug over hetzelfde pad', () => {
    const p = loop(loopPoints, 'simple');
    expect(orientByWind(p, SW)).toBe(p);
  });
  it('is deterministisch en bewaart de afstand', () => {
    const a = orientByWind(loop(), SW);
    expect(orientByWind(loop(), SW)).toEqual(a);
    expect(a.distanceM).toBe(12000);
  });
});

describe('windLine', () => {
  it('zegt dat je tegen de wind in begint en hem terug mee hebt', () => {
    expect(windLine(orientByWind(loop(), SW), SW)).toBe('Je begint tegen de wind in (zuidwest, 25 km/u) en hebt hem op de terugweg mee.');
  });
  it('zegt na Andersom eerlijk dat je met de wind mee begint', () => {
    expect(windLine(loop(), { fromDeg: 345, kmh: 25 })).toMatch(/^Je begint met de wind mee \(noord, 25 km\/u\)/);
  });
  it('zegt bij dwarse wind dat hij dwars staat', () => {
    // Wind uit het westen staat dwars op een begin naar het zuidzuidoosten.
    expect(windLine(loop(), { fromDeg: 255, kmh: 20 })).toBe('De wind (west, 20 km/u) staat dwars op deze lus.');
  });
  it('is leeg bij zwakke of onbekende wind en bij Simpel', () => {
    expect(windLine(loop(), { fromDeg: 225, kmh: 8 })).toBe('');
    expect(windLine(loop(), undefined)).toBe('');
    expect(windLine(loop(loopPoints, 'simple'), SW)).toBe('');
  });
  it('noemt de windrichting in woorden', () => {
    expect(windWord(225)).toBe('zuidwest');
    expect(windWord(359)).toBe('noord');
  });
});

describe('de voorspelling', () => {
  it('neemt de windrichting mee uit Open-Meteo, en laat hem weg als hij ontbreekt', () => {
    const raw = rawOpenMeteo();
    const place = { name: '', lat: 50, lon: 4 };
    expect(mapForecast(raw, place, '2026-10-22T06:00:00.000Z').hours[0].windDirDeg).toBeUndefined();
    const withDir = { ...raw, hourly: { ...raw.hourly, wind_direction_10m: raw.hourly.time.map(() => 225) } };
    expect(mapForecast(withDir, place, '2026-10-22T06:00:00.000Z').hours[0].windDirDeg).toBe(225);
  });
});
