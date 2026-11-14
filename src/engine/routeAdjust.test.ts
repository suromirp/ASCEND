import { describe, expect, it } from 'vitest';
import type { NearbyTerrain } from '../models/nearbyTerrain';
import type { AvoidArea, RouteAnswer, RouteFn, RouteOptions, RoutePoint, RouteProposal } from '../models/route';
import { climbAndDescent, modelThresholdM } from './elevation';
import { lineLength, metersBetween, offsetPoint } from './routeGeometry';
import { proposeAdventure, proposeRoutes, proposeSimple } from './routePlanner';
import {
  AVOID_MAX_M, MAX_AVOID, MIN_LOOP_KM, adjustFailLine, adjustSummary, avoidPiece, canReverse, crossesArea, isAdjusted, loopPieces, maxLoopKm, pieceLengthM, pieceLine,
  reverseProposal, settleAdjust, stepDistance, tooTiny, NO_ADJUST,
} from './routeAdjust';

// Alles nagemaakt: een startpunt dat nergens is.
const START: RoutePoint = { lat: 52.1, lon: 5.9 };

// Een rechte lijn naar het noorden met een punt per 50 m en de hoogte uit `ele(meters)`.
function northLine(meters: number, ele: (m: number) => number | undefined = () => 20): RoutePoint[] {
  const out: RoutePoint[] = [];
  for (let m = 0; m <= meters; m += 50) {
    const p = offsetPoint(START, 0, m);
    const e = ele(m);
    out.push(e === undefined ? p : { ...p, ele: e });
  }
  return out;
}

const proposal = (points: RoutePoint[], over: Partial<RouteProposal> = {}): RouteProposal => ({ style: 'adventure', source: 'brouter', points, distanceM: lineLength(points), ascentM: 0, repeatedShare: 0, ...over });

describe('Langer en Korter', () => {
  it('een lus die bij Korter onder 1 km komt: niet zoeken, één regel waarom', () => {
    expect(stepDistance(1.4, 0, 'shorter')).toEqual({ ok: false, line: `Korter dan ${MIN_LOOP_KM} km zoekt ASCEND geen lus.` });
    // 1,5 km min een halve is precies 1 km: dat mag; nog een keer niet.
    const once = stepDistance(1.5, 0, 'shorter');
    expect(once).toEqual({ ok: true, deltaKm: -0.5 });
    expect(stepDistance(1.5, -0.5, 'shorter').ok).toBe(false);
  });

  it('een hele kilometer per stap vanaf 5 km, op 0,1 km, en Langer tot de helft erbij', () => {
    expect(stepDistance(10, 0, 'longer')).toEqual({ ok: true, deltaKm: 1 });
    expect(stepDistance(10, 0, 'shorter')).toEqual({ ok: true, deltaKm: -1 });
    expect(maxLoopKm(10)).toBe(15);
    expect(stepDistance(10, 5, 'longer')).toEqual({ ok: false, line: 'Langer dan 15 km zoekt ASCEND bij deze training niet.' });
    // Een korte training mag 2 km langer.
    expect(maxLoopKm(2)).toBe(4);
  });

  it('een lus van minder dan een kilometer is geen lus', () => {
    expect(tooTiny({ distanceM: 999 })).toBe(true);
    expect(tooTiny({ distanceM: 1000 })).toBe(false);
    expect(tooTiny({ distanceM: Number.NaN })).toBe(true);
  });
});

describe('Andere kant op', () => {
  it('dezelfde punten achterstevoren, dezelfde afstand, de hoogtemeters opnieuw geteld', () => {
    // Langzaam 40 m omhoog en in één keer terug: achterstevoren is het andersom, de lus blijft gesloten.
    const out = northLine(2000, (m) => 20 + Math.min(40, m / 40));
    const loop = [...out, ...northLine(2000).reverse().slice(1)];
    const p = proposal(loop, { ascentM: 40 });
    const back = reverseProposal(p);
    expect(back.points[0]).toEqual(loop[loop.length - 1]);
    expect(back.distanceM).toBe(p.distanceM);
    expect(back.ascentM).toBe(climbAndDescent(back.points.map((x) => x.ele), modelThresholdM(back.points.map((x) => x.ele))).ascentM);
  });

  it('alleen Avontuurlijk: Simpel gaat heen en terug over hetzelfde pad', () => {
    expect(canReverse({ style: 'adventure' })).toBe(true);
    expect(canReverse({ style: 'simple' })).toBe(false);
  });
});

describe('per stuk', () => {
  it('stukken van een kilometer; een laatste stukje onder 300 m gaat bij het vorige', () => {
    expect(pieceLengthM(9_000)).toBe(1000);
    expect(pieceLengthM(15_000)).toBe(2000);
    expect(pieceLengthM(42_000)).toBe(5000);
    const pieces = loopPieces(northLine(4200));
    expect(pieces).toHaveLength(4);
    expect(pieces[3].distanceM).toBeCloseTo(1200, 0);
    const total = pieces.reduce((n, p) => n + p.distanceM, 0);
    expect(total).toBeCloseTo(lineLength(northLine(4200)), 6);
  });

  it('de stukken samen klimmen even veel als de hele lus (de hysterese van routeGeometry.ts#ascentOf)', () => {
    // Twee bulten van 30 m, met ruis van 2 m die niet mag tellen.
    const ele = (m: number) => 20 + 30 * Math.max(0, Math.sin((m / 3000) * 2 * Math.PI)) + (Math.round(m / 50) % 2 ? 2 : 0);
    const line = northLine(6000, ele);
    const pieces = loopPieces(line);
    const sum = pieces.reduce((n, p) => n + (p.ascentM ?? 0), 0);
    const whole = climbAndDescent(line.map((p) => p.ele), modelThresholdM(line.map((p) => p.ele))).ascentM;
    expect(sum).toBeCloseTo(whole, 6);
    expect(Math.round(sum)).toBeGreaterThan(50);
  });

  it('een stuk zonder hoogte zegt dat, en een punt zonder hoogte telt niet als laag', () => {
    const line = northLine(2000, (m) => (m < 1200 ? undefined : 20 + (m - 1200) / 50));
    const pieces = loopPieces(line);
    expect(pieces[0].ascentM).toBeUndefined();
    expect(Math.round(pieces[1].ascentM ?? 0)).toBe(16);
    expect(pieceLine(pieces[0])).toBe('Km 0 tot 1 · 1 km · hoogte onbekend');
    expect(pieceLine(pieces[1])).toBe('Km 1 tot 2 · 1 km · 16 m omhoog');
  });
});

describe('een stuk vermijden', () => {
  it('een recht stuk dwars door de cirkel telt, ook zonder punt erin', () => {
    const area: AvoidArea = { ...offsetPoint(START, 0, 500), radiusM: 50 };
    expect(crossesArea([START, offsetPoint(START, 0, 1000)], area)).toBe(true);
    expect(crossesArea([offsetPoint(START, 90, 300), offsetPoint(offsetPoint(START, 90, 300), 0, 1000)], area)).toBe(false);
  });

  it('een cirkel om het midden van het stuk; niet bij de start en hoogstens drie', () => {
    const pieces = loopPieces(northLine(4000));
    const ok = avoidPiece(pieces[2], START, []);
    expect(ok.ok && metersBetween(ok.area, offsetPoint(START, 0, 2500)) < 5 && ok.area.radiusM === AVOID_MAX_M).toBe(true);
    const near = loopPieces(northLine(300))[0];
    expect(avoidPiece(near, START, [])).toEqual({ ok: false, line: 'Dit stuk ligt bij je start en kan niet weg.' });
    const full = Array.from({ length: MAX_AVOID }, () => ({ lat: 0, lon: 0, radiusM: 60 }));
    expect(avoidPiece(pieces[2], START, full).ok).toBe(false);
  });

  // Een routeplanner die altijd hetzelfde pad geeft, ook met een stuk om te mijden: het enige pad.
  const onlyPath: RouteFn = async (waypoints: RoutePoint[]): Promise<RouteAnswer> => {
    const out = northLine(1500).map((p) => ({ ...p }));
    return { ok: true, line: { source: 'brouter', points: [...out, ...[...out].reverse().slice(1), waypoints[0]] } };
  };
  const terrain: NearbyTerrain = { source: 'osm', fetchedAt: '2026-11-01T08:00:00.000Z', place: { name: '', lat: START.lat, lon: START.lon }, radiusM: 3000, features: [] };

  it('vermijden van het enige pad: geen lus, zodat de oude lus blijft', async () => {
    const avoid = [{ ...offsetPoint(START, 0, 1000), radiusM: 60 }];
    const target = { distanceKm: 3, ascentM: 0 };
    const adventure = await proposeAdventure({ start: START, target, terrain, avoid }, onlyPath);
    expect(adventure.ok).toBe(false);
    const simple = await proposeSimple({ start: START, target, terrain, avoid }, onlyPath);
    expect(simple.ok).toBe(false);
    // Zonder het stuk om te mijden is er wel een lus.
    expect((await proposeAdventure({ start: START, target, terrain }, onlyPath)).ok).toBe(true);
    expect(adjustFailLine('avoid', 'failed')).toBe('Om dit stuk ligt geen andere weg. De lus blijft zoals hij was.');
  });

  it('de routeplanner krijgt de cirkels mee, en een lus eromheen telt wel', async () => {
    const seen: (RouteOptions | undefined)[] = [];
    const around: RouteFn = async (waypoints, options) => {
      seen.push(options);
      // Een vierkant van 750 m naar het oosten: raakt de cirkel op het noordpad niet.
      const a = offsetPoint(START, 90, 750);
      const b = offsetPoint(a, 0, 750);
      const c = offsetPoint(START, 0, 750);
      const pts = [START, a, b, c, waypoints[0]];
      const dense: RoutePoint[] = [];
      for (let i = 1; i < pts.length; i++) for (let k = 0; k < 15; k++) dense.push({ lat: pts[i - 1].lat + ((pts[i].lat - pts[i - 1].lat) * k) / 15, lon: pts[i - 1].lon + ((pts[i].lon - pts[i - 1].lon) * k) / 15, ele: 20 });
      dense.push({ ...START, ele: 20 });
      return { ok: true, line: { source: 'brouter', points: dense } };
    };
    const avoid = [{ ...offsetPoint(offsetPoint(START, 270, 400), 0, 400), radiusM: 60 }];
    const plans = await proposeRoutes({ start: START, target: { distanceKm: 3, ascentM: 0 }, terrain, avoid }, around);
    expect(plans.adventure.ok).toBe(true);
    expect(seen.every((o) => o?.avoid?.length === 1)).toBe(true);
  });
});

describe('wat er bijgestuurd is', () => {
  it('één regel, leeg zonder bijsturen; offline zegt de reden', () => {
    expect(isAdjusted(NO_ADJUST)).toBe(false);
    expect(adjustSummary(NO_ADJUST, 10, 'adventure')).toBe('');
    expect(adjustSummary({ deltaKm: 1, avoid: [{ lat: 0, lon: 0, radiusM: 60 }], reversed: ['adventure'] }, 10, 'adventure')).toBe('Bijgestuurd: langer, gezocht op 11 km, 1 stuk vermeden, andere kant op.');
    expect(adjustFailLine('longer', 'offline')).toBe('Zonder netwerk kan de lus niet bijgestuurd worden. De lus blijft zoals hij was.');
  });
});

describe('op 0,1 km', () => {
  it('een stuk van 1,2 km aan het eind', () => {
    const pieces = loopPieces(northLine(4200));
    expect(pieceLine(pieces[3])).toBe('Km 3 tot 4,2 · 1,2 km · 0 m omhoog');
  });
});

describe('na het zoeken van een bijsturing', () => {
  const plans = (simple: boolean, adventure: boolean) => ({ kind: 'plans' as const, plans: { simple: { ok: simple }, adventure: { ok: adventure } } });
  it('de bijgestuurde lus kwam er: hij blijft', () => {
    expect(settleAdjust('avoid', 'adventure', plans(false, true))).toEqual({ keep: true });
  });
  it('de bijgestuurde lus kwam er niet (het enige pad), of er was geen netwerk: terug, met de reden', () => {
    expect(settleAdjust('avoid', 'adventure', plans(true, false))).toEqual({ keep: false, line: 'Om dit stuk ligt geen andere weg. De lus blijft zoals hij was.' });
    expect(settleAdjust('shorter', 'simple', { kind: 'offline' })).toEqual({ keep: false, line: 'Zonder netwerk kan de lus niet bijgestuurd worden. De lus blijft zoals hij was.' });
    expect(settleAdjust('longer', 'simple', { kind: 'timeout' }).keep).toBe(false);
  });
});
