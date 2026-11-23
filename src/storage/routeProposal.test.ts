import { describe, expect, it, vi } from 'vitest';
import type { RouteFn, RoutePoint, RouteProposal } from '../models/route';
import { cleanSettings } from './backupClean';
import { findOtherLoop, findRoutes, searchBudget, PROPOSAL_LIMIT_MS } from './routeProposal';
import { createGate, routeWithFallback } from '../integrations/routing';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { routeTarget } from '../engine/routeTarget';
import { searchTarget } from '../engine/routeAdjust';
import { MAX_ROUTE_CALLS } from '../engine/routePlanner';
import type { NearbyTerrain } from '../models/nearbyTerrain';
import { saveRouteGpx } from './routeFile';
import { NameTakenError } from '../engine/autoBackup';
import type { AppBackupFolder } from '../integrations/backupFolder';

// Nagemaakte plek, geen echte.
const place = { lat: 52.123456, lon: 5.654321 };
const target = { distanceKm: 6, ascentM: 0 };

const straight: RouteFn = async (waypoints) => ({ ok: true, line: { source: 'brouter', points: waypoints.flatMap((w, i) => (i === 0 ? [w] : [{ lat: (w.lat + waypoints[i - 1].lat) / 2, lon: (w.lon + waypoints[i - 1].lon) / 2 }, w])) } });

describe('findRoutes', () => {
  it('Waar je nu bent: de stappen in volgorde, en de heuvels om het punt op drie decimalen', async () => {
    const here = { lat: 52.12789, lon: 5.65123 };
    const steps: string[] = [];
    const terrain = vi.fn(async () => undefined);
    const found = await findRoutes(place, target, { route: straight, terrain, offline: () => false, onStep: (s) => steps.push(s), terrainAt: { lat: 52.128, lon: 5.651 } }, here);
    expect(found.kind).toBe('plans');
    expect(steps).toEqual(['terrain', 'routes']);
    expect(terrain).toHaveBeenCalledWith({ name: '', lat: 52.128, lon: 5.651 }, true);
  });

  it('zonder netwerk: geen stap, meteen de regel', async () => {
    const onStep = vi.fn();
    expect(await findRoutes(place, target, { route: straight, terrain: async () => undefined, offline: () => true, onStep })).toEqual({ kind: 'offline' });
    expect(onStep).not.toHaveBeenCalled();
  });

  it('het paneel sluiten tijdens het zoeken: geen volgende stap en geen aanroep meer', async () => {
    const stop = new AbortController();
    const route = vi.fn(straight);
    const steps: string[] = [];
    const terrain = async () => { stop.abort(); return undefined; };
    await findRoutes(place, target, { route, terrain, offline: () => false, signal: stop.signal, onStep: (s) => steps.push(s) });
    expect(steps).toEqual(['terrain']);
    expect(route).not.toHaveBeenCalled();
  });

  it('zonder netwerk: een nette stilte, zonder een enkele aanroep', async () => {
    const route = vi.fn(straight);
    const terrain = vi.fn(async () => undefined);
    expect(await findRoutes(place, target, { route, terrain, offline: () => true })).toEqual({ kind: 'offline' });
    expect(route).not.toHaveBeenCalled();
    expect(terrain).not.toHaveBeenCalled();
  });

  it('alleen de afgeronde plek gaat naar de routeplanner en naar de kaart', async () => {
    const seen: RoutePoint[] = [];
    const route: RouteFn = async (w) => { seen.push(...w); return straight(w); };
    const terrain = vi.fn(async () => undefined);
    const found = await findRoutes(place, target, { route, terrain, offline: () => false });
    expect(found.kind).toBe('plans');
    expect(terrain).toHaveBeenCalledWith({ name: '', lat: 52.12, lon: 5.65 }, false);
    expect(JSON.stringify(seen)).not.toContain('52.123456');
    expect(JSON.stringify(seen)).not.toContain('5.654321');
    expect(seen[0]).toEqual({ lat: 52.12, lon: 5.65 });
  });

  it('met Precies gaat het startpunt precies naar de routeplanner, en de kaart zoekt om dat punt', async () => {
    const exact = { lat: 52.12789, lon: 5.65123 };
    const seen: RoutePoint[] = [];
    const route: RouteFn = async (w) => { seen.push(...w); return straight(w); };
    const terrain = vi.fn(async () => undefined);
    const found = await findRoutes({ lat: 50.5, lon: 4.5 }, target, { route, terrain, offline: () => false }, exact);
    expect(found.kind).toBe('plans');
    expect(seen[0]).toEqual(exact);
    expect(terrain).toHaveBeenCalledWith({ name: '', ...exact }, true);
    expect(terrain).toHaveBeenCalledTimes(1);
  });

  it('zonder Precies blijft het startpunt afgerond, ook als er een ander punt is', async () => {
    const seen: RoutePoint[] = [];
    const route: RouteFn = async (w) => { seen.push(...w); return straight(w); };
    await findRoutes(place, target, { route, terrain: async () => undefined, offline: () => false });
    expect(seen[0]).toEqual({ lat: 52.12, lon: 5.65 });
  });

  it('zonder heuvels en paden zoekt hij toch, en een fout bij de kaart is geen fout van de route', async () => {
    const found = await findRoutes(place, target, { route: straight, terrain: async () => { throw new Error('kaart stuk'); }, offline: () => false });
    expect(found.kind === 'plans' && found.plans.adventure.ok).toBe(true);
  });

  it('heeft een grens in tijd', async () => {
    const never: RouteFn = () => new Promise(() => undefined);
    expect(await findRoutes(place, target, { route: never, terrain: async () => undefined, offline: () => false, limitMs: 30 })).toEqual({ kind: 'timeout' });
  });

  it('na de tijdgrens of na sluiten gaat er geen aanroep meer de deur uit', async () => {
    let calls = 0;
    let release: () => void = () => undefined;
    const slow: RouteFn = async () => {
      calls++;
      await new Promise<void>((r) => { release = r; });
      return { ok: false, reason: 'error' };
    };
    expect(await findRoutes(place, target, { route: slow, terrain: async () => undefined, offline: () => false, limitMs: 20 })).toEqual({ kind: 'timeout' });
    release();
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toBe(1);

    const stop = new AbortController();
    stop.abort();
    const route = vi.fn(straight);
    await findRoutes(place, target, { route, terrain: async () => undefined, offline: () => false, signal: stop.signal });
    expect(route).not.toHaveBeenCalled();
  });

  it('geeft door wat er op de kaart lag, zonder een aanroep extra', async () => {
    const hills: NearbyTerrain = { source: 'osm', fetchedAt: '2026-11-01T08:00:00.000Z', place: { name: '', lat: 52.12, lon: 5.65 }, radiusM: 3000, features: [
      { kind: 'hill', lat: 52.13, lon: 5.66, distanceM: 1300, heightM: 24 },
      { kind: 'hill', lat: 52.11, lon: 5.64, distanceM: 1300, heightM: 6 },
    ] };
    const route = vi.fn(straight);
    const terrain = vi.fn(async () => hills);
    const found = await findRoutes(place, { distanceKm: 10.5, ascentM: 300 }, { route, terrain, offline: () => false });
    expect(found.kind === 'plans' && found.plans.found).toEqual({ hills: 1, unknown: 0, lower: 1, tallestM: 24, radiusM: 3000 });
    expect(terrain).toHaveBeenCalledTimes(1);
    expect(route.mock.calls.length).toBeLessThanOrEqual(2 * MAX_ROUTE_CALLS);
    // Zonder netwerk of na de grens: geen plannen, dus ook geen telling.
    expect(await findRoutes(place, target, { route, terrain, offline: () => true })).toEqual({ kind: 'offline' });
    const never: RouteFn = () => new Promise(() => undefined);
    expect(await findRoutes(place, target, { route: never, terrain, offline: () => false, limitMs: 30 })).toEqual({ kind: 'timeout' });
  });

  it('de grens verdeeld: heuvels en paden hoogstens 10 s, de routeplanner tot een seconde voor de grens', () => {
    expect(searchBudget(PROPOSAL_LIMIT_MS)).toEqual({ terrainMs: 10_000, cacheMs: 2_000, routesUntilMs: 29_000 });
  });

  it('zwak bereik: een trage kaart houdt de routeplanner niet op, en wat er bewaard lag telt', async () => {
    const hills: NearbyTerrain = { source: 'osm', fetchedAt: '2026-11-01T08:00:00.000Z', place: { name: '', lat: 52.12, lon: 5.65 }, radiusM: 3000, features: [{ kind: 'hill', lat: 52.13, lon: 5.66, distanceM: 1300, heightM: 24 }] };
    const steps: string[] = [];
    const slowMap = vi.fn(() => new Promise<NearbyTerrain | undefined>(() => undefined));
    const found = await findRoutes(place, { distanceKm: 10.5, ascentM: 300 }, { route: straight, terrain: slowMap, cachedTerrain: async () => hills, offline: () => false, limitMs: 300, onStep: (s) => steps.push(s) });
    expect(steps).toEqual(['terrain', 'routes']);
    expect(found.kind === 'plans' && found.plans.found?.hills).toBe(1);
  });

  it('zwak bereik: is de tijd op, dan blijft de lus die er al was, in plaats van niets', async () => {
    let calls = 0;
    // De eerste aanvraag antwoordt meteen, daarna hangt elke aanvraag.
    const route: RouteFn = (w, o) => (calls++ === 0 ? straight(w, o) : new Promise(() => undefined));
    const found = await findRoutes(place, target, { route, terrain: async () => undefined, offline: () => false, limitMs: 1000 });
    expect(found.kind).toBe('plans');
    if (found.kind !== 'plans') return;
    expect(found.plans.adventure.ok).toBe(true);
    expect(found.plans.simple.ok ? 'ok' : found.plans.simple.reason).toBe('timeout');
  });

  it('na de grens vraagt de poort de tweede bron niet meer, en een fout van een bron is geen tijdgrens', async () => {
    const second = vi.fn(straight);
    const hanging: RouteFn = () => new Promise(() => undefined);
    let stop = false;
    const route = routeWithFallback([hanging, second], createGate(0), () => stop);
    const found = await findRoutes(place, target, { route: (w, o) => route(w, o), terrain: async () => undefined, offline: () => false, limitMs: 300 });
    stop = true;
    expect(found).toEqual({ kind: 'timeout' });
    expect(second).not.toHaveBeenCalled();

    const broken: RouteFn = async () => { throw new Error('stuk'); };
    const failed = await findRoutes(place, target, { route: broken, terrain: async () => undefined, offline: () => false });
    expect(failed.kind === 'plans' && !failed.plans.adventure.ok && failed.plans.adventure.reason).toBe('error');
  });

  it('valt het netwerk halverwege weg, dan is dat de uitkomst', async () => {
    const gone: RouteFn = async () => ({ ok: false, reason: 'offline' });
    expect(await findRoutes(place, target, { route: gone, terrain: async () => undefined, offline: () => false })).toEqual({ kind: 'offline' });
  });
});

describe('het GPX-bestand in de map van de app', () => {
  const folder = (over: Partial<AppBackupFolder>): AppBackupFolder => ({
    platform: 'app', access: async () => 'ready', requestAccess: async () => true, where: async () => ({ kind: 'folder', label: 'x' }),
    exists: async () => false, write: async () => undefined, verify: async () => true, remove: async () => undefined, installId: async () => 'i', ...over,
  } as AppBackupFolder);

  it('schrijft onder een vrije naam en vervangt nooit een bestaand bestand', async () => {
    const write = vi.fn(async (name: string) => { if (name.endsWith('-2.gpx')) throw new NameTakenError(name); });
    const out = await saveRouteGpx('<gpx/>', 'simple', '2026-11-09', folder({ exists: async (n) => n === 'ascend-route-simpel-2026-11-09.gpx', write }));
    expect(out).toMatchObject({ ok: true, where: 'folder', name: 'ascend-route-simpel-2026-11-09-3.gpx' });
    expect(write.mock.calls.every((c) => (c as unknown[])[3] && ((c as unknown[])[3] as { neverReplace: boolean }).neverReplace)).toBe(true);
  });

  it('zonder toegang of bij een schrijffout: mislukt, zonder te gooien', async () => {
    expect(await saveRouteGpx('<gpx/>', 'simple', '2026-11-09', folder({ access: async () => 'denied', requestAccess: async () => false }))).toEqual({ ok: false });
    expect(await saveRouteGpx('<gpx/>', 'simple', '2026-11-09', folder({ write: async () => { throw new Error('vol'); } }))).toEqual({ ok: false });
  });
});

describe('de instelling Route voorstellen in een back-up', () => {
  it('houdt een geldige keuze en laat een onbekende weg', () => {
    const skipped = { n: 0 };
    expect(cleanSettings({ routeStyle: 'simple', routeProposal: false }, skipped)).toMatchObject({ routeStyle: 'simple', routeProposal: false });
    expect(skipped.n).toBe(0);
    const out = cleanSettings({ routeStyle: 'wild' }, skipped);
    expect(out && 'routeStyle' in out).toBe(false);
    expect(skipped.n).toBe(1);
  });

  it('een oude back-up zonder de velden blijft zoals hij is', () => {
    const skipped = { n: 0 };
    const out = cleanSettings({ stravaText: true }, skipped);
    expect(out && ('routeStyle' in out || 'routeProposal' in out)).toBe(false);
    expect(skipped.n).toBe(0);
  });
});

// De keten van een wandeltraining (Lookout, 15 november): van het doel van de training via het doel van de
// zoektocht (engine/routeAdjust.ts#searchTarget, wat useRouteSearch aan findRoutes geeft) tot de zin van de lus.
describe('een wandeltraining: het hele doel gaat mee tot de zin', () => {
  it('de bergtocht van 3 uur met 500 m: de lus zegt wat de training vraagt, ook na Langer', async () => {
    const { templates } = buildDefaultProgramData();
    const mountain = templates.find((t) => t.id === 'tpl_mountain_hike')!;
    const training = routeTarget({ template: mountain, date: '2026-11-14' });
    expect(training).toMatchObject({ ascentM: 375, askedAscentM: 500, minutes: 180 });
    for (const delta of [0, 1]) {
      const target = searchTarget(training, delta);
      expect(target).toStrictEqual({ ...training, distanceKm: training.distanceKm + delta });
      // Een vlakke routeplanner: elke lus stijgt 0 m en haalt de hoogtemeters dus niet.
      const found = await findRoutes(place, target, { route: straight, terrain: async () => undefined, offline: () => false });
      if (found.kind !== 'plans') throw new Error(found.kind);
      const made = [found.plans.simple, found.plans.adventure].filter((o) => o.ok);
      expect(made.length).toBeGreaterThan(0);
      for (const o of made) {
        if (!o.ok) continue;
        expect(o.proposal.targetAscentM).toBe(500);
        expect(o.proposal.notice).toBe('Deze lus stijgt 0 m; de training vraagt 500 m.');
      }
    }
  });
});

describe('findRoutes met een wandeling zonder training (Wandeling plannen)', () => {
  it('dezelfde ingang zoekt met een afstand en een hoogtewens; de training blijft gelijk', async () => {
    const { walkPlanTarget } = await import('../engine/walkPlan');
    const walk = walkPlanTarget({ km: 5, climb: 'none' });
    const found = await findRoutes(place, walk, { route: straight, terrain: async () => undefined, offline: () => false });
    expect(found.kind).toBe('plans');
    if (found.kind !== 'plans') return;
    const made = [found.plans.simple, found.plans.adventure].flatMap((o) => (o.ok ? [o.proposal] : []));
    expect(made.length).toBeGreaterThan(0);
    // De lus mikt op 5 km, niet op een duur.
    for (const p of made) expect(Math.abs(p.distanceM - 5000)).toBeLessThan(2500);
    // De ingang met een training is dezelfde als voorheen.
    const training = await findRoutes(place, target, { route: straight, terrain: async () => undefined, offline: () => false });
    expect(training.kind).toBe('plans');
  });
});

describe('findOtherLoop', () => {
  const previous: RouteProposal = { style: 'adventure', source: 'brouter', points: [{ lat: 52.12, lon: 5.65 }, { lat: 52.14, lon: 5.65 }, { lat: 52.12, lon: 5.65 }], distanceM: 6000, ascentM: 0, repeatedShare: 0 };
  const cachedTerrain: NearbyTerrain = { source: 'osm', fetchedAt: '2026-11-01T08:00:00.000Z', place: { name: '', lat: 52.12, lon: 5.65 }, radiusM: 3000, features: [{ kind: 'dirt_path', lat: 52.13, lon: 5.67, distanceM: 1500 }] };

  it('leest eerst wat er bewaard lag en vraagt de kaart dan niet opnieuw', async () => {
    const terrain = vi.fn(async () => undefined);
    const route = vi.fn(straight);
    const out = await findOtherLoop(place, target, 'east', previous, { route, terrain, cachedTerrain: async () => cachedTerrain, offline: () => false });
    expect(out.ok).toBe(true);
    expect(terrain).not.toHaveBeenCalled();
    expect(route.mock.calls.length).toBeLessThanOrEqual(MAX_ROUTE_CALLS);
  });

  it('vraagt de kaart alleen als er niets bewaard lag', async () => {
    const terrain = vi.fn(async () => cachedTerrain);
    await findOtherLoop(place, target, 'east', previous, { route: straight, terrain, cachedTerrain: async () => undefined, offline: () => false });
    expect(terrain).toHaveBeenCalledTimes(1);
  });

  it('na de tijdgrens komt er een regel en de lus blijft', async () => {
    let release: () => void = () => undefined;
    const slow: RouteFn = async () => {
      await new Promise<void>((r) => { release = r; });
      return { ok: false, reason: 'error' };
    };
    const out = await findOtherLoop(place, target, 'otherSide', previous, { route: slow, terrain: async () => undefined, cachedTerrain: async () => undefined, offline: () => false, limitMs: 20 });
    release();
    expect(out).toEqual({ ok: false, line: 'De routeplanner antwoordde niet op tijd. De lus blijft zoals hij was.' });
  });

  it('na sluiten van het blad gaat er geen aanroep meer de deur uit', async () => {
    const stop = new AbortController();
    stop.abort();
    const route = vi.fn(straight);
    const out = await findOtherLoop(place, target, 'otherSide', previous, { route, terrain: async () => undefined, cachedTerrain: async () => undefined, offline: () => false, signal: stop.signal });
    expect(route).not.toHaveBeenCalled();
    expect(out.ok).toBe(false);
  });

  it('zonder netwerk meteen de regel, zonder kaart en zonder aanroep', async () => {
    const terrain = vi.fn(async () => undefined);
    const route = vi.fn(straight);
    const out = await findOtherLoop(place, target, 'east', previous, { route, terrain, cachedTerrain: async () => undefined, offline: () => true });
    expect(out).toEqual({ ok: false, line: 'Zonder netwerk kan er geen andere lus komen. De lus blijft zoals hij was.' });
    expect(terrain).not.toHaveBeenCalled();
    expect(route).not.toHaveBeenCalled();
  });

  it('een richting waar niets ligt hergebruikt de lus zonder aanroep van de planner', async () => {
    const route = vi.fn(straight);
    const out = await findOtherLoop(place, target, 'west', previous, { route, terrain: async () => undefined, cachedTerrain: async () => ({ ...cachedTerrain, features: [] }), offline: () => false });
    expect(out.ok).toBe(true);
    expect(route).not.toHaveBeenCalled();
  });
});
