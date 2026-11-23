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

  it('zegt het droge feit als die kant op niets ligt en houdt de lus die er staat, zonder aanroep', async () => {
    const westOnly = terrain(feature('hill', 270, 2000, 40), feature('dirt_path', 250, 1800), feature('hill', 300, 2300, 30));
    const route = fakeRoute();
    const west = offsetPoint(START, 270, 2500);
    const previous = loopOf({ points: [START, west, START] });
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: westOnly }, route, 'east', previous);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.note).toBe('Naar het oosten liggen binnen 3 km geen paden of hellingen. De lus die er is gaat naar het westen.');
    expect(out.proposal.points).toEqual(previous.points);
    expect(route.calls).toHaveLength(0);
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
  it('heeft elf keuzes met een eigen label in zinsletters, zonder Simpel of Avontuurlijk', () => {
    expect(OTHER_LOOP_CHOICES.map((c) => c.label)).toEqual(['Andersom', 'Een andere kant op', 'Noord', 'Oost', 'Zuid', 'West', 'Zonder heen en terug', 'Langs water', 'Door bos of groen', 'Meer onverhard', 'Via een punt']);
    for (const c of OTHER_LOOP_CHOICES) {
      expect(c.line).not.toMatch(/[–—]/);
      expect(`${c.label} ${c.line}`).not.toMatch(/Simpel|Avontuurlijk/);
    }
  });
});

describe('Andere lus: Soort', () => {
  const kinds = terrain(
    feature('water', 80, 1800), feature('water', 100, 2200), feature('wood', 250, 2000), feature('wood', 270, 2300),
    feature('dirt_path', 340, 1900), feature('hill', 160, 2000, 40),
  );
  const near = (call: RoutePoint[], f: TerrainFeature) => call.some((p) => metersBetween(p, f) < 5);
  const scenic = { ...kinds, scenery: true as const };

  it('Langs water gebruikt alleen water als punten, in één zoektocht', async () => {
    const route = fakeRoute();
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: scenic }, route, 'water', loopOf());
    expect(out.ok).toBe(true);
    expect(route.calls.length).toBeGreaterThan(0);
    expect(route.calls.length).toBeLessThanOrEqual(MAX_ROUTE_CALLS);
    expect(kinds.features.filter((f) => f.kind === 'water').some((f) => near(route.calls[0], f))).toBe(true);
    expect(kinds.features.filter((f) => f.kind !== 'water').some((f) => near(route.calls[0], f))).toBe(false);
  });

  it('Door bos of groen en Meer onverhard kiezen hun eigen soort', async () => {
    const wood = fakeRoute();
    await proposeOtherLoop({ start: START, target: TARGET, terrain: scenic }, wood, 'wood', loopOf());
    expect(kinds.features.filter((f) => f.kind === 'wood').some((f) => near(wood.calls[0], f))).toBe(true);
    expect(kinds.features.filter((f) => f.kind !== 'wood').some((f) => near(wood.calls[0], f))).toBe(false);
    const dirt = fakeRoute();
    await proposeOtherLoop({ start: START, target: TARGET, terrain: scenic }, dirt, 'unpaved', loopOf());
    expect(near(dirt.calls[0], feature('dirt_path', 340, 1900))).toBe(true);
    expect(kinds.features.filter((f) => f.kind === 'water' || f.kind === 'wood').some((f) => near(dirt.calls[0], f))).toBe(false);
  });

  it('vindt hij niets van die soort binnen het eerste zoekbereik, dan één droge zin en geen aanroep', async () => {
    const route = fakeRoute();
    const nothing = { ...terrain(feature('water', 80, 5000), feature('hill', 160, 2000, 40)), scenery: true as const };
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: nothing }, route, 'water', loopOf());
    expect(out).toEqual({ ok: false, line: 'Binnen 3 km ligt geen water. De lus blijft zoals hij was.' });
    expect(route.calls).toHaveLength(0);
  });

  it('zegt eerlijk dat water en bos nog niet zijn opgehaald bij een oudere bewaarde plek', async () => {
    const route = fakeRoute();
    const out = await proposeOtherLoop({ start: START, target: TARGET, terrain: kinds }, route, 'water', loopOf());
    expect(out.ok).toBe(false);
    expect(route.calls).toHaveLength(0);
  });
});

describe('Andere lus: Via een punt', () => {
  const VIA = offsetPoint(START, 45, 2500);

  it('gaat langs het punt en komt terug bij de start, binnen MAX_ROUTE_CALLS', async () => {
    const route = fakeRoute();
    const out = await proposeOtherLoop({ start: START, target: TARGET }, route, 'via', loopOf(), VIA);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(route.calls.length).toBeLessThanOrEqual(MAX_ROUTE_CALLS);
    expect(route.calls[0][1].lat).toBeCloseTo(VIA.lat, 6);
    expect(out.proposal.points.some((p) => metersBetween(p, VIA) < 250)).toBe(true);
    const pts = out.proposal.points;
    expect(metersBetween(pts[0], START)).toBeLessThan(10);
    expect(metersBetween(pts[pts.length - 1], START)).toBeLessThan(10);
    expect(out.note).toBe('Deze lus gaat langs het punt dat je koos.');
  });

  it('weigert een punt in een stuk dat je vermijdt, zonder aanroep', async () => {
    const route = fakeRoute();
    const out = await proposeOtherLoop({ start: START, target: TARGET, avoid: [{ lat: VIA.lat, lon: VIA.lon, radiusM: 300 }] }, route, 'via', loopOf(), VIA);
    expect(out.ok).toBe(false);
    expect(route.calls).toHaveLength(0);
  });

  it('zegt dat er geen pad bij het punt ligt als de planner het niet kent, en laat het punt niet vallen', async () => {
    const route = (async (): Promise<RouteAnswer> => ({ ok: false, reason: 'unmapped', waypoint: 1 })) as RouteFn;
    const out = await proposeOtherLoop({ start: START, target: TARGET }, route, 'via', loopOf(), VIA);
    expect(out).toEqual({ ok: false, line: 'Bij dat punt ligt geen pad dat de routeplanner kent. De lus blijft zoals hij was.' });
  });
});
