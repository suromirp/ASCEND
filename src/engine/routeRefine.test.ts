// De verfijning van Route voorstellen (docs/beslissingen/2026-11-11-route-verfijnen.md): de melding
// bij te weinig hoogtemeters, te kort telt als mislukt, het startpunt precies, hellingen zonder
// bekende hoogte en een routeplanner die halverwege wegvalt. Alles hier is nagemaakt: plekken die
// nergens zijn, heuvels die niet bestaan en een routeplanner die rekent in plaats van vraagt.

import { describe, expect, it } from 'vitest';
import type { NearbyTerrain, TerrainFeature } from '../models/nearbyTerrain';
import type { RouteAnswer, RouteFn, RoutePoint, RouteTarget } from '../models/route';
import { createGate, routeWithFallback } from '../integrations/routing';
import { SETTINGS_HELP } from '../data/settingsHelp';
import { lineLength, metersBetween, offsetPoint } from './routeGeometry';
import {
  CLOSE_ENOUGH, MAX_ROUTE_CALLS, MAX_VIAS, NO_PATH_AT_START, failureLine, terrainFound, SHORT_ASCENT, SUBSTITUTE_LINE, adventureVias, anchorLine, ascentNotice, fitsDistance, proposalFacts, proposalNotes, proposeAdventure, proposeRoutes, proposeSimple,
  searchLines, simpleCandidates, tooShort, type PlanInput, type RoutePlans,
} from './routePlanner';

const START: RoutePoint = { lat: 51.2, lon: 6.1 };

function feature(kind: TerrainFeature['kind'], deg: number, meters: number, heightM?: number): TerrainFeature {
  const p = offsetPoint(START, deg, meters);
  return { kind, lat: Math.round(p.lat * 1e4) / 1e4, lon: Math.round(p.lon * 1e4) / 1e4, distanceM: Math.round(meters), heightM };
}
const terrain = (...features: TerrainFeature[]): NearbyTerrain => ({ source: 'osm', fetchedAt: '2026-11-01T08:00:00.000Z', place: { name: '', ...START }, radiusM: 3000, features });

interface Bump {
  at: RoutePoint;
  heightM: number;
  widthM: number;
}

// Een nagemaakte routeplanner: tussen twee punten een knik opzij, zodat de weg `detour` keer zo
// lang is als hemelsbreed, een punt per 25 m. De hoogte komt uit een landschap van bulten op 10 m.
// `snapM`: het eerste en laatste punt van de lijn liggen zoveel meter naast wat gevraagd is (het
// dichtstbijzijnde pad). `fenceM`: verder dan dit van het startpunt ligt geen pad meer.
function landRoute(opts: { detour?: number; bumps?: Bump[]; snapM?: number; fenceM?: number; source?: 'brouter' | 'valhalla'; answers?: (RouteAnswer | undefined)[] } = {}): RouteFn & { calls: RoutePoint[][] } {
  const calls: RoutePoint[][] = [];
  const detour = opts.detour ?? 1.2;
  const ele = (p: RoutePoint) => 10 + (opts.bumps ?? []).reduce((sum, b) => sum + b.heightM * Math.exp(-((metersBetween(p, b.at) / b.widthM) ** 2)), 0);
  const fn = (async (asked: RoutePoint[]): Promise<RouteAnswer> => {
    calls.push(asked);
    const canned = opts.answers?.[calls.length - 1];
    if (canned) return canned;
    const fence = (p: RoutePoint): RoutePoint => {
      const far = metersBetween(asked[0], p);
      if (!opts.fenceM || far <= opts.fenceM) return p;
      const t = opts.fenceM / far;
      return { lat: asked[0].lat + (p.lat - asked[0].lat) * t, lon: asked[0].lon + (p.lon - asked[0].lon) * t };
    };
    const snap = (p: RoutePoint, i: number) => (opts.snapM && (i === 0 || (i === asked.length - 1 && metersBetween(p, asked[0]) < 1)) ? offsetPoint(p, 90, opts.snapM) : p);
    const waypoints = asked.map((p, i) => snap(fence(p), i));
    const points: RoutePoint[] = [];
    for (let w = 1; w < waypoints.length; w++) {
      const a = waypoints[w - 1];
      const b = waypoints[w];
      const len = metersBetween(a, b);
      // Het knikpunt: halverwege, loodrecht opzij, zodat a-knik-b `detour` keer de rechte lijn is.
      const side = (len / 2) * Math.sqrt(Math.max(0, detour * detour - 1));
      const mid = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
      const north = (b.lat - a.lat) * 111_320;
      const east = (b.lon - a.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
      const knee = len > 0 ? offsetPoint(mid, (Math.atan2(-north, east) * 180) / Math.PI, side) : mid;
      for (const [from, to] of [[a, knee], [knee, b]] as const) {
        const steps = Math.max(1, Math.round(metersBetween(from, to) / 25));
        for (let i = points.length === 0 ? 0 : 1; i <= steps; i++) {
          const t = i / steps;
          const p = { lat: from.lat + (to.lat - from.lat) * t, lon: from.lon + (to.lon - from.lon) * t };
          points.push({ ...p, ele: ele(p) });
        }
      }
    }
    return { ok: true, line: { source: opts.source ?? 'brouter', points } };
  }) as RouteFn & { calls: RoutePoint[][] };
  fn.calls = calls;
  return fn;
}

// Een uitkomst in één regel, zoals het paneel hem toont.
const summary = (plans: RoutePlans, target: RouteTarget) =>
  (['adventure', 'simple'] as const).map((style) => {
    const o = plans[style];
    return o.ok ? `${style}: ${proposalFacts(o.proposal)} | ${proposalNotes(o.proposal, target).join(' ')}` : `${style}: ${o.reason}`;
  });

describe('Geen hoogtemeters mogelijk', () => {
  // Een polder: alleen onverharde paden, nergens een bult.
  const polder = terrain(feature('dirt_path', 30, 900), feature('dirt_path', 140, 1400), feature('dirt_path', 260, 1100), feature('sports_ground', 80, 600));
  const target = { distanceKm: 10, ascentM: 120 };

  it('geen heuvels binnen bereik: de lus zegt het droge feit en wat hij wel heeft', async () => {
    const plans = await proposeRoutes({ start: START, target, terrain: polder }, landRoute());
    expect(plans.adventure.ok).toBe(true);
    if (!plans.adventure.ok) return;
    expect(plans.adventure.proposal.notice).toBe('Geen heuvels binnen 3 km. Deze lus stijgt 0 m; de training vraagt 120 m.');
    expect(proposalNotes(plans.adventure.proposal, target)).toContain(plans.adventure.proposal.notice);
    // Bovenaan het paneel alleen nog waar je de hoogte anders haalt, niet twee keer hetzelfde feit.
    expect(searchLines(plans, target)).toEqual([SUBSTITUTE_LINE]);
    expect(fitsDistance(plans.adventure.proposal, target)).toBe(true);
  });

  it('een lus die duidelijk minder haalt dan gevraagd krijgt de melding, een die het bijna haalt niet', () => {
    const found = { hills: 2, unknown: 0, lower: 0, tallestM: 18, radiusM: 3000 };
    expect(ascentNotice({ ascentM: 40 }, { distanceKm: 10, ascentM: 300 }, found)).toBe('De hoogste helling dichtbij ligt 18 m boven je plek. Deze lus stijgt 40 m; de training vraagt 300 m.');
    expect(ascentNotice({ ascentM: 300 * SHORT_ASCENT - 1 }, { distanceKm: 10, ascentM: 300 }, found)).toBeDefined();
    expect(ascentNotice({ ascentM: 300 * SHORT_ASCENT }, { distanceKm: 10, ascentM: 300 }, found)).toBeUndefined();
    // Zonder antwoord van de kaart geen uitspraak over de buurt, wel over de lus.
    expect(ascentNotice({ ascentM: 12 }, { distanceKm: 10, ascentM: 120 })).toBe('Deze lus stijgt 10 m; de training vraagt 120 m.');
    // Een kleiner zoekgebied staat er zoals het is.
    expect(ascentNotice({ ascentM: 12 }, { distanceKm: 10, ascentM: 120 }, { hills: 0, unknown: 0, lower: 0, radiusM: 1500 })).toMatch(/^Geen heuvels binnen 1,5 km\./);
  });

  it('een training zonder hoogtemeters krijgt nooit een melding', async () => {
    const flat = { distanceKm: 8, ascentM: 0 };
    const plans = await proposeRoutes({ start: START, target: flat, terrain: polder }, landRoute());
    for (const o of [plans.simple, plans.adventure]) {
      expect(o.ok).toBe(true);
      if (o.ok) expect(o.proposal.notice).toBeUndefined();
    }
    expect(plans.notice).toBeUndefined();
    expect(searchLines(plans, flat)).toEqual([]);
    expect(ascentNotice({ ascentM: 0 }, flat, { hills: 0, unknown: 0, lower: 0, radiusM: 3000 })).toBeUndefined();
  });
});

describe('Hellingen zonder bekende hoogte', () => {
  // Drie hellingen dichtbij waarvan de kaart de hoogte niet kent (en die vlak blijken), en één
  // verder weg met een bekende hoogte.
  const real = feature('hill', 200, 1900, 35);
  const mixed = terrain(feature('hill', 20, 700), feature('hill', 100, 800), feature('hill', 300, 750), real);
  const target = { distanceKm: 8, ascentM: 200 };
  const land = () => landRoute({ bumps: [{ at: real, heightM: 35, widthM: 350 }] });

  it('de helling met een bekende hoogte gaat voor: de eerste aanroep van Simpel gaat ernaartoe', async () => {
    expect(simpleCandidates({ start: START, target, terrain: mixed })[0]).toEqual({ lat: real.lat, lon: real.lon });
    const route = land();
    const out = await proposeSimple({ start: START, target, terrain: mixed }, route);
    expect(route.calls[0][1]).toEqual({ lat: real.lat, lon: real.lon });
    expect(out.ok && out.proposal.repeats).toBeGreaterThanOrEqual(4);
    expect(out.ok && out.proposal.notice).toBeUndefined();
  });

  it('telt in de titel en in de telling alleen hellingen met een bekende hoogte', async () => {
    const plans = await proposeRoutes({ start: START, target, terrain: mixed }, land());
    expect(plans.found).toEqual({ hills: 1, unknown: 3, lower: 0, tallestM: 35, radiusM: 3000 });
    expect(plans.adventure.ok && plans.adventure.proposal.hills).toBeLessThanOrEqual(1);
    // In de lus weegt een helling zonder hoogte minder dan een met.
    const vias = adventureVias({ start: START, target, terrain: mixed });
    expect(vias.filter((v) => v.hill).every((v) => v.value > 2)).toBe(true);
    expect(vias.filter((v) => !v.hill).every((v) => v.value <= 1.5)).toBe(true);
  });

  it('alleen hellingen zonder hoogte, en vlak: de melding zegt dat de hoogte onbekend is', async () => {
    const unknownOnly = terrain(feature('hill', 20, 700), feature('hill', 100, 800));
    const plans = await proposeRoutes({ start: START, target, terrain: unknownOnly }, landRoute());
    expect(plans.found).toEqual({ hills: 0, unknown: 2, lower: 0, radiusM: 3000 });
    expect(plans.adventure.ok && plans.adventure.proposal.notice).toBe('Geen helling met een bekende hoogte binnen 3 km. Deze lus stijgt 0 m; de training vraagt 200 m.');
    expect(plans.adventure.ok && plans.adventure.proposal.hills).toBe(0);
  });
});

describe('Te kort telt als mislukt', () => {
  const target = { distanceKm: 10, ascentM: 0 };
  // Alles ligt dicht bij het startpunt: zonder aanvullen kwam hier nooit 10 km uit.
  const close = terrain(feature('dirt_path', 40, 500), feature('dirt_path', 170, 600), feature('dirt_path', 290, 450));

  it('punten dicht bij het startpunt worden aangevuld tot de geschatte lengte past', () => {
    const vias = adventureVias({ start: START, target, terrain: close });
    expect(vias.length).toBeGreaterThan(3);
    expect(1.3 * lineLength([START, ...vias, START])).toBeGreaterThan(9000);
  });

  it('zoekt verder na een te korte lus en komt binnen tien procent uit', async () => {
    // De wegen zijn hier rechter dan de schatting: de eerste lus valt te kort uit.
    const route = landRoute({ detour: 1.05 });
    const out = await proposeAdventure({ start: START, target, terrain: close }, route);
    expect(route.calls.length).toBeGreaterThan(1);
    expect(route.calls.length).toBeLessThanOrEqual(MAX_ROUTE_CALLS);
    expect(out.ok).toBe(true);
    expect(out.ok && tooShort(out.proposal, target)).toBe(false);
    expect(out.ok && proposalNotes(out.proposal, target).some((n) => /korter dan de/.test(n))).toBe(false);
  });

  it('blijft de lus na drie pogingen te kort, dan de beste lus met een eerlijke regel', async () => {
    // Een eiland: verder dan 900 m van het startpunt ligt geen pad.
    const route = landRoute({ fenceM: 900 });
    const plans = await proposeRoutes({ start: START, target, terrain: close }, route);
    expect(route.calls.length).toBeLessThanOrEqual(2 * MAX_ROUTE_CALLS);
    for (const o of [plans.adventure, plans.simple]) {
      expect(o.ok).toBe(true);
      if (!o.ok) continue;
      expect(tooShort(o.proposal, target)).toBe(true);
      expect(proposalNotes(o.proposal, target).join(' ')).toMatch(/^\d+(,\d)? km, korter dan de 10 km van je training\./);
    }
  });

  it('een vlakke heen en terug haalt de afstand: het laatste keerpunt ligt hemelsbreed op de helft', async () => {
    const route = landRoute({ detour: 1.02 });
    const out = await proposeSimple({ start: START, target, terrain: terrain() }, route);
    expect(out.ok && Math.round(out.proposal.distanceM / 100)).toBe(100);
  });

  it('van een te korte lus en een passende wint de passende, ook als de korte verder beter scoort', async () => {
    // Eerste helling: dichtbij, hoogtemeters kloppen maar de lus is te kort. De planner zoekt door.
    const near = feature('hill', 40, 400, 40);
    const far = feature('hill', 200, 2600, 40);
    const hilly = { distanceKm: 9, ascentM: 160 };
    const route = landRoute({ bumps: [{ at: near, heightM: 40, widthM: 250 }, { at: far, heightM: 40, widthM: 250 }] });
    const out = await proposeSimple({ start: START, target: hilly, terrain: terrain(near, far) }, route);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(route.calls.length).toBe(2);
    expect(tooShort(out.proposal, hilly)).toBe(false);
  });
});

describe('Het startpunt precies', () => {
  const target = { distanceKm: 6, ascentM: 0 };

  it('de lijn begint op het dichtstbijzijnde pad; met een recht stukje begint en eindigt de lus bij het startpunt', async () => {
    // Het startpunt ligt 40 m naast een weg zonder pad: de routeplanner begint op die weg.
    const input: PlanInput = { start: START, target, terrain: terrain(), anchor: true };
    const plans = await proposeRoutes(input, landRoute({ snapM: 40 }));
    for (const o of [plans.adventure, plans.simple]) {
      expect(o.ok).toBe(true);
      if (!o.ok) continue;
      const pts = o.proposal.points;
      expect(metersBetween(pts[0], START)).toBeLessThan(0.01);
      expect(metersBetween(pts[pts.length - 1], START)).toBeLessThan(0.01);
      // Het stukje telt mee in de afstand en heeft de hoogte van het pad (geen gat in de lijn).
      expect(pts[0].ele).toBe(pts[1].ele);
      expect(o.proposal.startGapM).toBeUndefined();
    }
  });

  it('zonder Precies (een afgeronde plek) komt er geen stukje bij: dat punt is niet je deur', async () => {
    const plans = await proposeRoutes({ start: START, target, terrain: terrain() }, landRoute({ snapM: 40 }));
    expect(plans.adventure.ok && metersBetween(plans.adventure.proposal.points[0], START)).toBeGreaterThan(30);
  });

  it('een pad binnen tien meter is het startpunt: geen stukje, en een ver pad staat erbij', async () => {
    const line = [offsetPoint(START, 90, 6), offsetPoint(START, 90, 500), offsetPoint(START, 90, 6)];
    expect(anchorLine(line, START, true).points).toHaveLength(3);
    expect(anchorLine([], START, true)).toEqual({ points: [], gapM: 0 });
    const plans = await proposeRoutes({ start: START, target, terrain: terrain(), anchor: true }, landRoute({ snapM: 180 }));
    expect(plans.adventure.ok && plans.adventure.proposal.startGapM).toBeCloseTo(180, 0);
    expect(plans.adventure.ok && proposalNotes(plans.adventure.proposal, target)).toContain('Het dichtstbijzijnde pad ligt 180 m van je startpunt; dat stuk is een rechte lijn.');
  });

  it('ligt er bij het startpunt geen pad, dan één aanroep en één duidelijke regel', async () => {
    const route = landRoute({ answers: [{ ok: false, reason: 'unmapped', waypoint: 0 }] });
    const plans = await proposeRoutes({ start: START, target, terrain: terrain(feature('dirt_path', 40, 900)), anchor: true }, route);
    expect(route.calls).toHaveLength(1);
    expect(plans.adventure).toEqual({ ok: false, reason: 'unmapped', at: 'start' });
    expect(plans.simple).toEqual({ ok: false, reason: 'unmapped', at: 'start' });
    expect(plans.notice).toBe(NO_PATH_AT_START);
    expect(searchLines(plans, target)).toEqual([NO_PATH_AT_START]);
    // Ook als de bron het eindpunt noemt (hetzelfde startpunt).
    const last = landRoute({ answers: [{ ok: false, reason: 'unmapped', waypoint: 4 }] });
    const again = await proposeAdventure({ start: START, target, terrain: terrain() }, last);
    expect(last.calls[0]).toHaveLength(5);
    expect(again).toEqual({ ok: false, reason: 'unmapped', at: 'start' });
  });
});

describe('De routeplanner valt halverwege weg', () => {
  const target = { distanceKm: 8, ascentM: 0 };
  const noGap = () => createGate(0);

  it('de reservebron neemt het over en de uitkomst is een gewone lus', async () => {
    // De eerste bron antwoordt één keer en daarna niet meer.
    const first = landRoute({ detour: 1.05, answers: [undefined, { ok: false, reason: 'error' }, { ok: false, reason: 'error' }] });
    const second = landRoute({ detour: 1.3, source: 'valhalla' });
    const plans = await proposeRoutes({ start: START, target, terrain: terrain() }, routeWithFallback([first, second], noGap()));
    expect(first.calls).toHaveLength(2);
    expect(second.calls.length).toBeGreaterThanOrEqual(1);
    expect(plans.adventure.ok && plans.simple.ok).toBe(true);
    expect(plans.simple.ok && plans.simple.proposal.source).toBe('valhalla');
    expect(plans.notice).toBeUndefined();
  });

  it('vallen beide weg na de eerste lus, dan blijft die lus staan en zegt de andere dat de planner niet antwoordde', async () => {
    const fail: RouteAnswer = { ok: false, reason: 'error' };
    const only = landRoute({ detour: 1.25, answers: [undefined, fail, fail, fail, fail, fail] });
    const plans = await proposeRoutes({ start: START, target, terrain: terrain() }, routeWithFallback([only], noGap()));
    expect(plans.adventure.ok).toBe(true);
    expect(plans.simple).toEqual({ ok: false, reason: 'error' });
  });
});

// Na de review van 11 november: een test per punt.
describe('Na de review', () => {
  const ringOf = (n: number, meters: number, kind: TerrainFeature['kind'] = 'dirt_path', heightM?: number) => Array.from({ length: n }, (_, i) => feature(kind, (360 / n) * i + 7, meters, heightM));

  it('een volle lijst dichtbije punten (acht, negen, twaalf) maakt plek voor aanvulpunten en haalt de afstand', async () => {
    for (const [n, meters, km] of [[8, 400, 10], [9, 500, 12], [12, 450, 10]] as const) {
      const input: PlanInput = { start: START, target: { distanceKm: km, ascentM: 0 }, terrain: terrain(...ringOf(n, meters)) };
      const vias = adventureVias(input);
      expect(vias.length).toBeLessThanOrEqual(MAX_VIAS);
      expect(1.3 * lineLength([START, ...vias, START])).toBeGreaterThan(km * 1000 * 0.9);
      const route = landRoute({ detour: 1.3 });
      const out = await proposeAdventure(input, route);
      expect(out.ok, `${n} punten`).toBe(true);
      expect(out.ok && tooShort(out.proposal, input.target), `${n} punten`).toBe(false);
      expect(route.calls.length).toBeLessThanOrEqual(MAX_ROUTE_CALLS);
    }
  });

  it('bij een volle lijst blijven de hellingen en vallen de paden: de laagste waarde maakt plek', () => {
    const hills = [feature('hill', 30, 420, 25), feature('hill', 150, 430, 30), feature('hill', 270, 410, 20)];
    const vias = adventureVias({ start: START, target: { distanceKm: 10, ascentM: 100 }, terrain: terrain(...hills, ...ringOf(8, 600)) });
    expect(vias.filter((v) => v.hill)).toHaveLength(3);
    expect(vias.length).toBeLessThanOrEqual(MAX_VIAS);
  });

  it('het startpunt op een top: de hellingen liggen lager, dus niet "geen heuvels"', async () => {
    const below = terrain(feature('hill', 40, 900, -35), feature('hill', 200, 1400, -60), feature('hill', 300, 700, 6));
    expect(terrainFound(below)).toEqual({ hills: 0, unknown: 0, lower: 3, radiusM: 3000 });
    const target = { distanceKm: 10, ascentM: 300 };
    // De lus daalt en klimt terug: 150 m stijgen, de helft van wat de training vraagt.
    const notice = ascentNotice({ ascentM: 150 }, target, terrainFound(below));
    expect(notice).toBe('Geen helling dichtbij die 10 m of meer boven je plek ligt. Deze lus stijgt 150 m; de training vraagt 300 m.');
    expect(notice).not.toMatch(/Geen heuvels/);
    const plans = await proposeRoutes({ start: START, target, terrain: below }, landRoute());
    expect(plans.adventure.ok && plans.adventure.proposal.notice).toMatch(/^Geen helling dichtbij die 10 m of meer boven je plek ligt\./);
    // Ook de regel bovenaan zegt het zo, als geen lus een melding draagt.
    const bare: RoutePlans = { simple: { ok: false, reason: 'nothing' }, adventure: { ok: false, reason: 'nothing' }, found: terrainFound(below) };
    expect(searchLines(bare, target)[0]).toBe('Geen helling dichtbij die 10 m of meer boven je plek ligt.');
  });

  it('"de hoogste helling" zegt dichtbij, niet binnen 3 km: alleen de dichtstbijzijnde heuvels hebben een hoogte', () => {
    const notice = ascentNotice({ ascentM: 69 }, { distanceKm: 10, ascentM: 300 }, { hills: 12, unknown: 0, lower: 0, tallestM: 45, radiusM: 3000 });
    expect(notice).toBe('De hoogste helling dichtbij ligt 45 m boven je plek. Deze lus stijgt 70 m; de training vraagt 300 m.');
    expect(notice).not.toMatch(/binnen/);
  });

  it('de melding rondt op tien, zoals de feiten van de lus', () => {
    const p = { style: 'adventure' as const, source: 'brouter' as const, points: [], distanceM: 10000, ascentM: 69, repeatedShare: 0 };
    expect(proposalFacts(p)).toBe('10 km · 70 hoogtemeters');
    expect(ascentNotice(p, { distanceKm: 10, ascentM: 295 })).toBe('Deze lus stijgt 70 m; de training vraagt 300 m.');
  });

  it('wat de deur uit gaat staat in de uitleg: bij Precies ook Open-Meteo voor de hoogte', () => {
    for (const key of ['routeVoorstel', 'routeStartpunt']) {
      const text = JSON.stringify(SETTINGS_HELP[key]);
      expect(text, key).toContain('Open-Meteo');
      expect(text, key).toContain('OpenStreetMap');
    }
  });

  it('zonder pad bij het startpunt zeggen de blokken niets over hellingen', () => {
    const atStart = { ok: false as const, reason: 'unmapped' as const, at: 'start' as const };
    expect(failureLine('simple', atStart, false)).toBe('Geen lus zonder pad bij je startpunt.');
    expect(failureLine('adventure', atStart, true)).toBe('Geen lus zonder pad bij je startpunt.');
    // De andere zinnen blijven zoals ze waren.
    expect(failureLine('simple', { ok: false, reason: 'nothing' }, false)).toBe('Geen helling gevonden die bij je training past.');
    expect(failureLine('simple', { ok: false, reason: 'nothing' }, true)).toBe('Geen pad gevonden vanaf je plek.');
    expect(failureLine('adventure', { ok: false, reason: 'unmapped' }, false)).toBe('Geen lus gevonden vanaf je plek.');
    expect(failureLine('adventure', { ok: false, reason: 'timeout' }, false)).toBe('De routeplanner antwoordde niet.');
  });

  it('een lus die niet past omdat hij te lang is zegt dat ook: dezelfde grens als de planner', () => {
    const loop = (distanceM: number) => ({ style: 'adventure' as const, source: 'brouter' as const, points: [], distanceM, ascentM: 0, repeatedShare: 0 });
    const target = { distanceKm: 10, ascentM: 0 };
    expect(fitsDistance(loop(11300), target)).toBe(false);
    expect(proposalNotes(loop(11300), target)).toEqual(['Langer dan de 10 km van je training.']);
    expect(proposalNotes(loop(10000 * (1 + CLOSE_ENOUGH)), target)).toEqual([]);
  });
});

describe('Deterministisch', () => {
  it('zelfde invoer en zelfde antwoorden geven dezelfde lussen, punt voor punt', async () => {
    const hill = feature('hill', 60, 1500, 30);
    const input: PlanInput = { start: START, target: { distanceKm: 9, ascentM: 150 }, terrain: terrain(hill, feature('hill', 250, 900), feature('dirt_path', 150, 1200)), anchor: true };
    const land = () => landRoute({ detour: 1.1, snapM: 25, bumps: [{ at: hill, heightM: 30, widthM: 300 }] });
    const [a, b] = [await proposeRoutes(input, land()), await proposeRoutes(input, land())];
    expect(a).toEqual(b);
    // De volgorde van de heuvels op de kaart maakt niet uit.
    const shuffled = { ...input, terrain: { ...input.terrain!, features: [...input.terrain!.features].reverse() } };
    expect(await proposeRoutes(shuffled, land())).toEqual(a);
  });
});

// De voorbeelden uit het besluit: per nagemaakte plek de afstand, de hoogtemeters en de melding.
describe('Voorbeelden per nagemaakte plek', () => {
  const hillA = feature('hill', 50, 1300, 45);
  const hillB = feature('hill', 210, 2100, 30);
  const cases: { name: string; input: PlanInput; route: () => RouteFn }[] = [
    { name: 'polder, 10 km en 120 m', input: { start: START, target: { distanceKm: 10, ascentM: 120 }, terrain: terrain(feature('dirt_path', 30, 900), feature('dirt_path', 140, 1400), feature('dirt_path', 260, 1100)) }, route: () => landRoute() },
    { name: 'twee heuvels, 10 km en 300 m', input: { start: START, target: { distanceKm: 10, ascentM: 300 }, terrain: terrain(hillA, hillB, feature('dirt_path', 130, 1500)), anchor: true }, route: () => landRoute({ snapM: 30, bumps: [{ at: hillA, heightM: 45, widthM: 350 }, { at: hillB, heightM: 30, widthM: 300 }] }) },
    { name: 'hellingen zonder hoogte, 8 km en 200 m', input: { start: START, target: { distanceKm: 8, ascentM: 200 }, terrain: terrain(feature('hill', 20, 700), feature('hill', 100, 800), feature('hill', 300, 750)) }, route: () => landRoute() },
    { name: 'vlakke duurloop, 12 km', input: { start: START, target: { distanceKm: 12, ascentM: 0 }, terrain: terrain(feature('dirt_path', 80, 2500), feature('dirt_path', 200, 1800)), anchor: true }, route: () => landRoute({ detour: 1.1, snapM: 15 }) },
    { name: 'eiland van 900 m, 10 km', input: { start: START, target: { distanceKm: 10, ascentM: 0 }, terrain: terrain(feature('dirt_path', 40, 500)) }, route: () => landRoute({ fenceM: 900 }) },
  ];

  it('elke plek geeft twee uitkomsten zonder gedachtestreepje, en de afstand past of het staat erbij', async () => {
    for (const c of cases) {
      const plans = await proposeRoutes(c.input, c.route());
      const lines = summary(plans, c.input.target);
      expect(lines.join(' ')).not.toMatch(/[\u2013\u2014]/);
      for (const o of [plans.adventure, plans.simple]) {
        if (!o.ok) continue;
        const short = proposalNotes(o.proposal, c.input.target).some((n) => /korter dan de/.test(n));
        expect(short).toBe(tooShort(o.proposal, c.input.target));
      }
    }
  });
});
