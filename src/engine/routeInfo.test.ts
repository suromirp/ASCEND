import { describe, expect, it } from 'vitest';
import type { RoutePoint } from '../models/route';
import { mapBrouter, surfaceOfTags } from '../integrations/brouter';
import { backLine, bailLine, bailPoint, elevationProfile, loopDurationMin, surfaceLine, STEEP_GRADE } from './routeInfo';
import { sunDay } from './sun';

// Een verzonnen punt in het midden van het land, geen echte plek.
const PLACE = { lat: 52.1, lon: 5.9 };
const OFFSET = 60; // winter, 22 november
const DATE = '2026-11-22';

const step = (n: number, east = 0.0013) => ({ lat: PLACE.lat, lon: PLACE.lon + n * east });

describe('terug voor het donker (I-115)', () => {
  const day = sunDay(DATE, PLACE.lat, PLACE.lon, OFFSET);
  const sunset = (day as { sunset: number }).sunset;
  const base = { date: DATE, today: DATE, place: PLACE, utcOffsetMin: OFFSET, enabled: true };

  it('zegt hoe laat je terug bent en wanneer de zon onder gaat, als je binnen een uur ervoor terug bent', () => {
    const line = backLine({ ...base, nowMin: sunset - 90, durationMin: 50 });
    expect(line).toMatch(/^Je bent rond \d\d:\d\d terug; de zon gaat om \d\d:\d\d onder\.$/);
  });

  it('zegt "ging" als je na zonsondergang terug bent', () => {
    const line = backLine({ ...base, nowMin: sunset - 30, durationMin: 60 });
    expect(line).toMatch(/de zon ging om \d\d:\d\d onder\.$/);
  });

  it('zwijgt als je ruim voor zonsondergang terug bent', () => {
    expect(backLine({ ...base, nowMin: 9 * 60, durationMin: 60 })).toBeUndefined();
    expect(backLine({ ...base, nowMin: sunset - 125, durationMin: 60 })).toBeUndefined();
  });

  it('toont de regel precies vanaf een uur voor zonsondergang', () => {
    expect(backLine({ ...base, nowMin: sunset - 120, durationMin: 60 })).toBeDefined();
    expect(backLine({ ...base, nowMin: sunset - 121, durationMin: 60 })).toBeUndefined();
  });

  it('zwijgt als de instelling uit staat, de duur onbekend is of de dag niet vandaag is', () => {
    expect(backLine({ ...base, nowMin: sunset - 30, durationMin: 60, enabled: false })).toBeUndefined();
    expect(backLine({ ...base, nowMin: sunset - 30, durationMin: undefined })).toBeUndefined();
    expect(backLine({ ...base, nowMin: sunset - 30, durationMin: 60, today: '2026-11-21' })).toBeUndefined();
  });

  it('zwijgt voor zonsopgang en op een dag zonder zonsondergang', () => {
    expect(backLine({ ...base, nowMin: 3 * 60, durationMin: 600 })).toBeUndefined();
    expect(backLine({ ...base, date: '2026-06-21', today: '2026-06-21', place: { lat: 80, lon: 5 }, nowMin: 1200, durationMin: 60 })).toBeUndefined();
  });

  it('rondt de terugkomst af op 5 minuten en is hetzelfde bij dezelfde invoer', () => {
    const a = backLine({ ...base, nowMin: sunset - 40, durationMin: 52 });
    expect(a).toBe(backLine({ ...base, nowMin: sunset - 40, durationMin: 52 }));
    expect(/rond \d\d:(\d)[05] terug/.test(a ?? '')).toBe(true);
  });

  it('rekent de duur uit een wandeltijd of uit het tempo', () => {
    expect(loopDurationMin({ distanceM: 10_000 }, 360, undefined)).toBe(60);
    expect(loopDurationMin({ distanceM: 10_000 }, 360, 95)).toBe(95);
    expect(loopDurationMin({ distanceM: 10_000 }, undefined, undefined)).toBeUndefined();
  });
});

describe('hoogteprofiel (I-116)', () => {
  const along = (eles: number[]): RoutePoint[] => eles.map((ele, i) => ({ ...step(i, 0.0015), ele }));

  it('geeft bij een vlakke lus een rustige regel en geen profiel', () => {
    const p = elevationProfile({ points: along([10, 10.5, 10, 10.2, 10, 10.4, 10]), ascentM: 3 });
    expect(p).toEqual({ kind: 'flat', line: 'Vrijwel vlak, dus geen profiel.' });
  });

  it('zonder hoogtes geen profiel', () => {
    expect(elevationProfile({ points: [step(0), step(1), step(2)], ascentM: 100 })).toBeUndefined();
  });

  it('kleurt alleen stukken steiler dan 8 procent als steil', () => {
    // Elke stap is ongeveer 100 m (0,0015 graden lengte op deze breedte); 12 m per stap is ruim 8 procent.
    const eles = [0, 0, 0, 0, 0, 12, 24, 36, 48, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60];
    const p = elevationProfile({ points: along(eles), ascentM: 60 });
    expect(p?.kind).toBe('profile');
    if (p?.kind !== 'profile') return;
    expect(p.segments.some((s) => s.steep)).toBe(true);
    expect(p.segments.some((s) => !s.steep)).toBe(true);
    expect(p.steepM).toBeGreaterThan(100);
    expect(p.line).toContain('Steiler dan 8 %');
    expect(p.highM).toBeGreaterThan(50);
    expect(p.lowM).toBeLessThan(5);
    // De hoogte loopt omhoog op het scherm: een hoger punt heeft een kleinere y.
    const first = p.segments[0];
    const last = p.segments[p.segments.length - 1];
    expect(last.y2).toBeLessThan(first.y1);
    expect(p.segments.every((s) => s.x2 >= s.x1 && s.y1 >= 0 && s.y1 <= p.height)).toBe(true);
  });

  it('noemt geen steil stuk bij een zacht glooiende lus', () => {
    const eles = Array.from({ length: 30 }, (_, i) => 20 * Math.sin(i / 5) + 20);
    const p = elevationProfile({ points: along(eles), ascentM: 80 });
    expect(p?.kind).toBe('profile');
    if (p?.kind !== 'profile') return;
    expect(p.segments.some((s) => s.steep)).toBe(false);
    expect(p.line).not.toContain('Steiler');
    expect(STEEP_GRADE).toBe(0.08);
  });
});

describe('ondergrond (I-117)', () => {
  const run = (surfaces: (RoutePoint['surface'])[]): RoutePoint[] => surfaces.map((surface, i) => ({ ...step(i), ...(surface ? { surface } : {}) }));

  it('leest de ondergrond uit de WayTags van BRouter', () => {
    expect(surfaceOfTags('highway=track surface=unpaved tracktype=grade3 foot=permissive')).toBe('unpaved');
    expect(surfaceOfTags('highway=track tracktype=grade2 foot=permissive')).toBe('unpaved');
    expect(surfaceOfTags('highway=track tracktype=grade1')).toBe('paved');
    expect(surfaceOfTags('highway=secondary surface=asphalt route_bicycle_rcn=yes')).toBe('paved');
    expect(surfaceOfTags('highway=path')).toBe('unpaved');
    expect(surfaceOfTags('highway=cycleway')).toBe('paved');
    expect(surfaceOfTags('highway=path surface=paving_stones')).toBe('paved');
    expect(surfaceOfTags('highway=residential surface=gravel')).toBe('unpaved');
    expect(surfaceOfTags('foot=yes')).toBeUndefined();
    expect(surfaceOfTags('')).toBeUndefined();
  });

  it('zet de ondergrond op de punten van het antwoord', () => {
    const head = ['Longitude', 'Latitude', 'Distance', 'WayTags'];
    const coords = [[5.9, 52.1], [5.901, 52.1], [5.902, 52.1], [5.903, 52.1]];
    const raw = { features: [{ geometry: { coordinates: coords }, properties: { messages: [head, ['5901000', '52100000', '68', 'highway=track surface=gravel'], ['5903000', '52100000', '137', 'highway=residential surface=asphalt']] } }] };
    const points = mapBrouter(raw);
    expect(points?.map((p) => p.surface)).toEqual([undefined, 'unpaved', 'paved', 'paved']);
  });

  it('zegt de verdeling op 5 procent afgerond', () => {
    // Vier stappen onverhard, twee verhard: twee derde onverhard, afgerond 65.
    expect(surfaceLine(run([undefined, 'unpaved', 'unpaved', 'unpaved', 'unpaved', 'paved', 'paved']))).toBe('Ongeveer 65 % onverhard, 35 % verhard.');
  });

  it('zegt vrijwel alles als een kant onder de 5 procent blijft', () => {
    expect(surfaceLine(run(Array(30).fill('paved').map((s, i) => (i === 0 ? undefined : s))))).toBe('Vrijwel alles verhard.');
    expect(surfaceLine(run(['paved', 'unpaved', 'unpaved']))).toBeDefined();
  });

  it('zegt niets als de bron de ondergrond niet gaf of te weinig stukken kent', () => {
    expect(surfaceLine(run([undefined, undefined, undefined, undefined]))).toBeUndefined();
    expect(surfaceLine(run([undefined, 'paved', undefined, undefined, undefined, undefined]))).toBeUndefined();
    expect(surfaceLine([])).toBeUndefined();
  });
});

describe('afhaken (I-118)', () => {
  // Een vierkante lus van 4 zijden met vaste stappen; de start staat linksonder.
  const lap = (): RoutePoint[] => {
    const pts: RoutePoint[] = [];
    const side = 20;
    const d = 0.001;
    const at = (x: number, y: number): RoutePoint => ({ lat: PLACE.lat + y * d * 0.7, lon: PLACE.lon + x * d });
    for (let i = 0; i <= side; i++) pts.push(at(i, 0));
    for (let i = 1; i <= side; i++) pts.push(at(side, i));
    for (let i = 1; i <= side; i++) pts.push(at(side - i, side));
    for (let i = 1; i <= side; i++) pts.push(at(0, side - i));
    return pts;
  };

  it('kiest tussen 35 en 65 procent het punt het dichtst bij de start', () => {
    const pts = lap();
    const b = bailPoint({ points: pts, repeatedShare: 0 });
    expect(b).toBeDefined();
    if (!b) return;
    expect(b.atM / (pts.length ? lastCum(pts) : 1)).toBeGreaterThanOrEqual(0.35);
    expect(b.atM / lastCum(pts)).toBeLessThanOrEqual(0.65);
    // Elk ander punt in dat venster ligt minstens zo ver van de start.
    expect(b.backM).toBeGreaterThan(0);
    expect(bailLine(b)).toMatch(/^Onderweg kun je hier afhaken: \d+,\d km hemelsbreed terug\.$/);
  });

  it('is deterministisch', () => {
    expect(bailPoint({ points: lap(), repeatedShare: 0 })).toEqual(bailPoint({ points: lap(), repeatedShare: 0 }));
  });

  it('geeft niets voor een lus die grotendeels over hetzelfde pad terugkomt', () => {
    expect(bailPoint({ points: lap(), repeatedShare: 0.9 })).toBeUndefined();
  });

  it('geeft niets voor een te korte lijn of een punt dat al bij de start ligt', () => {
    expect(bailPoint({ points: [step(0), step(1)], repeatedShare: 0 })).toBeUndefined();
    const tiny = [step(0, 0.00001), step(1, 0.00001), step(2, 0.00001), step(3, 0.00001), step(4, 0.00001), step(0, 0.00001)];
    expect(bailPoint({ points: tiny, repeatedShare: 0 })).toBeUndefined();
    expect(bailLine(undefined)).toBeUndefined();
  });
});

function lastCum(pts: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const k = Math.cos((pts[i].lat * Math.PI) / 180);
    total += Math.hypot((pts[i].lat - pts[i - 1].lat) * 111_195, (pts[i].lon - pts[i - 1].lon) * 111_195 * k);
  }
  return total;
}
