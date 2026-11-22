import { describe, expect, it } from 'vitest';
import type { NearbyTerrain, TerrainFeature } from '../models/nearbyTerrain';
import type { RouteAnswer, RouteFn, RoutePoint, RouteProposal } from '../models/route';
import { bearing, metersBetween, offsetPoint, repeatedShare } from './routeGeometry';
import { MAX_ROUTE_CALLS, proposeAdventure } from './routePlanner';
import { DIRECTION_HALF_WIDTH, OTHER_LOOP_CHOICES, SKIP_HALF_WIDTH, loopHeading, proposeOtherLoop, reverseLoop } from './routeOtherLoop';

// Alles hier is nagemaakt: een startpunt dat nergens is en heuvels die niet bestaan.
const START: RoutePoint = { lat: 52.1, lon: 5.9 };
const TARGET = { distanceKm: 12, ascentM: 0 };

function feature(kind: TerrainFeature['kind'], deg: number, meters: number, heightM?: number): TerrainFeature {
  const p = offsetPoint(START, deg, meters);
  return { kind, lat: Math.round(p.lat * 1e4) / 1e4, lon: Math.round(p.lon * 1e4) / 1e4, distanceM: Math.round(meters), heightM };
}
const terrain = (...features: TerrainFeature[]): NearbyTerrain => ({ source: 'osm', fetchedAt: '2026-11-01T08:00:00.000Z', place: { name: '', lat: 52.1, lon: 5.9 }, radiusM: 3000, features });

const loopOf = (extra: Partial<RouteProposal> = {}): RouteProposal => ({ style: 'adventure', source: 'brouter', points: [START], distanceM: 12000, ascentM: 0, repeatedShare: 0, ...extra });

// Een punt per 25 m langs de rechte stukken tussen de punten.
function straight(waypoints: RoutePoint[], spurs: RoutePoint[] = []): RoutePoint[] {
  const points: RoutePoint[] = [];
  const leg = (a: RoutePoint, b: RoutePoint) => {
    const steps = Math.max(1, Math.round(metersBetween(a, b) / 25));
    for (let i = points.length === 0 ? 0 : 1; i <= steps; i++) points.push({ lat: a.lat + (b.lat - a.lat) * (i / steps), lon: a.lon + (b.lon - a.lon) * (i / steps), ele: 20 });
  };
  for (let w = 1; w < waypoints.length; w++) {
    leg(waypoints[w - 1], waypoints[w]);
    // `spurs`: bij die punten loopt de lijn over hetzelfde stuk terug en weer heen.
    if (spurs.some((spur) => metersBetween(waypoints[w], spur) < 5)) {
      const tip = offsetPoint(waypoints[w], 130, 280);
      // Drie keer heen en terug: een lang stuk dubbel, ook op een lus van twaalf kilometer.
      for (let k = 0; k < 3; k++) {
        leg(waypoints[w], tip);
        leg(tip, waypoints[w]);
      }
    }
  }
  return points;
}

function fakeRoute(spurs?: RoutePoint[], everyThere = false): RouteFn & { calls: RoutePoint[][] } {
  const calls: RoutePoint[][] = [];
  const fn = (async (waypoints: RoutePoint[]): Promise<RouteAnswer> => {
    calls.push(waypoints);
    // Elke lus gaat heen en terug over hetzelfde pad: de punten heen, daarna dezelfde terug.
    const out = everyThere ? [...waypoints.slice(0, -1), ...[...waypoints.slice(0, -1)].reverse().slice(1)] : waypoints;
    return { ok: true, line: { source: 'brouter', points: straight(out, spurs) } };
  }) as RouteFn & { calls: RoutePoint[][] };
  fn.calls = calls;
  return fn;
}

// De punten van een aanroep zonder het begin en het eind (het startpunt).
const inner = (call: RoutePoint[]) => call.slice(1, -1);
const away = (deg: number, from: number) => Math.abs(((deg - from + 540) % 360) - 180);

const ring = terrain(
  feature('hill', 90, 2400, 40), feature('dirt_path', 60, 2000), feature('hill', 120, 2200, 30),
  feature('hill', 200, 2300, 35), feature('dirt_path', 250, 2100), feature('hill', 300, 2500, 45), feature('dirt_path', 350, 1800), feature('hill', 20, 2000, 25),
);

describe('Andere lus: Andersom', () => {
  it('keert de punten om, houdt de afstand en telt het stijgen opnieuw', () => {
    // Eerst 60 m omhoog in twee stappen, dan 50 m omlaag naar 10 m en weer 10 m omlaag naar 0.
    const points: RoutePoint[] = [0, 30, 60, 60, 10, 0].map((ele, i) => ({ ...offsetPoint(START, 90, i * 100), ele }));
    const loop = loopOf({ points, distanceM: 500, ascentM: 60 });
    const back = reverseLoop(loop);
    expect(back.points).toEqual([...points].reverse());
    expect(back.distanceM).toBe(500);
    // De laatste stukken waren omlaag: achterstevoren stijgt dit 50 m, en de eerste 60 m daalt nu.
    expect(back.ascentM).toBeLessThan(loop.ascentM + 1);
    expect(back.ascentM).toBe(60);
    expect(reverseLoop(back).points).toEqual(points);
  });

  it('een lus die alleen omhoog gaat, daalt achterstevoren', () => {
    const points: RoutePoint[] = [0, 30, 60, 90].map((ele, i) => ({ ...offsetPoint(START, 0, i * 200), ele }));
    expect(reverseLoop(loopOf({ points, distanceM: 600, ascentM: 90 })).ascentM).toBe(0);
  });
});

describe('Andere lus: Een andere kant op', () => {
  it('slaat de kant over waar de vorige lus heen ging', async () => {
    const first = await proposeAdventure({ start: START, target: TARGET, terrain: ring }, fakeRoute());
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const heading = loopHeading(first.proposal.points, START) as number;
    const route = fakeRoute();
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: ring }, route, 'otherSide', first.proposal);
    expect(out.ok).toBe(true);
    expect(route.calls.length).toBeGreaterThan(0);
    expect(route.calls.length).toBeLessThanOrEqual(MAX_ROUTE_CALLS);
    for (const call of route.calls) {
      expect(inner(call).length).toBeGreaterThan(0);
      for (const p of inner(call)) expect(away(bearing(START, p), heading)).toBeGreaterThan(SKIP_HALF_WIDTH - 1);
    }
  });

  it('slaat de sector over ook als er alleen daar paden liggen: de lus gaat dan om het lege deel', async () => {
    const east = terrain(feature('hill', 90, 2400, 40), feature('dirt_path', 80, 2000));
    const previous = loopOf({ points: [START, offsetPoint(START, 90, 2400), START] });
    const route = fakeRoute();
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: east }, route, 'otherSide', previous);
    expect(out.ok).toBe(true);
    for (const call of route.calls) {
      for (const p of inner(call)) expect(away(bearing(START, p), 90)).toBeGreaterThan(SKIP_HALF_WIDTH - 1);
    }
  });
});

describe('Andere lus: een richting', () => {
  it.each([['north', 0], ['east', 90], ['south', 180], ['west', 270]] as const)('%s houdt alleen punten in die richting', async (choice, deg) => {
    const route = fakeRoute();
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: ring }, route, choice, loopOf());
    expect(out.ok).toBe(true);
    expect(route.calls.length).toBeLessThanOrEqual(MAX_ROUTE_CALLS);
    for (const call of route.calls) {
      expect(inner(call).length).toBeGreaterThan(0);
      for (const p of inner(call)) expect(away(bearing(START, p), deg)).toBeLessThanOrEqual(DIRECTION_HALF_WIDTH + 1);
    }
    if (out.ok) expect(out.note).toBeUndefined();
  });

  it('vult aan in die richting als er te weinig paden zijn', async () => {
    const some = terrain(feature('hill', 80, 900, 40), feature('hill', 270, 2200, 30));
    const route = fakeRoute();
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: some }, route, 'east', loopOf());
    expect(out.ok).toBe(true);
    for (const call of route.calls) {
      for (const p of inner(call)) expect(away(bearing(START, p), 90)).toBeLessThanOrEqual(DIRECTION_HALF_WIDTH + 1);
    }
    // Meer dan alleen de ene heuvel: de rest is aanvulling, ook in het oosten.
    expect(inner(route.calls[0]).length).toBeGreaterThan(1);
  });

  it('zegt het droge feit als die kant op niets ligt, met de beste lus die er wel is', async () => {
    const westOnly = terrain(feature('hill', 270, 2000, 40), feature('dirt_path', 250, 1800), feature('hill', 300, 2300, 30));
    const route = fakeRoute();
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: westOnly }, route, 'east', loopOf());
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.note).toMatch(/^Naar het oosten liggen binnen 3 km geen paden of hellingen\. De beste lus die er wel is gaat naar het (noord|zuid)?west(en)?\.$/);
    // De lus is de gewone beste lus: hij gaat naar het westen, waar iets ligt.
    expect(inner(route.calls[0]).some((p) => away(bearing(START, p), 270) < 60)).toBe(true);
    expect(route.calls.length).toBeLessThanOrEqual(MAX_ROUTE_CALLS);
  });

  it('een mislukte routeplanner geeft een regel en laat de lus staan', async () => {
    const fail: RouteFn = async () => ({ ok: false, reason: 'timeout' });
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: ring }, fail, 'north', loopOf());
    expect(out).toEqual({ ok: false, line: 'De routeplanner antwoordde niet op tijd. De lus blijft zoals hij was.' });
  });
});

describe('Andere lus: Zonder heen en terug', () => {
  it('wint de lus met de kleinste herhaling', async () => {
    const t = terrain(feature('hill', 40, 2400, 40), feature('hill', 130, 2300, 35), feature('hill', 220, 2400, 30), feature('hill', 310, 2300, 30));
    // De heuvel op 130 graden is een stuk heen en terug zolang dat punt in de lus zit.
    const spur = { lat: t.features[1].lat, lon: t.features[1].lon };
    const route = fakeRoute([spur]);
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: t }, route, 'noRepeat', loopOf({ repeatedShare: 0.1, deadEnds: 1 }));
    // De planner probeerde eerst de lus met dat stuk en koos daarna de lus zonder.
    expect(route.calls.some((c) => c.some((p) => metersBetween(p, spur) < 5))).toBe(true);
    expect(route.calls.length).toBeGreaterThan(1);
    expect(route.calls.length).toBeLessThanOrEqual(MAX_ROUTE_CALLS);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.proposal.points.some((p) => metersBetween(p, spur) < 50)).toBe(false);
    expect(out.proposal.repeatedShare).toBeLessThanOrEqual(0.03);
    expect(repeatedShare(out.proposal.points)).toBe(out.proposal.repeatedShare);
    expect(out.note).toBeUndefined();
  });

  it('zegt het eerlijk als elke lus een stuk dubbel loopt', async () => {
    const route = fakeRoute(undefined, true);
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: ring }, route, 'noRepeat', loopOf({ repeatedShare: 0.5, deadEnds: 1 }));
    expect(route.calls.length).toBeLessThanOrEqual(MAX_ROUTE_CALLS);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.note).toMatch(/^Een lus zonder stukken twee keer lukte hier niet\. Dit is de lus met het minst: ongeveer \d+ procent loop je twee keer\.$/);
  });

  it('een lus die al niets dubbel loopt geeft de regel, zonder aanroep', async () => {
    const route = fakeRoute();
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: ring }, route, 'noRepeat', loopOf());
    expect(out).toEqual({ ok: false, line: 'Deze lus loopt al geen stuk twee keer.' });
    expect(route.calls.length).toBe(0);
  });
});

describe('Andere lus: de keuzes', () => {
  it('heeft zeven keuzes met een eigen label in zinsletters', () => {
    expect(OTHER_LOOP_CHOICES.map((c) => c.label)).toEqual(['Andersom', 'Een andere kant op', 'Noord', 'Oost', 'Zuid', 'West', 'Zonder heen en terug']);
    for (const c of OTHER_LOOP_CHOICES) expect(c.line).not.toMatch(/[–—]/);
  });
});
