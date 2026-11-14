// De vorm van een lus (eigenaar 14 november, schermafdrukken op reis): een "heen en terug" tekende een Y met
// twee doodlopende takken, een "Eén lus" had een doodlopend stuk. Hier de telling, de naam, de keuze, de
// klim op de kaart, grote wegen en de waarschuwing in de ingeklapte rij. Alles is nagemaakt: een plek
// die nergens is en lijnen die niet bestaan.
import { describe, expect, it } from 'vitest';
import type { NearbyTerrain, TerrainFeature } from '../models/nearbyTerrain';
import type { RouteAnswer, RouteFn, RoutePoint, RouteProposal } from '../models/route';
import { bearing, bigRoadMeters, deadEnds, lineLength, metersBetween, offsetPoint, withoutDeadEnds } from './routeGeometry';
import { BIG_ROAD_LEAD, BIG_ROAD_NOTE_M, proposeSimple, adventureVias, climbStretch, composeSimple, proposalNotes, proposalTitle, proposeAdventure, proposeRoutes, viaAtDeadEnd } from './routePlanner';
import { MAX_WARN_LINES, loopLines, otherLoopLine, otherLoopWarn } from './routeSheet';
import { brouterUrl, mapBrouter } from '../integrations/brouter';
import { valhallaUrl } from '../integrations/valhalla';

const START: RoutePoint = { lat: 52.1, lon: 5.9 };

// Een lijn langs de punten met een punt om de 25 m, zoals een routeplanner hem geeft.
function walk(...corners: RoutePoint[]): RoutePoint[] {
  const out: RoutePoint[] = [corners[0]];
  for (let c = 1; c < corners.length; c++) {
    const a = corners[c - 1];
    const b = corners[c];
    const steps = Math.max(1, Math.round(metersBetween(a, b) / 25));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const p: RoutePoint = { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
      if (a.ele !== undefined && b.ele !== undefined) p.ele = a.ele + (b.ele - a.ele) * t;
      out.push(p);
    }
  }
  return out;
}
const at = (deg: number, m: number, from: RoutePoint = START): RoutePoint => offsetPoint(from, deg, m);
// Van het startpunt af, zodat een tak niet over de lus zelf loopt.
const bearingOut = (p: RoutePoint): number => bearing(START, p);

describe('doodlopende stukken tellen', () => {
  const junction = at(0, 600);
  const tipA = at(45, 400, junction);
  const tipB = at(315, 400, junction);

  it('een Y: twee takken, ook als je ze heen en terug loopt', () => {
    const y = walk(START, junction, tipA, junction, tipB, junction, START);
    expect(deadEnds(y)).toHaveLength(2);
  });

  it('heen en terug zonder takken: één, met een bocht erin', () => {
    const bend = at(90, 800);
    const out = walk(START, bend, at(0, 700, bend));
    const line = [...out, ...[...out].reverse().slice(1)];
    expect(deadEnds(line)).toHaveLength(1);
  });

  it('de lengte van een tak klopt op een stap na, en knippen laat de rest staan', () => {
    const j = at(0, 1000);
    const y = walk(START, j, at(90, 500, j), j, at(0, 1000, j));
    const ends = deadEnds(y);
    expect(ends).toHaveLength(1);
    expect(Math.abs(ends[0].lengthM - 500)).toBeLessThanOrEqual(10);
    expect(Math.abs(lineLength(withoutDeadEnds(y)) - 2000)).toBeLessThanOrEqual(25);
  });

  it('een echte lus: geen', () => {
    expect(deadEnds(walk(START, at(0, 1000), at(45, 1414), at(90, 1000), START))).toHaveLength(0);
  });

  it('een lus met één doodlopend stuk: één, op het keerpunt', () => {
    const side = at(0, 1000);
    const spurTip = at(270, 250, at(0, 500));
    const loop = walk(START, at(0, 500), spurTip, at(0, 500), side, at(45, 1414), at(90, 1000), START);
    const ends = deadEnds(loop);
    expect(ends).toHaveLength(1);
    expect(metersBetween(ends[0].tip, spurTip)).toBeLessThan(15);
  });

  it('een tak korter dan 80 m telt niet, een haarspeldbocht met benen 30 m uit elkaar ook niet', () => {
    const mid = at(0, 500);
    expect(deadEnds(walk(START, mid, at(90, 50, mid), mid, at(0, 1000), at(90, 1000), START))).toHaveLength(0);
    const bend = at(0, 300);
    expect(deadEnds(walk(START, bend, at(90, 30, bend), at(180, 300, at(90, 30, bend)), at(90, 600)))).toHaveLength(0);
  });

  it('zes keer dezelfde helling op en af is één stuk: de voet is geen keerpunt, de top wel', () => {
    const foot = { ...at(0, 800), ele: 20 };
    const top = { ...at(0, 1300), ele: 70 };
    const up = walk(foot, top);
    const down = [...up].reverse();
    const points = walk({ ...START, ele: 20 }, foot);
    for (let i = 0; i < 6; i++) points.push(...up.slice(1), ...down.slice(1));
    points.push(...walk(foot, { ...START, ele: 20 }).slice(1));
    expect(deadEnds(points)).toHaveLength(1);
  });

  it('withoutDeadEnds haalt een tak uit een aanloop', () => {
    const j = at(0, 500);
    const line = walk(START, j, at(90, 300, j), j, at(0, 1000));
    const clean = withoutDeadEnds(line);
    expect(deadEnds(clean)).toHaveLength(0);
    expect(lineLength(clean)).toBeLessThan(lineLength(line) - 500);
    expect(metersBetween(clean[clean.length - 1], at(0, 1000))).toBeLessThan(1);
  });
});

describe('de naam zegt de vorm', () => {
  const base: RouteProposal = { style: 'simple', source: 'brouter', points: [START], distanceM: 6000, ascentM: 0, repeatedShare: 1 };

  it('Simpel: heen en terug over twee takken; met herhalingen erachter', () => {
    expect(proposalTitle({ ...base, deadEnds: 1 })).toBe('Heen en terug over hetzelfde pad');
    expect(proposalTitle({ ...base, deadEnds: 2 })).toBe('Heen en terug over twee takken');
    expect(proposalTitle({ ...base, repeats: 6, deadEnds: 2 })).toBe('6 × de helling op en af, over twee takken');
    expect(proposalTitle({ ...base, repeats: 6, deadEnds: 1 })).toBe('6 × de helling op en af');
  });

  it('Avontuurlijk: Eén lus alleen zonder doodlopend stuk', () => {
    const adv: RouteProposal = { ...base, style: 'adventure', repeatedShare: 0 };
    expect(proposalTitle(adv)).toBe('Eén lus');
    expect(proposalTitle({ ...adv, deadEnds: 1 })).toBe('Lus met een stuk heen en terug');
    expect(proposalTitle({ ...adv, deadEnds: 2, hills: 3 })).toBe('Lus langs 3 hellingen met twee stukken heen en terug');
    expect(otherLoopLine('Avontuurlijk', { ...adv, deadEnds: 1 })).toBe('Avontuurlijk, lus met een stuk heen en terug: 6 km · vrijwel vlak');
    expect(otherLoopLine('Simpel', { ...base, deadEnds: 2 })).toBe('Simpel, heen en terug over twee takken: 6 km · vrijwel vlak');
  });
});

describe('de keuze: een Y valt af als er een betere is', () => {
  it('Simpel: een tak in de aanloop (de reserve uit de lus) valt weg, de lus heeft één doodlopend stuk', () => {
    const j = { ...at(0, 500), ele: 20 };
    const foot = { ...at(0, 900), ele: 20 };
    const top = { ...at(0, 1400), ele: 70 };
    const line = walk({ ...START, ele: 20 }, j, { ...at(90, 300, j), ele: 20 }, j, foot, top);
    const made = composeSimple({ source: 'brouter', points: line }, { distanceKm: 8, ascentM: 300 });
    expect(made?.deadEnds).toBe(1);
    expect(proposalTitle(made as RouteProposal)).toBe('6 × de helling op en af');
  });

  it('Avontuurlijk: past een lus met een tak, dan nog een poging zonder het punt bij de tak; de schone wint', async () => {
    const feature = (deg: number, m: number): TerrainFeature => ({ kind: 'dirt_path', ...at(deg, m), distanceM: m });
    const terrain: NearbyTerrain = { source: 'osm', fetchedAt: '2026-11-01T08:00:00.000Z', place: { name: '', lat: START.lat, lon: START.lon }, radiusM: 3000, features: [0, 60, 120, 180, 240, 300].map((d) => feature(d, 900)) };
    // De routeplanner loopt om (1,3 keer hemelsbreed): de lus gaat langs punten iets verder weg dan de vraag.
    const wide = (v: readonly RoutePoint[]) => v.map((p) => at(bearingOut(p), metersBetween(START, p) * 1.3));
    // Een training waarbij de schone lus past, en met een tak van 2 × 150 m ook.
    const fitting = [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map((km) => {
      const v = adventureVias({ start: START, target: { distanceKm: km, ascentM: 0 }, terrain });
      return { km, vias: v, len: lineLength(walk(START, ...wide(v), START)) };
    }).find((t) => t.vias.length >= 3 && t.len >= 0.9 * t.km * 1000 && t.len + 300 <= 1.12 * t.km * 1000);
    expect(fitting).toBeDefined();
    const { km: targetKm, vias } = fitting as { km: number; vias: RoutePoint[] };
    const corners = wide(vias);
    const clean = walk(START, ...corners, START);
    const spurAt = vias[1];
    // De tak loopt vanaf de hoek naar binnen, tot vlak bij het gevraagde punt.
    const inward = at(bearingOut(corners[1]) + 180, 150, corners[1]);
    const withSpur = walk(START, corners[0], corners[1], inward, corners[1], ...corners.slice(2), START);
    const calls: RoutePoint[][] = [];
    const route: RouteFn = async (wps): Promise<RouteAnswer> => {
      calls.push(wps);
      return { ok: true, line: { source: 'brouter', points: calls.length === 1 ? withSpur : clean } };
    };
    const out = await proposeAdventure({ start: START, target: { distanceKm: targetKm, ascentM: 0 }, terrain }, route);
    expect(calls).toHaveLength(2);
    expect(calls[1].some((p) => p.lat === spurAt.lat && p.lon === spurAt.lon)).toBe(false);
    expect(out.ok && out.proposal.deadEnds).toBeFalsy();
    expect(out.ok && proposalTitle(out.proposal)).toBe('Eén lus');
  });

  it('Simpel stopt niet bij een passende Y: de volgende kandidaat zonder tak wint', async () => {
    const path: TerrainFeature = { kind: 'dirt_path', ...at(0, 1500), distanceM: 1500 };
    const terrain: NearbyTerrain = { source: 'osm', fetchedAt: '2026-11-01T08:00:00.000Z', place: { name: '', lat: START.lat, lon: START.lon }, radiusM: 3000, features: [path] };
    const j = at(90, 500);
    const y = walk(START, j, at(0, 200, j), j, at(90, 2500));
    const straight = walk(START, at(180, 2500));
    let calls = 0;
    const route: RouteFn = async () => ({ ok: true, line: { source: 'brouter', points: ++calls === 1 ? y : straight } });
    const out = await proposeSimple({ start: START, target: { distanceKm: 4, ascentM: 0 }, terrain }, route);
    expect(calls).toBe(2);
    expect(out.ok && out.proposal.deadEnds).toBe(1);
    expect(out.ok && proposalTitle(out.proposal)).toBe('Heen en terug over hetzelfde pad');
  });

  it('viaAtDeadEnd: geen tak of geen punt in de buurt is -1', () => {
    const p: RouteProposal = { style: 'adventure', source: 'brouter', points: walk(START, at(0, 1000), at(90, 1000), START), distanceM: 3400, ascentM: 0, repeatedShare: 0 };
    expect(viaAtDeadEnd(p, [at(0, 1000), at(90, 1000)])).toBe(-1);
  });
});

describe('randgevallen van de hele zoektocht', () => {
  const straight: RouteFn = async (wps) => ({ ok: true, line: { source: 'brouter', points: walk(...wps) } });

  it('geen helling in de buurt: Simpel vindt niets, Avontuurlijk is één lus zonder tak', async () => {
    const plans = await proposeRoutes({ start: START, target: { distanceKm: 6, ascentM: 150 } }, straight);
    expect(plans.simple.ok).toBe(false);
    expect(plans.adventure.ok && proposalTitle(plans.adventure.proposal)).toBe('Eén lus');
  });

  it('vlak: heen en terug zonder takken heet zo en heeft één doodlopend stuk', async () => {
    const plans = await proposeRoutes({ start: START, target: { distanceKm: 6, ascentM: 0 } }, straight);
    expect(plans.simple.ok && plans.simple.proposal.deadEnds).toBe(1);
    expect(plans.simple.ok && proposalTitle(plans.simple.proposal)).toBe('Heen en terug over hetzelfde pad');
  });

  it('offline: geen lus, geen telling, geen fout', async () => {
    const offline: RouteFn = async () => ({ ok: false, reason: 'offline' });
    const plans = await proposeRoutes({ start: START, target: { distanceKm: 6, ascentM: 0 } }, offline);
    expect(plans.simple).toEqual({ ok: false, reason: 'offline' });
    expect(plans.adventure).toEqual({ ok: false, reason: 'offline' });
  });
});

describe('heuvelintervallen: de helling op de kaart', () => {
  it('climbStretch is het stuk van de voet tot de top, de regel zegt hoe vaak', () => {
    const foot = { ...at(0, 900), ele: 20 };
    const top = { ...at(0, 1400), ele: 70 };
    const made = composeSimple({ source: 'brouter', points: walk({ ...START, ele: 20 }, foot, top) }, { distanceKm: 8, ascentM: 300 }) as RouteProposal;
    const stretch = climbStretch(made) as RoutePoint[];
    expect(lineLength(stretch)).toBeCloseTo(made.climbLengthM as number, -1);
    expect(metersBetween(stretch[0], foot)).toBeLessThan(30);
    expect(metersBetween(stretch[stretch.length - 1], top)).toBeLessThan(30);
    expect(climbStretch(made)).toBe(stretch); // dezelfde lijst: de kaart werkt niet bij elke render bij
    expect(proposalNotes(made, { distanceKm: 8, ascentM: 300 })[0]).toBe(`Gemarkeerd op de kaart: hier ${made.repeats} keer op, 50 m omhoog over 500 m.`);
  });

  it('bij één keer op en af geen markering en geen regel erover; met een stuk gekozen in Per stuk ook niet', () => {
    const foot = { ...at(0, 900), ele: 20 };
    const top = { ...at(0, 1400), ele: 70 };
    const made = composeSimple({ source: 'brouter', points: walk({ ...START, ele: 20 }, foot, top) }, { distanceKm: 8, ascentM: 300 }) as RouteProposal;
    const once = { ...made, repeats: 1 };
    expect(climbStretch(once)).toBeUndefined();
    expect(proposalNotes(once, { distanceKm: 8, ascentM: 300 })[0]).toBe('De helling: 50 m omhoog over 500 m.');
    expect(proposalNotes(made, { distanceKm: 8, ascentM: 300 }, false)[0]).toBe(`De helling: hier ${made.repeats} keer op, 50 m omhoog over 500 m.`);
  });

  it('heen en terug zonder helling en Avontuurlijk hebben geen gemarkeerd stuk', () => {
    const p: RouteProposal = { style: 'adventure', source: 'brouter', points: walk(START, at(0, 1000), START), distanceM: 2000, ascentM: 0, repeatedShare: 1 };
    expect(climbStretch(p)).toBeUndefined();
    expect(climbStretch({ ...p, style: 'simple' })).toBeUndefined();
  });
});

describe('grote wegen', () => {
  it('BRouter: de wegsoort per stuk wordt een markering per punt; een onbekend eindpunt markeert niets', () => {
    const coords = [[5.9, 52.1, 10], [5.901, 52.1, 10], [5.902, 52.1, 10], [5.903, 52.1, 10]];
    const head = ['Longitude', 'Latitude', 'Elevation', 'Distance', 'CostPerKm', 'ElevCost', 'TurnCost', 'NodeCost', 'InitialCost', 'WayTags', 'NodeTags', 'Time', 'Energy'];
    const row = (lon: number, tags: string, dist = 68) => [String(Math.round(lon * 1e6)), '52100000', '10', String(dist), '0', '0', '0', '0', '0', tags, '', '0', '0'];
    const raw = (rows: unknown[][]) => ({ features: [{ geometry: { coordinates: coords }, properties: { messages: [head, ...rows] } }] });
    const points = mapBrouter(raw([row(5.901, 'highway=track'), row(5.903, 'highway=primary surface=asphalt', 137)])) as RoutePoint[];
    expect(points.map((p) => !!p.bigRoad)).toEqual([false, false, true, true]);
    expect(bigRoadMeters(points)).toBeCloseTo(metersBetween(points[2], points[3]), 3);
    // Omgekeerd (de terugweg) telt hetzelfde.
    expect(bigRoadMeters([...points].reverse())).toBeCloseTo(bigRoadMeters(points), 6);
    const lost = mapBrouter(raw([row(5.9055, 'highway=primary')])) as RoutePoint[];
    expect(lost.some((p) => p.bigRoad)).toBe(false);
    expect(mapBrouter(raw([row(5.903, 'highway=primary_linkage')]))?.some((p) => p.bigRoad)).toBe(false);
    // Een provinciale weg (secondary) telt ook als grote weg.
    expect(mapBrouter(raw([row(5.903, 'highway=secondary', 205)]))?.filter((p) => p.bigRoad)).toHaveLength(3);
    // Een rij te veel na het laatste punt: geen fout, geen markering.
    const extra = mapBrouter(raw([row(5.903, 'highway=primary', 205), row(5.904, 'highway=primary')])) as RoutePoint[];
    expect(extra).toHaveLength(4);
    expect(extra.some((p) => p.bigRoad)).toBe(false);
  });

  it('een lijn die dezelfde plek twee keer raakt: het eind van de rij is waar ook de lengte klopt', () => {
    const coords = [[5.9, 52.1], [5.901, 52.1], [5.901, 52.101], [5.9, 52.101], [5.9, 52.1], [5.899, 52.1]];
    const head = ['Longitude', 'Latitude', 'Distance', 'WayTags'];
    const points = mapBrouter({ features: [{ geometry: { coordinates: coords }, properties: { messages: [head, ['5900000', '52100000', '359', 'highway=track'], ['5899000', '52100000', '68', 'highway=primary']] } }] }) as RoutePoint[];
    expect(points.map((p) => !!p.bigRoad)).toEqual([false, false, false, false, false, true]);
  });

  it('de regel en de amber-herkenning delen hun begin; hoogstens twee regels in amber per rij', () => {
    const p: RouteProposal = { style: 'adventure', source: 'brouter', points: [START], distanceM: 4000, ascentM: 0, repeatedShare: 0, bigRoadM: 800, notice: 'Deze lus stijgt 0 m; de training vraagt 100 m.' };
    const target = { distanceKm: 6, ascentM: 100 };
    const { warn, info } = loopLines(p, target, proposalNotes(p, target));
    expect(warn).toHaveLength(MAX_WARN_LINES);
    expect(info.some((n) => n.startsWith(BIG_ROAD_LEAD))).toBe(true);
    expect(loopLines({ ...p, notice: undefined, distanceM: 6000 }, target, proposalNotes({ ...p, notice: undefined, distanceM: 6000 }, target)).warn).toEqual(['Langs een grote weg: 0,8 km.']);
  });

  it('instelling Grote wegen mijden: aan vraagt de rustige weg, uit niet', () => {
    expect(brouterUrl([START, at(0, 1000)])).toContain('profile:consider_noise=1');
    expect(brouterUrl([START, at(0, 1000)], undefined, [], false)).not.toContain('consider_noise');
    expect(valhallaUrl([START, at(0, 1000)])).toContain('walkway_factor');
    expect(valhallaUrl([START, at(0, 1000)], [], false)).not.toContain('costing_options');
  });

  it('een regel vanaf 300 m, daaronder niets', () => {
    const p: RouteProposal = { style: 'adventure', source: 'brouter', points: [START], distanceM: 6000, ascentM: 0, repeatedShare: 0 };
    const target = { distanceKm: 6, ascentM: 0 };
    expect(proposalNotes({ ...p, bigRoadM: BIG_ROAD_NOTE_M - 1 }, target)).toEqual([]);
    expect(proposalNotes({ ...p, bigRoadM: 800 }, target)).toEqual(['Langs een grote weg: 0,8 km.']);
  });
});

describe('de ingeklapte rij van de andere lus', () => {
  const p: RouteProposal = { style: 'adventure', source: 'brouter', points: [START], distanceM: 6000, ascentM: 0, repeatedShare: 0 };
  it('zegt het als hij veel korter is dan de training', () => {
    expect(otherLoopWarn(p, { distanceKm: 10, ascentM: 0 })).toBe('6 km, korter dan de 10 km van je training.');
    expect(otherLoopWarn(p, { distanceKm: 6.5, ascentM: 0 })).toBeUndefined();
  });
});
