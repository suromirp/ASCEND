import { describe, expect, it } from 'vitest';
import type { NearbyTerrain, TerrainFeature } from '../models/nearbyTerrain';
import type { RouteAnswer, RouteFn, RoutePoint } from '../models/route';
import { lineLength, metersBetween, offsetPoint } from './routeGeometry';
import {
  MAX_ROUTE_CALLS, MAX_VIAS, adventureVias, climbOnLine, composeOutAndBack, composeSimple, cutAt, tallestClimbLine, proposalFacts, proposalNotes, proposalTitle,
  proposeAdventure, proposeRoutes, proposeSimple, simpleCandidates,
} from './routePlanner';

// Alles hier is nagemaakt: een startpunt dat nergens is en heuvels die niet bestaan.
const START: RoutePoint = { lat: 52.1, lon: 5.9 };

function feature(kind: TerrainFeature['kind'], deg: number, meters: number, heightM?: number): TerrainFeature {
  const p = offsetPoint(START, deg, meters);
  return { kind, lat: Math.round(p.lat * 1e4) / 1e4, lon: Math.round(p.lon * 1e4) / 1e4, distanceM: Math.round(meters), heightM };
}
const terrain = (...features: TerrainFeature[]): NearbyTerrain => ({ source: 'osm', fetchedAt: '2026-11-01T08:00:00.000Z', place: { name: '', lat: 52.1, lon: 5.9 }, radiusM: 3000, features });

// Een rechte lijn tussen de punten, een punt per 25 m. Hoogte: vlak op 20 m, en de laatste
// `climbLen` meter naar een heuvel stijgt `height` meter.
function fakeRoute(opts: { height?: number; climbLen?: number; answers?: (RouteAnswer | undefined)[] } = {}): RouteFn & { calls: RoutePoint[][] } {
  const calls: RoutePoint[][] = [];
  const fn = (async (waypoints: RoutePoint[]): Promise<RouteAnswer> => {
    calls.push(waypoints);
    const canned = opts.answers?.[calls.length - 1];
    if (canned) return canned;
    const points: RoutePoint[] = [];
    for (let w = 1; w < waypoints.length; w++) {
      const a = waypoints[w - 1];
      const b = waypoints[w];
      const len = metersBetween(a, b);
      const steps = Math.max(1, Math.round(len / 25));
      for (let i = w === 1 ? 0 : 1; i <= steps; i++) {
        const t = i / steps;
        const left = len * (1 - t);
        const climb = opts.height && waypoints.length === 2 ? Math.max(0, 1 - left / (opts.climbLen ?? 500)) * opts.height : 0;
        points.push({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, ele: 20 + climb });
      }
    }
    return { ok: true, line: { source: 'brouter', points } };
  }) as RouteFn & { calls: RoutePoint[][] };
  fn.calls = calls;
  return fn;
}

describe('Simpel: dezelfde helling op en af', () => {
  const hills = terrain(feature('hill', 40, 1500, 50), feature('hill', 200, 2800, 30), feature('hill', 300, 600, 8));

  it('vindt de helling op een lijn: van het laatste dal tot de top', () => {
    const points = [20, 20, 21, 20, 30, 45, 60, 70].map((ele, i) => ({ ...offsetPoint(START, 0, i * 100), ele }));
    const climb = climbOnLine(points);
    expect(climb).toMatchObject({ foot: 3, top: 7 });
    expect(climb?.heightM).toBe(50);
    expect(climb?.lengthM).toBeCloseTo(400, 0);
  });

  it('een lijn zonder hoogte of met een bult van een paar meter heeft geen helling', () => {
    expect(climbOnLine([START, offsetPoint(START, 0, 500)])).toBeUndefined();
    expect(climbOnLine([20, 22, 26, 27].map((ele, i) => ({ ...offsetPoint(START, 0, i * 100), ele })))).toBeUndefined();
  });

  it('herhaalt de helling tot de hoogtemeters er zijn', async () => {
    const route = fakeRoute({ height: 50, climbLen: 500 });
    const out = await proposeSimple({ start: START, target: { distanceKm: 9, ascentM: 300 }, terrain: hills }, route);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const p = out.proposal;
    expect(p.repeats).toBe(6);
    expect(p.ascentM).toBeGreaterThan(285);
    expect(p.ascentM).toBeLessThanOrEqual(300);
    expect(p.climbM).toBeGreaterThan(47);
    // 2 × 1 km aanloop en 6 × 2 × 500 m helling.
    expect(p.distanceM).toBeGreaterThan(7700);
    expect(p.distanceM).toBeLessThan(8000);
    // De lus begint en eindigt op het startpunt.
    expect(metersBetween(p.points[0], p.points[p.points.length - 1])).toBeLessThan(1);
    expect(proposalTitle(p)).toBe('6 × de helling op en af');
    expect(proposalFacts(p)).toBe('8 km · 300 hoogtemeters');
    expect(proposalNotes(p, { distanceKm: 9, ascentM: 300 })).toEqual(['De helling: 50 m omhoog over 500 m.', 'Op dezelfde helling kan je horloge naar het verkeerde stuk springen.']);
  });

  it('een punt zonder hoogte telt nergens mee, ook niet als laag', () => {
    const points = [0, 0, 0, undefined, 2, 10, 20, 30].map((ele, i) => ({ ...offsetPoint(START, 0, i * 100), ...(ele === undefined ? {} : { ele }) }));
    const climb = climbOnLine(points);
    expect(climb).toMatchObject({ foot: 2, top: 7, heightM: 30 });
    const p = composeSimple({ source: 'valhalla', points }, { distanceKm: 6, ascentM: 120 });
    expect(p?.repeats).toBe(4);
    expect(Number.isFinite(p?.ascentM)).toBe(true);
  });

  it('een lege lijn of één punt geeft geen lus', () => {
    expect(composeSimple({ source: 'brouter', points: [] }, { distanceKm: 6, ascentM: 100 })).toBeUndefined();
    expect(composeSimple({ source: 'brouter', points: [{ ...START, ele: 5 }] }, { distanceKm: 6, ascentM: 100 })).toBeUndefined();
    expect(composeOutAndBack({ source: 'brouter', points: [START] }, { distanceKm: 6, ascentM: 0 })).toBeUndefined();
  });

  it('de hoogste helling op een lijn kan lager liggen dan een eerdere top', () => {
    const points = [100, 120, 60, 0, 30, 60].map((ele, i) => ({ ...offsetPoint(START, 0, i * 200), ele }));
    const line = tallestClimbLine(points);
    expect(line).toHaveLength(6);
    expect(composeSimple({ source: 'brouter', points: line! }, { distanceKm: 8, ascentM: 200 })?.climbM).toBe(60);
  });

  it('een te lage heuvel (onder 10 m) doet niet mee', () => {
    const picks = simpleCandidates({ start: START, target: { distanceKm: 9, ascentM: 300 }, terrain: hills });
    expect(picks).toHaveLength(2);
  });

  it('de afstand begrenst het aantal herhalingen', () => {
    const route = { source: 'brouter' as const, points: Array.from({ length: 61 }, (_, i) => ({ ...offsetPoint(START, 0, i * 25), ele: 20 + Math.max(0, i - 40) }) ) };
    // 20 m helling over 500 m: 1000 hoogtemeters zou 50 keer zijn; 6 km laat er hoogstens 7 toe.
    const p = composeSimple(route, { distanceKm: 6, ascentM: 1000 });
    expect(p?.repeats).toBe(7);
    expect(p!.distanceM).toBeLessThanOrEqual(9000);
  });

  it('zonder hoogtemeters: heen en terug over hetzelfde pad, op de afstand van de training', async () => {
    const route = fakeRoute();
    const out = await proposeSimple({ start: START, target: { distanceKm: 6, ascentM: 0 }, terrain: terrain(feature('dirt_path', 90, 3500)) }, route);
    expect(out.ok && out.proposal.repeats).toBeUndefined();
    if (!out.ok) return;
    expect(out.proposal.distanceM).toBeCloseTo(6000, -1);
    expect(proposalTitle(out.proposal)).toBe('Heen en terug over hetzelfde pad');
    expect(proposalFacts(out.proposal)).toBe('6 km · vrijwel vlak');
    expect(route.calls).toHaveLength(1);
  });

  it('zonder heuvels in de buurt: geen lus, en geen aanroep', async () => {
    const route = fakeRoute();
    const out = await proposeSimple({ start: START, target: { distanceKm: 9, ascentM: 300 }, terrain: terrain() }, route);
    expect(out).toEqual({ ok: false, reason: 'nothing' });
    expect(route.calls).toHaveLength(0);
  });

  it('zonder netwerk stopt hij na de eerste aanroep', async () => {
    const route = fakeRoute({ answers: [{ ok: false, reason: 'offline' }] });
    const out = await proposeSimple({ start: START, target: { distanceKm: 9, ascentM: 300 }, terrain: hills }, route);
    expect(out).toEqual({ ok: false, reason: 'offline' });
    expect(route.calls).toHaveLength(1);
  });

  it('knipt een lijn op een afstand', () => {
    const line = [START, offsetPoint(START, 0, 1000)].map((p, i) => ({ ...p, ele: i * 10 }));
    const cut = cutAt(line, 250);
    expect(lineLength(cut)).toBeCloseTo(250, 0);
    expect(cut[1].ele).toBeCloseTo(2.5, 1);
  });
});

describe('Avontuurlijk: één lus langs verschillende hellingen', () => {
  const around = terrain(
    feature('hill', 20, 1400, 40), feature('hill', 110, 1600, 30), feature('hill', 200, 1500, 25), feature('hill', 290, 1300, 35),
    feature('dirt_path', 65, 1500), feature('dirt_path', 155, 1200), feature('hill', 20, 1450, 20), feature('hill', 250, 100, 60),
  );

  it('zet de punten op volgorde van richting, zonder dubbele plekken en niets vlak bij het startpunt', () => {
    const vias = adventureVias({ start: START, target: { distanceKm: 12, ascentM: 200 }, terrain: around });
    const angles = vias.map((v) => Math.round(v.angle));
    // Op volgorde rond het startpunt, beginnend na het grootste gat.
    const turned = angles.map((a) => (a - angles[0] + 360) % 360);
    expect([...turned].sort((a, b) => a - b)).toEqual(turned);
    expect(vias.filter((v) => Math.round(v.angle) === 20)).toHaveLength(1);
    expect(vias.every((v) => metersBetween(START, v) >= 250)).toBe(true);
    expect(vias.length).toBeLessThanOrEqual(MAX_VIAS);
  });

  it('dunt uit tot de lus past, en houdt hellingen langer dan paden', () => {
    const vias = adventureVias({ start: START, target: { distanceKm: 7, ascentM: 100 }, terrain: around }, 0.5);
    expect(vias.length).toBeLessThan(6);
    expect(vias.filter((v) => v.hill).length).toBeGreaterThanOrEqual(vias.filter((v) => !v.hill).length);
  });

  it('maakt een lus die op het startpunt begint en eindigt, en telt de hellingen', async () => {
    const route = fakeRoute();
    const out = await proposeAdventure({ start: START, target: { distanceKm: 10, ascentM: 0 }, terrain: around }, route);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const first = route.calls[0];
    expect(first[0]).toEqual(START);
    expect(first[first.length - 1]).toEqual(START);
    expect(out.proposal.hills).toBeGreaterThanOrEqual(2);
    expect(out.proposal.repeatedShare).toBeLessThan(0.1);
    expect(route.calls.length).toBeLessThanOrEqual(MAX_ROUTE_CALLS);
    expect(proposalTitle(out.proposal)).toMatch(/^Eén lus langs \d hellingen$/);
  });

  it('een punt zonder pad in de buurt valt weg en de planner vraagt opnieuw', async () => {
    const route = fakeRoute({ answers: [{ ok: false, reason: 'unmapped', waypoint: 1 }] });
    const out = await proposeAdventure({ start: START, target: { distanceKm: 10, ascentM: 0 }, terrain: around }, route);
    expect(out.ok).toBe(true);
    expect(route.calls[1]).toHaveLength(route.calls[0].length - 1);
    expect(route.calls[1]).not.toContainEqual(route.calls[0][1]);
    // Ook in een latere ronde, met een ander bereik, komt het punt niet terug.
    for (const call of route.calls.slice(1)) expect(call).not.toContainEqual(route.calls[0][1]);
  });

  it('zonder iets in de buurt: drie punten op een cirkel door het startpunt', async () => {
    const vias = adventureVias({ start: START, target: { distanceKm: 8, ascentM: 0 }, terrain: terrain() });
    expect(vias).toHaveLength(3);
    const route = fakeRoute();
    const out = await proposeAdventure({ start: START, target: { distanceKm: 8, ascentM: 0 } }, route);
    expect(out.ok && proposalTitle(out.proposal)).toBe('Eén lus');
  });

  it('vraagt nooit vaker dan de grens, ook als geen lus past', async () => {
    const fail: RouteAnswer = { ok: false, reason: 'error' };
    const route = fakeRoute({ answers: [fail, fail, fail, fail, fail, fail] });
    const out = await proposeAdventure({ start: START, target: { distanceKm: 10, ascentM: 0 }, terrain: around }, route);
    expect(out).toEqual({ ok: false, reason: 'error' });
    expect(route.calls).toHaveLength(MAX_ROUTE_CALLS);
  });

  it('zegt het erbij als de lus korter is of minder stijgt dan de training', async () => {
    const out = await proposeAdventure({ start: START, target: { distanceKm: 10, ascentM: 300 }, terrain: around }, fakeRoute());
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(proposalNotes(out.proposal, { distanceKm: 10, ascentM: 300 })).toContain('Minder dan de 300 hoogtemeters van je training.');
    expect(proposalNotes({ ...out.proposal, distanceM: 5000 }, { distanceKm: 10, ascentM: 0 })).toContain('Korter dan de 10 km van je training.');
    expect(proposalNotes({ ...out.proposal, distanceM: 14000 }, { distanceKm: 10.5, ascentM: 0 })).toContain('Langer dan de 10,5 km van je training.');
  });
});

describe('proposeRoutes', () => {
  const hills = terrain(feature('hill', 40, 1500, 50), feature('hill', 160, 1400, 30), feature('hill', 280, 1600, 30));

  it('geeft beide lussen, en dezelfde invoer geeft dezelfde uitkomst', async () => {
    const input = { start: START, target: { distanceKm: 9, ascentM: 300 }, terrain: hills };
    const a = await proposeRoutes(input, fakeRoute({ height: 50 }));
    const b = await proposeRoutes(input, fakeRoute({ height: 50 }));
    expect(a.simple.ok && a.adventure.ok).toBe(true);
    expect(a).toEqual(b);
  });

  it('zonder helling op de kaart komt de helling van Simpel uit de avontuurlijke lus, zonder extra aanroep', async () => {
    // De lus gaat over een bult: 40 m omhoog in het eerste derde.
    const route = (async (waypoints: RoutePoint[]): Promise<RouteAnswer> => {
      const flatLine = await fakeRoute()(waypoints);
      if (!flatLine.ok) return flatLine;
      const n = flatLine.line.points.length;
      return { ok: true, line: { source: 'valhalla', points: flatLine.line.points.map((p, i) => ({ ...p, ele: 20 + 40 * Math.max(0, 1 - Math.abs(i / n - 0.33) / 0.15) })) } };
    }) as RouteFn;
    const plans = await proposeRoutes({ start: START, target: { distanceKm: 8, ascentM: 200 }, terrain: terrain() }, route);
    expect(plans.simple.ok && plans.simple.proposal.repeats).toBeGreaterThanOrEqual(3);
    expect(plans.simple.ok && plans.simple.proposal.source).toBe('valhalla');
  });

  it('gooit nooit, ook niet als de routeplanner dat doet', async () => {
    const route: RouteFn = () => Promise.reject(new Error('stuk'));
    const plans = await proposeRoutes({ start: START, target: { distanceKm: 9, ascentM: 300 }, terrain: hills }, route);
    expect(plans).toEqual({ simple: { ok: false, reason: 'error' }, adventure: { ok: false, reason: 'error' } });
  });

  it('geen tekst met een gedachtestreepje', async () => {
    const plans = await proposeRoutes({ start: START, target: { distanceKm: 9, ascentM: 300 }, terrain: hills }, fakeRoute({ height: 50 }));
    for (const o of [plans.simple, plans.adventure]) {
      if (!o.ok) continue;
      const all = [proposalTitle(o.proposal), proposalFacts(o.proposal), ...proposalNotes(o.proposal, { distanceKm: 20, ascentM: 900 })].join(' ');
      expect(all).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
