import { describe, expect, it, vi } from 'vitest';
import type { RouteFn, RoutePoint } from '../models/route';
import { cleanSettings } from './backupClean';
import { findRoutes } from './routeProposal';
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
    expect(found.kind === 'plans' && found.plans.found).toEqual({ hills: 1, unknown: 0, tallestM: 24, radiusM: 3000 });
    expect(terrain).toHaveBeenCalledTimes(1);
    expect(route.mock.calls.length).toBeLessThanOrEqual(2 * MAX_ROUTE_CALLS);
    // Zonder netwerk of na de grens: geen plannen, dus ook geen telling.
    expect(await findRoutes(place, target, { route, terrain, offline: () => true })).toEqual({ kind: 'offline' });
    const never: RouteFn = () => new Promise(() => undefined);
    expect(await findRoutes(place, target, { route: never, terrain, offline: () => false, limitMs: 30 })).toEqual({ kind: 'timeout' });
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
