// I-160: hoogtemeters halen in Route voorstellen. Alles is nagemaakt: een startpunt dat nergens is, heuvels
// die niet bestaan en plekken die niet in de gids staan.
import { describe, expect, it } from 'vitest';
import type { NearbyTerrain, TerrainFeature } from '../models/nearbyTerrain';
import type { RouteAnswer, RouteFn, RoutePoint, RouteTarget } from '../models/route';
import type { TrainingSpot } from '../data/trainingSpots';
import { metersBetween, offsetPoint } from './routeGeometry';
import { ascentCappedLine, MAX_LOOP_DISTANCE_FACTOR, composeSimple, footReachable, footStartLine, plansWithPriority, proposalNotes, proposeRoutes, proposeSimple, type PlanOutcome } from './routePlanner';
import { ASCENT_LENGTH_ADVICE, choiceSum, loopChoiceRows, outdoorPlus, resolveAscentLength, resolveDriveLimit, resolveLoopPriority, driveLimitMinutes, TREADMILL_LINE } from './routeClimbPlan';
import { MAP_FAILED_LINE, MAP_FETCHING_LINE, MAP_MISSING_LINE, mapMissing, mapRetryLine, pickTransition, routeSheetParts } from './routeSheet';

const START: RoutePoint = { lat: 52.1, lon: 5.9 };
const TARGET: RouteTarget = { distanceKm: 10, ascentM: 300 };

function feature(deg: number, meters: number, heightM?: number): TerrainFeature {
  const p = offsetPoint(START, deg, meters);
  return { kind: 'hill', lat: Math.round(p.lat * 1e4) / 1e4, lon: Math.round(p.lon * 1e4) / 1e4, distanceM: Math.round(meters), heightM };
}
const terrain = (...features: TerrainFeature[]): NearbyTerrain => ({ source: 'osm', fetchedAt: '2026-11-20T08:00:00.000Z', place: { name: '', lat: 52.1, lon: 5.9 }, radiusM: 3000, features });
const NOW = new Date('2026-11-25T08:00:00.000Z');

// Een rechte lijn per aanroep, een punt per 25 m: vlak op 20 m, de laatste `climbLen` meter stijgt `height`.
// `per`: per doel een eigen helling (de dichtstbijzijnde van de lijst bij het doel).
function fakeRoute(per: { at: RoutePoint; height: number; climbLen: number }[]): RouteFn & { calls: number } {
  const fn = (async (waypoints: RoutePoint[]): Promise<RouteAnswer> => {
    fn.calls++;
    const points: RoutePoint[] = [];
    const a = waypoints[0];
    const b = waypoints[waypoints.length - 1];
    const hill = waypoints.length === 2 ? [...per].sort((x, y) => metersBetween(x.at, b) - metersBetween(y.at, b))[0] : undefined;
    const len = metersBetween(a, b);
    const steps = Math.max(1, Math.round(len / 25));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const left = len * (1 - t);
      const climb = hill ? Math.max(0, 1 - left / hill.climbLen) * hill.height : 0;
      points.push({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, ele: 20 + climb });
    }
    return { ok: true, line: { source: 'brouter', points } };
  }) as RouteFn & { calls: number };
  fn.calls = 0;
  return fn;
}

// Het nagemaakte voorbeeld van de eigenaar: een helling van 54 m over 1690 m, met de voet ruim 2,8 km van je plek.
const FAR_HILL = feature(40, 4500, 54);
const farRoute = () => fakeRoute([{ at: FAR_HILL, height: 54, climbLen: 1690 }]);
const ok = (o: PlanOutcome) => (o.ok ? o.proposal : undefined);

describe('I-160: de lange aanloop at de hoogtemeters op', () => {
  it('voor: zonder keuze wint de afstand stil (2 keer, ver onder 300 hm)', async () => {
    const p = ok(await proposeSimple({ start: START, target: TARGET, terrain: terrain(FAR_HILL) }, farRoute()));
    expect(p?.repeats).toBe(2);
    expect(p!.ascentM).toBeLessThan(150);
  });

  it('na: Hoogtemeters halen blijft binnen 1,3 keer de afstand en zegt dat er minder hoogtemeters in zitten', async () => {
    // Voor I-163 gaf dit 6 keer op en neer: 19,8 km bij een training van 10 km.
    const plans = await proposeRoutes({ start: START, target: TARGET, terrain: terrain(FAR_HILL), loop: { priority: 'ascent', driveLimitMin: 30 }, now: NOW }, farRoute());
    const p = ok(plans.simple)!;
    expect(p.distanceM).toBeLessThanOrEqual(1.3 * TARGET.distanceKm * 1000);
    expect(p.repeats).toBe(3);
    expect(p.ascentCapped).toBe(true);
    expect(p.footStartM).toBeGreaterThan(2000);
    // De lus begint op de voet, niet bij je plek.
    expect(metersBetween(p.points[0], START)).toBeGreaterThan(2000);
    const notes = proposalNotes(p, TARGET);
    expect(notes[0]).toMatch(/^Begint bij de voet van de helling, .* minuten rijden/);
    expect(notes).toContain(ascentCappedLine(TARGET));
  });

  it('Langer voor hoogtemeters (I-164): een ruimere grens geeft meer herhalingen, de zin noemt de gekozen grens', async () => {
    const at = async (maxLengthFactor?: number) => ok((await proposeRoutes({ start: START, target: TARGET, terrain: terrain(FAR_HILL), loop: { priority: 'ascent', driveLimitMin: 30, ...(maxLengthFactor !== undefined ? { maxLengthFactor } : {}) }, now: NOW }, farRoute())).simple)!;
    const advice = await at(undefined);
    const same = await at(1.3);
    expect(same.repeats).toBe(advice.repeats);
    const wide = await at(2);
    expect(wide.repeats).toBeGreaterThan(advice.repeats!);
    expect(wide.distanceM).toBeLessThanOrEqual(2 * TARGET.distanceKm * 1000);
    expect(wide.distanceM).toBeGreaterThan(1.3 * TARGET.distanceKm * 1000);
    const tight = await at(1.2);
    expect(tight.distanceM).toBeLessThanOrEqual(1.2 * TARGET.distanceKm * 1000);
    expect(tight.ascentCapped).toBe(true);
    expect(proposalNotes(tight, TARGET)).toContain(ascentCappedLine(TARGET, 1.2));
    expect(ascentCappedLine(TARGET, 1.2)).toMatch(/meer dan 1,2 keer zo lang/);
    expect(ascentCappedLine(TARGET)).toMatch(/meer dan 1,3 keer zo lang/);
  });

  it('na: past de afstandsgrens ruim, dan haalt Hoogtemeters halen er meer uit dan Afstand houden', async () => {
    const target: RouteTarget = { distanceKm: 14, ascentM: 300 };
    const plans = await proposeRoutes({ start: START, target, terrain: terrain(FAR_HILL), loop: { priority: 'ascent', driveLimitMin: 30 }, now: NOW }, farRoute());
    const a = ok(plans.simple)!;
    const d = ok(plansWithPriority(plans, 'distance', target).simple)!;
    expect(d.repeats).toBe(4);
    expect(a.repeats).toBe(5);
    expect(a.distanceM).toBeLessThanOrEqual(1.3 * 14_000);
    expect(a.ascentCapped).toBe(true);
    expect(d.ascentCapped).toBeUndefined();
    const rows = loopChoiceRows(plans, target, 'ascent', 'ascent');
    expect(rows.map((r) => r.label)).toEqual(['Hoogtemeters halen', 'Afstand houden']);
  });

  it('een helling die de hoogtemeters wel haalt binnen de grens krijgt de zin niet', async () => {
    const steep = feature(200, 2500, 120);
    const route = fakeRoute([{ at: steep, height: 120, climbLen: 1500 }]);
    const plans = await proposeRoutes({ start: START, target: TARGET, terrain: terrain(steep), loop: { priority: 'ascent', driveLimitMin: 30 }, now: NOW }, route);
    const p = ok(plans.simple)!;
    expect(p.ascentM).toBeGreaterThanOrEqual(300);
    expect(p.ascentCapped).toBeUndefined();
  });

  it('na: Afstand houden blijft bij 10 km en zegt de som; geen stille keuze', async () => {
    const plans = await proposeRoutes({ start: START, target: TARGET, terrain: terrain(FAR_HILL), loop: { priority: 'ascent', driveLimitMin: 30 }, now: NOW }, farRoute());
    const d = ok(plansWithPriority(plans, 'distance', TARGET).simple)!;
    expect(d.repeats).toBe(3);
    expect(Math.abs(d.distanceM - 10_000)).toBeLessThan(1000);
    expect(d.ascentM).toBeLessThan(300);
  });

  it('de steilste helling gaat voor, niet de dichtstbijzijnde', async () => {
    const gentle = feature(90, 1500, 60);
    const steep = feature(200, 2500, 40);
    const route = fakeRoute([{ at: gentle, height: 60, climbLen: 1500 }, { at: steep, height: 40, climbLen: 300 }]);
    const plans = await proposeRoutes({ start: START, target: TARGET, terrain: terrain(gentle, steep), loop: { priority: 'ascent' }, now: NOW }, route);
    const p = ok(plans.simple)!;
    expect(p.climbLengthM).toBeLessThan(400);
    expect(route.calls).toBeLessThanOrEqual(1 + 3 + 3); // Avontuurlijk hoogstens drie, Simpel hoogstens drie
  });

  it('rijtijd 0 (niet rijden): een voet die je niet loopt blijft aanloop', () => {
    expect(footReachable(5000, 0)).toBe(false);
    expect(footReachable(1500, 0)).toBe(true);
    expect(footReachable(5000, undefined)).toBe(true);
    const line = Array.from({ length: 241 }, (_, i) => ({ ...offsetPoint(START, 0, i * 25), ele: 20 + Math.max(0, (i - 200) * 1.5) }));
    const noDrive = composeSimple({ source: 'brouter', points: line }, TARGET, { priority: 'ascent', driveLimitMin: 0 });
    expect(noDrive?.footStartM).toBeUndefined();
    expect(metersBetween(noDrive!.points[0], START)).toBeLessThan(1);
  });

  it('de regel over de voet: dichtbij lopen of rijden, ver weg rijden', () => {
    expect(footStartLine({ footStartM: 1800 })).toBe('Begint bij de voet van de helling, 1,8 km van je plek: 24 minuten lopen of 2 minuten rijden.');
    expect(footStartLine({ footStartM: 12_000 })).toBe('Begint bij de voet van de helling, 15 minuten rijden van je plek.');
    expect(footStartLine({})).toBeUndefined();
  });

  it('de som noemt het aantal als getal', () => {
    expect(choiceSum({ distanceM: 14_400, ascentM: 304, repeats: 4 })).toBe('14,4 km, 300 hoogtemeters: 4 keer op en neer');
    expect(choiceSum({ distanceM: 9100, ascentM: 112 })).toBe('9,1 km, 110 hoogtemeters');
  });
});

describe('I-160: zonder kaart', () => {
  it('geen kaart: de regel bovenaan, met Opnieuw proberen, en nergens "steilste"', async () => {
    const plans = await proposeRoutes({ start: START, target: TARGET, loop: { priority: 'ascent' }, now: NOW }, farRoute());
    expect(plans.map).toBe('none');
    expect(mapMissing(plans)).toBe(true);
    const parts = routeSheetParts('plans', { anyOk: true, anyFailed: false, mapMissing: true });
    expect(parts[0]).toBe('mapMissing');
    for (const o of [plans.simple, plans.adventure]) if (o.ok) expect(proposalNotes(o.proposal, TARGET).join(' ')).not.toMatch(/steilste/);
    expect(mapRetryLine('idle')).toBe(MAP_MISSING_LINE);
    // Opnieuw proberen geeft bij dezelfde fout een nieuwe zin: de tweede poging noemt zichzelf.
    expect(mapRetryLine('failed', 1)).toBe(MAP_FAILED_LINE);
    expect(mapRetryLine('failed', 2)).not.toBe(mapRetryLine('failed', 1));
    expect(mapRetryLine('failed', 3)).not.toBe(mapRetryLine('failed', 2));
    expect(mapRetryLine('failed', 2)).toContain('weer niet');
    expect(mapRetryLine('busy')).toBe(MAP_FETCHING_LINE);
    expect(mapRetryLine('failed')).toBe(MAP_FAILED_LINE);
  });

  it('een oude kaart is geen ontbrekende kaart', () => {
    expect(mapMissing({ map: 'old' })).toBe(false);
    expect(mapMissing(undefined)).toBe(false);
  });

  it('zonder de nieuwe delen blijft de volgorde zoals hij was', () => {
    expect(routeSheetParts('plans', { anyOk: true, anyFailed: false })).toEqual(['map', 'loops', 'chosen', 'adjust', 'found', 'sources']);
    expect(routeSheetParts('plans', { anyOk: true, anyFailed: false, priority: true, plus: true })).toEqual(['map', 'loops', 'priority', 'plus', 'chosen', 'adjust', 'found', 'sources']);
  });
});

// Nagemaakte plekken, in de vorm van de gids.
function spot(id: string, kind: string, deg: number, km: number, climbM: number, uses: TrainingSpot['uses']): TrainingSpot {
  const p = offsetPoint(START, deg, km * 1000);
  return { id, name: id === 'trap-a' ? 'Trap A' : id === 'heuvel-b' ? 'Heuvel B' : 'Heuvel C', place: '', province: '', lat: p.lat, lon: p.lon, coordType: 'start', kind, climbM, example: '', uses, terrain: '', access: '', tip: '', region: 'elders', sources: [] };
}
const TRAP = spot('trap-a', 'Trap in een oude groeve', 0, 8, 26, ['trap', 'bergop']);
const HILL = spot('heuvel-b', 'Stuwwal', 90, 14, 40, ['bergop', 'bergaf']);
const FAR = spot('heuvel-c', 'Stuwwal', 180, 60, 60, ['bergop']);

describe('I-160: buiten plus een helling, trap of de loopband', () => {
  const flat = { distanceM: 10_000, ascentM: 110 };

  it('vlak gebied: een echte helling binnen de rijtijd gaat voor op een trap die dichterbij ligt', () => {
    const row = outdoorPlus({ outdoor: flat, target: TARGET, from: START, spots: [TRAP, HILL, FAR], driveLimitMin: 30 });
    expect(row?.kind).toBe('spot');
    if (row?.kind !== 'spot') return;
    expect(row.title).toBe('Buiten plus een helling');
    expect(row.spotId).toBe('heuvel-b');
    expect(row.facts).toBe('Buiten 10 km, 110 hoogtemeters. Daarna Heuvel B, 5 keer op en neer, 200 hoogtemeters.');
    expect(row.sum).toBe('Samen 10 km en 310 hoogtemeters.');
    expect(row.spotLine).toMatch(/^Heuvel B, 40 m per keer, \d+ minuten rijden\.$/);
  });

  it('zonder helling: de trap', () => {
    const row = outdoorPlus({ outdoor: flat, target: TARGET, from: START, spots: [TRAP], driveLimitMin: 30 });
    expect(row?.kind === 'spot' && row.title).toBe('Buiten plus een trap');
    expect(row?.kind === 'spot' && row.facts).toBe('Buiten 10 km, 110 hoogtemeters. Daarna Trap A, 8 keer op en neer, 210 hoogtemeters.');
  });

  it('niets binnen de rijtijd: de loopband, met de zin over het horloge', () => {
    const row = outdoorPlus({ outdoor: flat, target: TARGET, from: START, spots: [FAR], driveLimitMin: 30 });
    expect(row?.kind).toBe('treadmill');
    if (row?.kind !== 'treadmill') return;
    expect(row.title).toBe('Buiten plus de loopband');
    expect(row.facts).toBe('Buiten 10 km, 110 hoogtemeters. Daarna 25 minuten op de loopband op 10 procent, 190 hoogtemeters.');
    expect(row.noSpotLine).toBe('Binnen 30 minuten rijden staat geen trap of helling in de gids.');
    expect(row.info).toBe(TREADMILL_LINE);
  });

  it('rijtijd 0: alleen wat lopend te bereiken is', () => {
    const row = outdoorPlus({ outdoor: flat, target: TARGET, from: START, spots: [TRAP, HILL], driveLimitMin: 0 });
    expect(row?.kind).toBe('treadmill');
    expect(row?.kind === 'treadmill' && row.noSpotLine).toBe('Lopend te bereiken staat geen trap of helling in de gids.');
  });

  it('geen grens: ook ver weg', () => {
    const row = outdoorPlus({ outdoor: flat, target: TARGET, from: START, spots: [FAR], driveLimitMin: undefined });
    expect(row?.kind === 'spot' && row.spotId).toBe('heuvel-c');
  });

  it('niet bij genoeg hoogte buiten, niet zonder hoogtemeters en niet bij een eigen wandeling', () => {
    expect(outdoorPlus({ outdoor: { distanceM: 10_000, ascentM: 230 }, target: TARGET, from: START, spots: [TRAP], driveLimitMin: 30 })).toBeUndefined();
    expect(outdoorPlus({ outdoor: flat, target: { distanceKm: 10, ascentM: 0 }, from: START, spots: [TRAP], driveLimitMin: 30 })).toBeUndefined();
    expect(outdoorPlus({ outdoor: flat, target: { ...TARGET, plannedWalk: true }, from: START, spots: [TRAP], driveLimitMin: 30 })).toBeUndefined();
  });

  it('geen lus buiten: dat zegt de rij', () => {
    const row = outdoorPlus({ outdoor: undefined, target: TARGET, from: START, spots: [HILL], driveLimitMin: 30 });
    expect(row?.facts).toMatch(/^Buiten vind je geen lus\. Daarna Heuvel B, 8 keer op en neer/);
  });
});

describe('I-160: instellingen en beweging', () => {
  it('Wat gaat voor in een lus: advies volgt de training', () => {
    expect(resolveLoopPriority(undefined, TARGET)).toBe('ascent');
    expect(resolveLoopPriority(undefined, { distanceKm: 10, ascentM: 0 })).toBe('distance');
    expect(resolveLoopPriority('distance', TARGET)).toBe('distance');
    expect(resolveLoopPriority('iets', TARGET)).toBe('ascent');
  });

  it('Langer voor hoogtemeters: advies 1,3; een oude back-up zonder het veld of een vreemde waarde geeft het advies', () => {
    expect(resolveAscentLength(undefined)).toBe(1.3);
    expect(ASCENT_LENGTH_ADVICE).toBe(MAX_LOOP_DISTANCE_FACTOR);
    expect(resolveAscentLength(1.7)).toBe(1.3);
    expect(resolveAscentLength('2')).toBe(1.3);
    expect(resolveAscentLength(1.2)).toBe(1.2);
    expect(resolveAscentLength(1.5)).toBe(1.5);
    expect(resolveAscentLength(2)).toBe(2);
  });

  it('Rijtijd naar heuvels: advies 30 minuten, Geen grens is geen getal', () => {
    expect(resolveDriveLimit(undefined)).toBe(30);
    expect(resolveDriveLimit(17)).toBe(30);
    expect(driveLimitMinutes(resolveDriveLimit('free'))).toBeUndefined();
    expect(driveLimitMinutes(resolveDriveLimit(0))).toBe(0);
  });

  it('Rustig en Uit: de keuzerijen staan meteen op de eindstand', () => {
    expect(pickTransition('calm')).toBe('none');
    expect(pickTransition('off')).toBe('none');
    expect(pickTransition('full')).toMatch(/150ms ease-out/);
  });
});
