// Wandeling plannen, route klopt niet met de vraag (I-75, 16 november): een tak in de aanloop telde als
// doodlopend stuk, een lus met 160 hoogtemeters tegen de 50 van de wandeling kreeg geen amber regel, en een
// voorstel van de helft van de afstand stond naast een dat past. Alles is nagemaakt: een plek die nergens is
// en lijnen die niet bestaan (besluit 2026-11-16-wandelroute-vraag.md).
import { describe, expect, it } from 'vitest';
import type { NearbyTerrain, TerrainFeature } from '../models/nearbyTerrain';
import type { RouteFn, RoutePoint, RouteProposal, RouteTarget } from '../models/route';
import { approachLength, deadEnds, lineLength, loopDeadEnds, metersBetween, offsetPoint } from './routeGeometry';
import { ASCENT_OVER_FACTOR, FAR_OFF, FLAT_ASCENT_NOTE_M, SPUR_FREE_MARGIN, ascentOverLine, deadEndLine, failureLine, proposalNotes, proposalTitle, proposeAdventure, proposeRoutes } from './routePlanner';
import { loopLines, loopTitle, otherLoopLine, otherLoopWarn } from './routeSheet';
import { walkPlanTarget } from './walkPlan';

const START: RoutePoint = { lat: 52.1, lon: 5.9 };
function walk(...corners: RoutePoint[]): RoutePoint[] {
  const out: RoutePoint[] = [corners[0]];
  for (let c = 1; c < corners.length; c++) {
    const a = corners[c - 1];
    const b = corners[c];
    const steps = Math.max(1, Math.round(metersBetween(a, b) / 25));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      out.push({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t });
    }
  }
  return out;
}
const at = (deg: number, m: number, from: RoutePoint = START): RoutePoint => offsetPoint(from, deg, m);

// Een start op een afgesloten terrein met één uitgang: 400 m naar de eerste kruising, daar een lus.
const J = at(0, 400);
const L1 = at(45, 800, J);
const L2 = at(90, 800, L1);
const L3 = at(180, 700, L2);
const loopPart = [L1, L2, L3];

describe('doodlopende stukken van een lus: de aanloop telt niet', () => {
  it('het pad uit het terrein en terug is de aanloop, geen doodlopend stuk', () => {
    const line = walk(START, J, ...loopPart, J, START);
    expect(deadEnds(line)).toHaveLength(0);
    expect(Math.abs(approachLength(line) - 400)).toBeLessThanOrEqual(15);
    expect(loopDeadEnds(line)).toHaveLength(0);
  });

  it('een tak op de eerste kruising of onderweg erheen telt niet mee, ook niet op de terugweg', () => {
    const mid = at(0, 200);
    expect(deadEnds(walk(START, J, at(270, 300, J), J, ...loopPart, J, START))).toHaveLength(1);
    expect(loopDeadEnds(walk(START, J, at(270, 300, J), J, ...loopPart, J, START))).toHaveLength(0);
    expect(loopDeadEnds(walk(START, mid, at(270, 300, mid), mid, J, ...loopPart, J, START))).toHaveLength(0);
    expect(loopDeadEnds(walk(START, J, ...loopPart, J, at(270, 300, J), J, START))).toHaveLength(0);
  });

  it('een echte tak in de lus telt wel, ook naast een tak in de aanloop', () => {
    const inLoop = walk(START, J, L1, at(270, 300, L1), L1, L2, L3, J, START);
    expect(loopDeadEnds(inLoop)).toHaveLength(1);
    const both = walk(START, J, at(270, 300, J), J, L1, at(270, 300, L1), L1, L2, L3, J, START);
    expect(deadEnds(both)).toHaveLength(2);
    expect(loopDeadEnds(both)).toHaveLength(1);
  });

  it('een lus zonder gedeelde aanloop houdt al zijn takken', () => {
    const loop = walk(START, at(0, 500), at(270, 250, at(0, 500)), at(0, 500), at(0, 1000), at(45, 1414), at(90, 1000), START);
    expect(approachLength(loop)).toBeLessThanOrEqual(25);
    expect(loopDeadEnds(loop)).toHaveLength(1);
  });

  it('de naam: geen "stuk heen en terug" voor een tak in de aanloop', async () => {
    const line = walk(START, J, at(270, 300, J), J, ...loopPart, J, START);
    const route: RouteFn = async () => ({ ok: true, line: { source: 'brouter', points: line } });
    const out = await proposeAdventure({ start: START, target: { distanceKm: 5, ascentM: 0 } }, route);
    expect(out.ok && proposalTitle(out.proposal)).toBe('Eén lus');
    expect(out.ok && out.proposal.deadEnds).toBeUndefined();
  });
});

describe('Avontuurlijk: eerst een lus zonder tak, ook als de afstand tot 15 procent afwijkt', () => {
  const feature = (deg: number, m: number): TerrainFeature => ({ kind: 'dirt_path', ...at(deg, m), distanceM: m });
  const terrain: NearbyTerrain = { source: 'osm', fetchedAt: '2026-11-01T08:00:00.000Z', place: { name: '', lat: START.lat, lon: START.lon }, radiusM: 3000, features: [0, 60, 120, 180, 240, 300].map((d) => feature(d, 900)) };
  const bearingOut = (p: RoutePoint) => {
    const dLon = (p.lon - START.lon) * Math.cos((START.lat * Math.PI) / 180);
    return ((Math.atan2(dLon, p.lat - START.lat) * 180) / Math.PI + 360) % 360;
  };
  // De lus langs de punten die de planner kiest, met of zonder tak naar binnen op de tweede hoek.
  const build = (km: number, spurM: number, wide: number) => {
    const vias = proposeVias(km);
    const corners = vias.map((p) => at(bearingOut(p), metersBetween(START, p) * wide));
    const clean = walk(START, ...corners, START);
    const inward = at(bearingOut(corners[1]) + 180, spurM, corners[1]);
    const withSpur = walk(START, corners[0], corners[1], inward, corners[1], ...corners.slice(2), START);
    return { vias, clean, withSpur };
  };
  const proposeVias = (km: number): RoutePoint[] => {
    // Dezelfde punten als de planner (adventureVias bij het eerste bereik).
    const asked: RoutePoint[] = [];
    const probe: RouteFn = async (wps) => {
      if (asked.length === 0) asked.push(...wps.slice(1, -1));
      return { ok: false, reason: 'error' };
    };
    void proposeAdventure({ start: START, target: { distanceKm: km, ascentM: 0 }, terrain }, probe);
    return asked;
  };

  it('de lus met een tak past, de schone wijkt 10 tot 15 procent af: de schone wint (vroeger de tak)', async () => {
    // Zoek een afstand waarbij de schone lus 10 tot 15 procent te kort is en die met tak past.
    let found: { km: number; clean: RoutePoint[]; withSpur: RoutePoint[]; vias: RoutePoint[] } | undefined;
    for (let km = 3; km <= 9; km += 0.25) {
      for (const spur of [100, 150, 200, 250, 300]) for (const wide of [1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3]) {
        const b = build(km, spur, wide);
        if (b.vias.length < 3) continue;
        const cl = lineLength(b.clean) / (km * 1000);
        const sp = lineLength(b.withSpur) / (km * 1000);
        if (cl >= 1 - SPUR_FREE_MARGIN && cl < 0.9 && sp >= 0.9 && sp <= 1.12 && loopDeadEnds(b.withSpur).length === 1) found = { km, ...b };
      }
    }
    expect(found).toBeDefined();
    const f = found as NonNullable<typeof found>;
    const calls: RoutePoint[][] = [];
    const spurVia = f.vias[1];
    const route: RouteFn = async (wps) => {
      calls.push(wps);
      // Zonder het punt bij de tak komt de schone lus.
      const hasSpurVia = wps.some((p) => p.lat === spurVia.lat && p.lon === spurVia.lon);
      return { ok: true, line: { source: 'brouter', points: hasSpurVia ? f.withSpur : f.clean } };
    };
    const out = await proposeAdventure({ start: START, target: { distanceKm: f.km, ascentM: 0 }, terrain }, route);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(out.ok && out.proposal.deadEnds).toBeUndefined();
    expect(out.ok && proposalTitle(out.proposal)).toBe('Eén lus');
  });

  it('lukt het niet (de schone is meer dan 15 procent af), dan blijft de lus met tak, met de amber regel', async () => {
    const line = walk(START, J, L1, at(270, 300, L1), L1, L2, L3, J, START);
    const km = lineLength(line) / 1000;
    const route: RouteFn = async () => ({ ok: true, line: { source: 'brouter', points: line } });
    const out = await proposeAdventure({ start: START, target: { distanceKm: km, ascentM: 0 }, terrain }, route);
    expect(out.ok && out.proposal.deadEnds).toBe(1);
    if (!out.ok) throw new Error('geen lus');
    const target: RouteTarget = { distanceKm: km, ascentM: 0 };
    const notes = proposalNotes(out.proposal, target);
    expect(notes).toContain('Deze lus heeft een stuk heen en terug.');
    expect(loopLines(out.proposal, target, notes).warn).toContain('Deze lus heeft een stuk heen en terug.');
    expect(otherLoopWarn(out.proposal, target)).toBe('Deze lus heeft een stuk heen en terug.');
  });

  it('de zin zegt het aantal; Simpel heeft zijn heen en terug al in de naam', () => {
    const p: RouteProposal = { style: 'adventure', source: 'brouter', points: [], distanceM: 5000, ascentM: 0, repeatedShare: 0 };
    expect(deadEndLine(p)).toBeUndefined();
    expect(deadEndLine({ ...p, deadEnds: 1 })).toBe('Deze lus heeft een stuk heen en terug.');
    expect(deadEndLine({ ...p, deadEnds: 2 })).toBe('Deze lus heeft twee stukken heen en terug.');
    expect(deadEndLine({ ...p, style: 'simple', deadEnds: 1 })).toBeUndefined();
  });
});

// Eén keer zeggen (I-81): het stuk heen en terug staat in de amberregel; titel, uitleg en andere lus herhalen het niet.
describe('een stuk heen en terug wordt één keer gezegd', () => {
  const base: RouteProposal = { style: 'adventure', source: 'brouter', points: [], distanceM: 5000, ascentM: 0, repeatedShare: 0.3 };
  const target: RouteTarget = { distanceKm: 5, ascentM: 0 };
  const twice = 'Een deel loop je twee keer.';

  it('zonder stuk (0): titel, geen amberregel, en twee keer lopen blijft', () => {
    expect(proposalTitle(base)).toBe('Eén lus');
    expect(deadEndLine(base)).toBeUndefined();
    expect(proposalNotes(base, target)).toContain(twice);
  });

  it.each([[1, 'een stuk'], [2, 'twee stukken']])('Avontuurlijk met %i: amberregel ja, titel en twee keer lopen nee', (n, words) => {
    const p = { ...base, deadEnds: n };
    const notes = proposalNotes(p, target);
    const line = `Deze lus heeft ${words} heen en terug.`;
    expect(loopLines(p, target, notes).warn).toContain(line);
    expect(notes).not.toContain(twice);
    expect(loopTitle(p, target, notes)).toBe('Lus');
    expect(loopTitle({ ...p, hills: 1 }, target, notes)).toBe('Lus langs een helling');
    expect(loopTitle({ ...p, hills: 2 }, target, notes)).toBe('Lus langs 2 hellingen');
  });

  it('zonder amberregel in beeld blijft de titel het stuk noemen', () => {
    const p = { ...base, deadEnds: 2 };
    expect(proposalTitle(p)).toBe('Lus met twee stukken heen en terug');
    expect(proposalTitle({ ...p, deadEnds: 1 })).toBe('Lus met een stuk heen en terug');
  });

  it('Simpel houdt zijn titel, zonder amberregel', () => {
    const p: RouteProposal = { ...base, style: 'simple', deadEnds: 2, repeatedShare: 1 };
    expect(loopTitle(p, target, proposalNotes(p, target))).toBe('Heen en terug over 2 takken'.replace('2', 'twee'));
    expect(deadEndLine(p)).toBeUndefined();
  });

  it('andere lus: de regel noemt de stukken niet als de amberregel ze noemt, anders wel', () => {
    const p = { ...base, deadEnds: 2 };
    expect(otherLoopWarn(p, target)).toBe('Deze lus heeft twee stukken heen en terug.');
    expect(otherLoopLine('Avontuurlijk', p, target)).toBe('Avontuurlijk, lus: 5 km · vrijwel vlak');
    // Een andere waarschuwing gaat voor (te veel hoogtemeters): dan is de amberregel niet het stuk, en de titel houdt het.
    const high = { ...p, ascentM: 400 };
    const flat: RouteTarget = { distanceKm: 5, ascentM: 0, flat: true };
    expect(otherLoopWarn(high, flat)).not.toBe('Deze lus heeft twee stukken heen en terug.');
    expect(otherLoopLine('Avontuurlijk', high, flat)).toContain('met twee stukken heen en terug');
    // Zonder stuk verandert er niets.
    expect(otherLoopLine('Avontuurlijk', base, target)).toContain('één lus');
  });
});

describe('hoogte buiten de vraag: dezelfde amber regel als bij afstand', () => {
  const walkTarget = walkPlanTarget({ km: 5, climb: 'hilly' });
  const p = (ascentM: number, distanceM = 5000): RouteProposal => ({ style: 'adventure', source: 'brouter', points: [], distanceM, ascentM, repeatedShare: 0 });

  it('de drempel ligt vast: meer dan het dubbele, bij Vlak meer dan 100 m', () => {
    expect(ASCENT_OVER_FACTOR).toBe(2);
    expect(FLAT_ASCENT_NOTE_M).toBe(100);
    expect(walkTarget.ascentM).toBe(50);
  });

  it('160 tegen 50: de zin, in amber, en ook in de ingeklapte rij', () => {
    const line = ascentOverLine(p(160), walkTarget);
    expect(line).toBe('160 hoogtemeters, meer dan de 50 van je wandeling.');
    const notes = proposalNotes(p(160), walkTarget);
    expect(loopLines(p(160), walkTarget, notes).warn).toContain(line);
    expect(otherLoopWarn(p(160), walkTarget)).toBe(line);
  });

  it('precies het dubbele en eronder: niets; een training zegt je training', () => {
    expect(ascentOverLine(p(100), walkTarget)).toBeUndefined();
    expect(ascentOverLine(p(60), walkTarget)).toBeUndefined();
    expect(ascentOverLine(p(101), walkTarget)).toBeDefined();
    expect(ascentOverLine(p(500), { distanceKm: 5, ascentM: 200 })).toBe('500 hoogtemeters, meer dan de 200 van je training.');
  });

  it('Vlak: meer dan 100 m is buiten de vraag; Geen voorkeur en een training zonder hoogtemeters niet', () => {
    const flat = walkPlanTarget({ km: 5, climb: 'flat' });
    expect(ascentOverLine(p(100), flat)).toBeUndefined();
    expect(ascentOverLine(p(120), flat)).toBe('120 hoogtemeters, terwijl je een vlakke wandeling vroeg.');
    expect(ascentOverLine(p(300), walkPlanTarget({ km: 5, climb: 'none' }))).toBeUndefined();
    expect(ascentOverLine(p(300), { distanceKm: 5, ascentM: 0 })).toBeUndefined();
  });

  it('te weinig hoogtemeters blijft bij de bestaande melding (onder driekwart)', () => {
    expect(ascentOverLine(p(10), walkTarget)).toBeUndefined();
  });
});

describe('een voorstel ver onder de afstand komt alleen als er niets beters is', () => {
  const target = { distanceKm: 5, ascentM: 0 };
  // Heen: de helft van de afstand; Simpel loopt hem terug. Een lus: een vierkant van die omtrek.
  const outOf = (km: number): RoutePoint[] => walk(START, at(0, (km * 1000) / 2));
  const squareOf = (km: number): RoutePoint[] => {
    const a = at(0, km * 250);
    const b = at(90, km * 250, a);
    return walk(START, a, b, at(90, km * 250), START);
  };
  const answer = (adventureKm: number, simpleKm: number): RouteFn => async (wps) => ({ ok: true, line: { source: 'brouter', points: wps.length > 2 ? squareOf(adventureKm) : outOf(simpleKm) } });

  it('de grens is 70 procent', () => {
    expect(FAR_OFF).toBe(0.7);
  });

  it('Avontuurlijk past, Simpel is 2,6 km: Simpel valt weg, met een eerlijke regel', async () => {
    const plans = await proposeRoutes({ start: START, target }, answer(5, 2.6));
    expect(plans.adventure.ok).toBe(true);
    expect(plans.simple.ok).toBe(false);
    if (plans.simple.ok) return;
    expect(plans.simple.farOff).toBe(true);
    expect(failureLine('simple', plans.simple, true, { plannedWalk: true })).toBe('Geen tweede voorstel dat bij de afstand van je wandeling past.');
  });

  it('is er niets anders dat past, dan blijft het korte voorstel staan (met zijn amber regel)', async () => {
    const plans = await proposeRoutes({ start: START, target }, answer(2.6, 2.6));
    expect(plans.simple.ok).toBe(true);
    expect(plans.adventure.ok).toBe(true);
  });

  it('een voorstel tussen 70 en 90 procent blijft staan naast een dat past', async () => {
    const plans = await proposeRoutes({ start: START, target }, answer(5, 4));
    expect(plans.simple.ok).toBe(true);
  });
});
