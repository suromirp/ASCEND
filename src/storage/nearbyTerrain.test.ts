import { beforeEach, describe, expect, it, vi } from 'vitest';
import { wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { getNearbyTerrain, grantTerrainConsent, hasTerrainConsent, refreshNearbyTerrain, terrainKey, TERRAIN_FETCH_DAYS } from './nearbyTerrain';

// Nagemaakte plekken en antwoorden: geen netwerk.
const place = { name: 'Ergens', lat: 52.123456, lon: 5.654321 };
const answer = { elements: [{ type: 'way', id: 2, center: { lat: 52.121, lon: 5.651 }, tags: { highway: 'steps' } }] };
const ok = () => vi.fn(async () => new Response(JSON.stringify(answer), { status: 200 }));
const as = (f: unknown) => f as typeof fetch;

beforeEach(async () => {
  await wipeAllData();
});

describe('heuvels in de buurt in de opslag', () => {
  it('bewaart per afgeronde plek en vraagt binnen dertig dagen niet opnieuw', async () => {
    const f = ok();
    const now = new Date('2026-11-08T08:00:00.000Z');
    expect((await refreshNearbyTerrain(place, { fetchImpl: as(f), now }))?.features).toHaveLength(1);
    expect(terrainKey(place)).toBe('52.12,5.65');
    expect(await getNearbyTerrain({ name: 'Anders', lat: 52.1201, lon: 5.6499 })).toBeDefined();
    await refreshNearbyTerrain(place, { fetchImpl: as(f), now: new Date(now.getTime() + (TERRAIN_FETCH_DAYS - 1) * 86_400_000) });
    expect(f).toHaveBeenCalledTimes(1);
    await refreshNearbyTerrain(place, { fetchImpl: as(f), now: new Date(now.getTime() + (TERRAIN_FETCH_DAYS + 1) * 86_400_000) });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('houdt het oude resultaat bij een fout en zonder netwerk is er niets nieuws', async () => {
    await refreshNearbyTerrain(place, { fetchImpl: as(ok()), now: new Date('2026-09-01T08:00:00.000Z') });
    const fail = vi.fn(async () => new Response('', { status: 500 }));
    expect(await refreshNearbyTerrain(place, { fetchImpl: as(fail), now: new Date('2026-11-08T08:00:00.000Z') })).toBeDefined();
    const other = { name: '', lat: 48.5, lon: 7.5 };
    expect(await refreshNearbyTerrain(other, { fetchImpl: as(fail) })).toBeUndefined();
  });

  it('een eigen startpunt (exact) heeft een eigen plek in de cache, naast de afgeronde plek', async () => {
    const f = ok();
    const point = { name: '', lat: 52.1235, lon: 5.6543 };
    const exact = await refreshNearbyTerrain(point, { fetchImpl: as(f), exact: true });
    expect(exact?.place).toEqual(point);
    expect(terrainKey(point, true)).toBe('52.1235,5.6543');
    expect(await getNearbyTerrain(point, true)).toEqual(exact);
    // De afgeronde plek is een andere sleutel: die is er nog niet.
    expect(await getNearbyTerrain(point)).toBeUndefined();
    await refreshNearbyTerrain(point, { fetchImpl: as(f), exact: true });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('bewaart hoogstens zes plekken', async () => {
    for (let i = 0; i < 8; i++) await refreshNearbyTerrain({ name: '', lat: 50 + i, lon: 5 }, { fetchImpl: as(ok()), now: new Date(Date.UTC(2026, 10, 1 + i)) });
    expect(await getNearbyTerrain({ name: '', lat: 50, lon: 5 })).toBeUndefined();
    expect(await getNearbyTerrain({ name: '', lat: 57, lon: 5 })).toBeDefined();
  });

  it('bewaart de naam en exacte positie niet, en gaat nooit mee in de back-up', async () => {
    await refreshNearbyTerrain(place, { fetchImpl: as(ok()) });
    await grantTerrainConsent();
    const stored = JSON.stringify(await getNearbyTerrain(place));
    expect(stored).not.toContain('Ergens');
    expect(stored).not.toContain('52.123456');
    const backup = JSON.stringify(await buildBackupEnvelope());
    expect(backup).not.toContain('nearbyTerrain');
    expect(backup).not.toContain('"source":"osm"');
  });

  it('de eerste vraag: zonder ja geen toestemming, met ja blijft hij staan', async () => {
    expect(await hasTerrainConsent()).toBe(false);
    await grantTerrainConsent();
    expect(await hasTerrainConsent()).toBe(true);
  });
});
