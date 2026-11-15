import { describe, expect, it } from 'vitest';
import type { NearbyTerrain, TerrainFeature } from '../models/nearbyTerrain';
import type { RouteAnswer, RouteFn, RoutePoint, RouteProposal } from '../models/route';
import { lineLength, metersBetween, offsetPoint } from './routeGeometry';
import {
  CLOSE_ENOUGH, SHORT_LIMIT, ascentNotice, MAX_ROUTE_CALLS, MAX_VIAS, SUBSTITUTE_LINE, adventureVias, searchLines, terrainFound, climbOnLine, composeOutAndBack, composeSimple, cutAt, tallestClimbLine, proposalFacts, proposalNotes, proposalTitle,
  proposeAdventure, proposeRoutes, proposeSimple, simpleCandidates, LONGER_WALK_LEAD, longerWalkLine, walkBasisLine, walkFitLine,
} from './routePlanner';
import { loopLines, otherLoopLine, otherLoopWarn } from './routeSheet';

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
    expect(proposalNotes(p, { distanceKm: 9, ascentM: 300 })).toEqual(['Gemarkeerd op de kaart: hier 6 keer op, 50 m omhoog over 500 m.', 'Op dezelfde helling kan je horloge naar het verkeerde stuk springen.', '8 km, korter dan de 9 km van je training.']);
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
    const vias = adventureVias({ start: START, target: { distanceKm: 7, ascentM: 100 }, terrain: around });
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
    // De melding hangt aan de lus (proposeRoutes zet hem erop) en staat dan tussen de regels.
    expect(proposalNotes({ ...out.proposal, notice: ascentNotice(out.proposal, { distanceKm: 10, ascentM: 300 }) }, { distanceKm: 10, ascentM: 300 })).toContain('Deze lus stijgt 0 m; de training vraagt 300 m.');
    expect(proposalNotes({ ...out.proposal, distanceM: 5000 }, { distanceKm: 10, ascentM: 0 })).toContain('5 km, korter dan de 10 km van je training.');
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
    expect(plans).toEqual({ simple: { ok: false, reason: 'error' }, adventure: { ok: false, reason: 'error' }, found: { hills: 3, unknown: 0, lower: 0, tallestM: 50, radiusM: 3000 } });
  });

  it('een wandeltraining: de zin en het getal van de lus noemen wat de training vraagt, niet wat in de duur past', async () => {
    // De bergtocht van 3 uur met 500 m: de planner mikt op 375 m (engine/hikeTarget.ts), de training vraagt 500.
    const hike = { distanceKm: 8, ascentM: 375, minutes: 180, packKg: 6, askedAscentM: 500 };
    expect(ascentNotice({ ascentM: 360 }, hike)).toBe('Deze lus stijgt 360 m; de training vraagt 500 m.');
    expect(ascentNotice({ ascentM: 380 }, hike)).toBeUndefined();
    // Zonder askedAscentM (een loop) zoals altijd.
    expect(ascentNotice({ ascentM: 100 }, { distanceKm: 8, ascentM: 375 })).toBe('Deze lus stijgt 100 m; de training vraagt 380 m.');
    const plans = await proposeRoutes({ start: START, target: hike, terrain: hills }, fakeRoute({ height: 50 }));
    const made = [plans.simple, plans.adventure].filter((o) => o.ok);
    expect(made.length).toBeGreaterThan(0);
    for (const o of made) if (o.ok) expect(o.proposal.targetAscentM).toBe(500);
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

describe('Wat er gevonden is', () => {
  const hilly = { distanceKm: 10.5, ascentM: 300 };

  it('telt alleen de bruikbare hellingen, met de hoogste; zonder kaart niets, ook geen nul', () => {
    expect(terrainFound(terrain(feature('hill', 40, 1500, 24), feature('hill', 200, 900, 12), feature('hill', 300, 600, 8), feature('steps', 10, 300)))).toEqual({ hills: 2, unknown: 0, lower: 1, tallestM: 24, radiusM: 3000 });
    // Een helling zonder bekende hoogte telt niet als helling, wel apart.
    expect(terrainFound(terrain(feature('hill', 40, 1500)))).toEqual({ hills: 0, unknown: 1, lower: 0, radiusM: 3000 });
    expect(terrainFound(terrain())).toEqual({ hills: 0, unknown: 0, lower: 0, radiusM: 3000 });
    expect(terrainFound(undefined)).toBeUndefined();
  });

  it('geen hellingen gevonden: dat staat er, met waar je de hoogte anders haalt', async () => {
    const plans = await proposeRoutes({ start: START, target: hilly, terrain: terrain(feature('dirt_path', 90, 1200)) }, fakeRoute());
    expect(plans.found).toEqual({ hills: 0, unknown: 0, lower: 0, radiusM: 3000 });
    expect(plans.simple.ok).toBe(false);
    // De lus zegt zelf wat er in de buurt ligt; bovenaan blijft alleen waar je de hoogte anders haalt.
    expect(searchLines(plans, hilly)).toEqual([SUBSTITUTE_LINE]);
    expect(plans.adventure.ok && plans.adventure.proposal.notice).toBe('Geen heuvels binnen 3 km. Deze lus stijgt 0 m; de training vraagt 300 m.');
  });

  it('hellingen gevonden maar geen bruikbaar voorstel: de telling, de hoogste en de vervanger', async () => {
    const plans = await proposeRoutes({ start: START, target: hilly, terrain: terrain(feature('hill', 40, 1500, 24), feature('hill', 160, 1400, 14), feature('hill', 300, 600, 8)) }, fakeRoute());
    expect(plans.simple).toEqual({ ok: false, reason: 'nothing' });
    expect(searchLines(plans, hilly)).toEqual([SUBSTITUTE_LINE]);
    expect(plans.adventure.ok && plans.adventure.proposal.notice).toBe('De hoogste helling dichtbij ligt 24 m boven je plek. Deze lus stijgt 0 m; de training vraagt 300 m.');
  });

  it('een lus die de hoogte haalt: geen vervanger en geen melding bij die lus', async () => {
    const plans = await proposeRoutes({ start: START, target: { distanceKm: 9, ascentM: 300 }, terrain: terrain(feature('hill', 40, 1500, 50)) }, fakeRoute({ height: 50 }));
    expect(plans.simple.ok).toBe(true);
    expect(plans.simple.ok && plans.simple.proposal.notice).toBeUndefined();
    expect(searchLines(plans, { distanceKm: 9, ascentM: 300 })).not.toContain(SUBSTITUTE_LINE);
    // Zonder melding bij een lus staat de telling bovenaan.
    const both = { ...plans, adventure: plans.simple };
    expect(searchLines(both, { distanceKm: 9, ascentM: 300 })).toEqual(['Eén helling in de buurt op de kaart, 50 m boven je plek.']);
  });

  it('een vlakke training krijgt geen uitleg over hellingen', async () => {
    const plans = await proposeRoutes({ start: START, target: { distanceKm: 6, ascentM: 0 }, terrain: terrain() }, fakeRoute());
    expect(searchLines(plans, { distanceKm: 6, ascentM: 0 })).toEqual([]);
  });

  it('antwoordde de routeplanner niet, dan geen telling en geen vervanger', async () => {
    for (const reason of ['offline', 'timeout', 'error'] as const) {
      const fail: RouteAnswer = { ok: false, reason };
      const plans = await proposeRoutes({ start: START, target: hilly, terrain: terrain() }, fakeRoute({ answers: [fail, fail, fail, fail, fail, fail] }));
      expect(searchLines(plans, hilly)).toEqual([]);
    }
  });

  it('zonder antwoord van de kaart wel de vervanger, maar geen telling', async () => {
    const plans = await proposeRoutes({ start: START, target: hilly }, fakeRoute());
    expect(plans.found).toBeUndefined();
    expect(searchLines(plans, hilly)).toEqual([SUBSTITUTE_LINE]);
  });

  const loop = (distanceM: number) => ({ style: 'adventure' as const, source: 'brouter' as const, points: [], distanceM, ascentM: 0, repeatedShare: 0 });
  const pct = String(Math.round(SHORT_LIMIT * 100));

  it('een lus binnen de marge korter: hoeveel korter, en dat dat goed genoeg is (het getal uit de planner)', () => {
    const notes = proposalNotes(loop(9600), { distanceKm: 10.5, ascentM: 0 });
    expect(CLOSE_ENOUGH).toBeGreaterThan(SHORT_LIMIT);
    expect(notes).toEqual([`0,9 km korter dan je training. Tot ${pct} procent korter is goed genoeg.`]);
    // Net binnen de marge en net erbuiten.
    expect(proposalNotes(loop(10500 * (1 - SHORT_LIMIT) + 1), { distanceKm: 10.5, ascentM: 0 })[0]).toContain(`Tot ${pct} procent`);
    expect(proposalNotes(loop(10500 * (1 - SHORT_LIMIT) - 1), { distanceKm: 10.5, ascentM: 0 })).toEqual(['9,4 km, korter dan de 10,5 km van je training.']);
  });

  it('een lus precies even lang (ook op de getallen die je ziet) krijgt geen korter-zin', () => {
    expect(proposalNotes(loop(10500), { distanceKm: 10.5, ascentM: 0 })).toEqual([]);
    expect(proposalNotes(loop(10460), { distanceKm: 10.5, ascentM: 0 })).toEqual([]);
    expect(proposalNotes(loop(10800), { distanceKm: 10.5, ascentM: 0 })).toEqual([]);
  });

  it('geen gedachtestreepje in de uitleg', async () => {
    const plans = await proposeRoutes({ start: START, target: hilly, terrain: terrain(feature('hill', 40, 1500, 24)) }, fakeRoute());
    const all = [...searchLines(plans, hilly), ...proposalNotes(loop(9600), hilly)].join(' ');
    expect(all).not.toMatch(/[\u2013\u2014]/);
  });
});

// Routes voor wandelen, stap 3: de woorden (docs/visie/Ontwerp routes wandelen en rugzak.md, hoofdstuk 4).
describe('de woorden van een wandeling', () => {
  const norm = { flatKmh: 4, upMph: 300, downMph: 500, basis: 'norm' as const };
  const hike = { distanceKm: 8, ascentM: 375, minutes: 180, packKg: 8, askedAscentM: 500, rates: norm };
  const loop = (km: number, up: number, extra: Partial<RouteProposal> = {}): RouteProposal => ({ style: 'adventure', source: 'brouter', points: [], distanceM: km * 1000, ascentM: up, repeatedShare: 0, targetAscentM: 500, ...extra });

  it('elke lus zegt zijn tijd op de wandelnorm; een loop niet', () => {
    expect(proposalFacts(loop(8.4, 360), hike)).toBe('8,4 km · 360 hoogtemeters · ongeveer 3 uur 5');
    expect(proposalFacts(loop(8.4, 360))).toBe('8,4 km · 360 hoogtemeters');
    expect(proposalFacts(loop(8.4, 360), { distanceKm: 8, ascentM: 375 })).toBe('8,4 km · 360 hoogtemeters');
    expect(otherLoopLine('Avontuurlijk', loop(8.4, 360), hike)).toBe('Avontuurlijk, één lus: 8,4 km · 360 hoogtemeters · ongeveer 3 uur 5');
  });

  it('een lus van 24,8 km bij een training van 180 minuten: langer dan je training, in amber', () => {
    const p = loop(24.8, 0, { targetAscentM: undefined });
    const target = { ...hike, askedAscentM: undefined, ascentM: 0 };
    const notes = proposalNotes(p, target);
    expect(notes).toContain('Deze lus duurt ongeveer 6 uur 10, langer dan de 3 uur van je training.');
    expect(notes.some((n) => n.startsWith('Langer dan de'))).toBe(false);
    expect(loopLines(p, target, notes).warn).toContain('Deze lus duurt ongeveer 6 uur 10, langer dan de 3 uur van je training.');
    expect(otherLoopWarn(p, target)).toBe('Deze lus duurt ongeveer 6 uur 10, langer dan de 3 uur van je training.');
    // Is de gekozen lus ook te lang, dan zegt alleen die het: één waarschuwing per kaart.
    expect(otherLoopWarn(p, target, p)).toBeUndefined();
    expect(otherLoopWarn(p, target, loop(8.4, 0, { targetAscentM: undefined }))).toBe('Deze lus duurt ongeveer 6 uur 10, langer dan de 3 uur van je training.');
    // De grens is 12 procent boven de duur: 13 km vlak (3 uur 15) nog niet, 13,6 km vlak (3 uur 25) wel.
    const flat = { ...hike, askedAscentM: undefined, ascentM: 0 };
    expect(proposalNotes(loop(13, 0, { targetAscentM: undefined }), flat).some((n) => n.startsWith(LONGER_WALK_LEAD))).toBe(false);
    expect(proposalNotes(loop(13.6, 0, { targetAscentM: undefined }), flat)).toContain('Deze lus duurt ongeveer 3 uur 25, langer dan de 3 uur van je training.');
    // Vlak bij de grens (201,6 minuten): 13,4 km (201 minuten) nog niet, 13,5 km (202,5 minuten) wel. Zo valt een grens van 10 procent op.
    expect(proposalNotes(loop(13.4, 0, { targetAscentM: undefined }), flat).some((n) => n.startsWith(LONGER_WALK_LEAD))).toBe(false);
    expect(proposalNotes(loop(13.5, 0, { targetAscentM: undefined }), flat).some((n) => n.startsWith(LONGER_WALK_LEAD))).toBe(true);
    // Op de duur af (3 uur 5 bij 3 uur): geen regel.
    expect(proposalNotes(loop(8.4, 360), hike).some((n) => n.startsWith(LONGER_WALK_LEAD))).toBe(false);
  });

  it('waar het getal op rust, letterlijk, op de norm en op je eigen klimtempo', () => {
    expect(walkBasisLine(norm)).toBe('Gerekend op de wandelnorm: 4 km per uur, 300 m per uur omhoog en 500 omlaag. Zonder pauzes en zonder rugzak.');
    expect(walkBasisLine({ flatKmh: 4, upMph: 452, downMph: 700, basis: 'own', packKg: 8 })).toBe('Op je eigen klimtempo: 450 m per uur omhoog, met 8 kg rugzak. Zonder pauzes.');
    expect(walkBasisLine({ flatKmh: 4, upMph: 450, downMph: 700, basis: 'own' })).toBe('Op je eigen klimtempo: 450 m per uur omhoog. Zonder pauzes.');
    // Gedempt bij de uitleg van de gekozen lus, nooit in amber.
    const { warn, info } = loopLines(loop(8.4, 360), hike, proposalNotes(loop(8.4, 360), hike));
    expect(info).toContain(walkBasisLine(norm));
    expect(warn).not.toContain(walkBasisLine(norm));
  });

  it('past de gevraagde stijging niet in de duur, dan één gedempte regel', () => {
    expect(walkFitLine(hike)).toBe('500 m op en af kost op de wandelnorm 2 uur 40. In 3 uur past 375 m.');
    expect(walkFitLine({ ...hike, ascentM: 500 })).toBeUndefined();
    expect(walkFitLine({ distanceKm: 8, ascentM: 375, askedAscentM: 500 })).toBeUndefined();
    expect(walkFitLine({ ...hike, rates: { ...norm, basis: 'own', upMph: 450, downMph: 700 } })).toBe('500 m op en af kost op je eigen klimtempo 1 uur 50. In 3 uur past 375 m.');
  });

  it('geen helling dichtbij op een wandeling: ook waar je de meters wel haalt, en hoogstens twee amber regels', () => {
    const none = { hills: 0, unknown: 0, lower: 0, radiusM: 3000 };
    const notice = ascentNotice({ ascentM: 0 }, hike, none);
    expect(notice).toBe(`Geen heuvels binnen 3 km. Deze lus stijgt 0 m; de training vraagt 500 m. ${SUBSTITUTE_LINE}`);
    // Een loop zoals altijd: de vervanger staat in de regel onder de lussen.
    expect(ascentNotice({ ascentM: 0 }, { distanceKm: 8, ascentM: 500 }, none)).toBe('Geen heuvels binnen 3 km. Deze lus stijgt 0 m; de training vraagt 500 m.');
    // Te lang, de melding en een grote weg: nog steeds hoogstens twee in amber.
    const p = loop(24.8, 0, { notice, bigRoadM: 900 });
    const { warn } = loopLines(p, hike, proposalNotes(p, hike));
    expect(warn.length).toBeLessThanOrEqual(2);
    // searchLines zegt de vervanger niet nog eens.
    const plans = { simple: { ok: true as const, proposal: loop(8, 0, { notice }) }, adventure: { ok: true as const, proposal: loop(8, 0, { notice }) }, found: none };
    expect(searchLines(plans, hike)).toEqual([]);
  });

  it('geen gedachtestreepje en geen ASCEND als onderwerp', () => {
    const all = [
      proposalFacts(loop(8.4, 360), hike), walkBasisLine(norm), walkBasisLine({ ...norm, basis: 'own', packKg: 8 }), walkFitLine(hike) ?? '',
      longerWalkLine(372, 180), ...proposalNotes(loop(24.8, 0), hike),
    ].join(' ');
    expect(all).not.toMatch(/[\u2013\u2014]/);
    expect(all).not.toMatch(/ASCEND/);
  });
});
