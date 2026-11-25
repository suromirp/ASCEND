// I-160: Opnieuw proberen bij een ontbrekende kaart, en een kaart die faalt of te laat is. Nagemaakte plek.
import { describe, expect, it, vi } from 'vitest';
import type { NearbyTerrain } from '../models/nearbyTerrain';
import type { RouteAnswer, RouteFn, RoutePoint } from '../models/route';
import { retryRouteMap } from './routeMapRetry';
import { findRoutes } from './routeProposal';
import { mapMissing } from '../engine/routeSheet';

const place = { lat: 52.1, lon: 5.9 };
const MAP: NearbyTerrain = { source: 'osm', fetchedAt: '2026-11-25T08:00:00.000Z', place: { name: '', lat: 52.1, lon: 5.9 }, radiusM: 3000, features: [] };

const straight: RouteFn = async (waypoints: RoutePoint[]): Promise<RouteAnswer> => ({ ok: true, line: { source: 'brouter', points: [...waypoints, waypoints[0]].map((p) => ({ ...p, ele: 10 })) } });

describe('Opnieuw proberen: alleen de kaart', () => {
  it('de kaart komt binnen: ja, op de afgeronde plek', async () => {
    const terrain = vi.fn(async () => MAP);
    expect(await retryRouteMap(place, undefined, undefined, { terrain, offline: () => false })).toBe(true);
    expect(terrain).toHaveBeenCalledTimes(1);
    expect(terrain).toHaveBeenCalledWith({ name: '', lat: 52.1, lon: 5.9 }, false);
  });

  it('Overpass faalt: nee', async () => {
    expect(await retryRouteMap(place, undefined, undefined, { terrain: async () => undefined, offline: () => false })).toBe(false);
    expect(await retryRouteMap(place, undefined, undefined, { terrain: async () => { throw new Error('stuk'); }, offline: () => false })).toBe(false);
  });

  it('te laat: nee, na de tijdgrens', async () => {
    const never = () => new Promise<NearbyTerrain | undefined>(() => undefined);
    expect(await retryRouteMap(place, undefined, undefined, { terrain: never, offline: () => false, limitMs: 20 })).toBe(false);
  });

  it('zonder netwerk: nee, zonder aanroep', async () => {
    const terrain = vi.fn(async () => MAP);
    expect(await retryRouteMap(place, undefined, undefined, { terrain, offline: () => true })).toBe(false);
    expect(terrain).not.toHaveBeenCalled();
  });

  it('een precies startpunt: de kaart om dat punt', async () => {
    const terrain = vi.fn(async () => MAP);
    await retryRouteMap(place, { lat: 52.11111, lon: 5.92222 }, undefined, { terrain, offline: () => false });
    expect(terrain).toHaveBeenCalledWith({ name: '', lat: 52.11111, lon: 5.92222 }, true);
  });
});

describe('De kaart faalt tijdens het zoeken', () => {
  it('Overpass of de tegel faalt: lussen zonder kaart, en de regel bovenaan', async () => {
    const found = await findRoutes(place, { distanceKm: 10, ascentM: 300 }, { route: straight, terrain: async () => { throw new Error('stuk'); }, cachedTerrain: async () => undefined, offline: () => false, loop: { priority: 'ascent', driveLimitMin: 30 } });
    expect(found.kind).toBe('plans');
    if (found.kind !== 'plans') return;
    expect(found.plans.map).toBe('none');
    expect(mapMissing(found.plans)).toBe(true);
  });

  it('de kaart is te laat: hetzelfde', async () => {
    const never = () => new Promise<NearbyTerrain | undefined>(() => undefined);
    const found = await findRoutes(place, { distanceKm: 10, ascentM: 300 }, { route: straight, terrain: never, cachedTerrain: async () => undefined, offline: () => false, limitMs: 3000, loop: { priority: 'distance' } });
    expect(found.kind === 'plans' && mapMissing(found.plans)).toBe(true);
  });
});
