import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetaRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { clearExactTerrain, getNearbyTerrain, grantTerrainConsent, hasTerrainConsent, refreshNearbyTerrain, terrainKey, TERRAIN_FETCH_DAYS } from './nearbyTerrain';

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

  it('wissen van de exacte plekken haalt het punt uit de cache en laat de afgeronde plek staan', async () => {
    const f = ok();
    const point = { name: '', lat: 52.1235, lon: 5.6543 };
    await refreshNearbyTerrain(point, { fetchImpl: as(f), exact: true });
    await refreshNearbyTerrain(place, { fetchImpl: as(f) });
    await clearExactTerrain();
    expect(await getNearbyTerrain(point, true)).toBeUndefined();
    expect(await getNearbyTerrain(place)).toBeDefined();
    expect(JSON.stringify(await MetaRepo.get('nearbyTerrain'))).not.toContain('52.1235');
  });

  it('wissen tijdens een lopende zoektocht: het gewiste punt komt niet terug', async () => {
    const point = { name: '', lat: 52.1235, lon: 5.6543 };
    const other = { name: '', lat: 51.4321, lon: 4.1234 };
    await refreshNearbyTerrain(other, { fetchImpl: as(ok()), exact: true });
    // Het antwoord komt pas als het startpunt intussen gewist is.
    const slow = vi.fn(async () => {
      await clearExactTerrain();
      return new Response(JSON.stringify(answer), { status: 200 });
    });
    expect(await refreshNearbyTerrain(point, { fetchImpl: as(slow), exact: true })).toBeDefined();
    expect(await getNearbyTerrain(point, true)).toBeUndefined();
    // Ook een ander gewist punt komt niet terug via de oude lezing.
    expect(await getNearbyTerrain(other, true)).toBeUndefined();
    expect(JSON.stringify(await MetaRepo.get('nearbyTerrain'))).not.toMatch(/52\.1235|51\.4321/);
  });

  it('een zoektocht die faalt na het wissen schrijft niets terug', async () => {
    const point = { name: '', lat: 52.1235, lon: 5.6543 };
    const failAfterClear = vi.fn(async () => {
      await clearExactTerrain();
      return new Response('', { status: 500 });
    });
    expect(await refreshNearbyTerrain(point, { fetchImpl: as(failAfterClear), exact: true })).toBeUndefined();
    expect(await getNearbyTerrain(point, true)).toBeUndefined();
  });

  it('een afgeronde plek wordt gewoon bewaard, ook als intussen de exacte punten gewist worden', async () => {
    const point = { name: '', lat: 52.1235, lon: 5.6543 };
    await refreshNearbyTerrain(point, { fetchImpl: as(ok()), exact: true });
    const slow = vi.fn(async () => {
      await clearExactTerrain();
      return new Response(JSON.stringify(answer), { status: 200 });
    });
    await refreshNearbyTerrain(place, { fetchImpl: as(slow) });
    expect(await getNearbyTerrain(place)).toBeDefined();
    expect(await getNearbyTerrain(point, true)).toBeUndefined();
  });

  it('een afgeronde zoektocht schrijft een punt dat intussen gewist wordt niet terug (wis niet afgewacht)', async () => {
    const point = { name: '', lat: 52.1235, lon: 5.6543 };
    await refreshNearbyTerrain(point, { fetchImpl: as(ok()), exact: true });
    let clearing: Promise<void> | undefined;
    const slow = vi.fn(async () => {
      clearing = clearExactTerrain();
      return new Response(JSON.stringify(answer), { status: 200 });
    });
    await refreshNearbyTerrain(place, { fetchImpl: as(slow) });
    await clearing;
    expect(await getNearbyTerrain(place)).toBeDefined();
    expect(await getNearbyTerrain(point, true)).toBeUndefined();
    expect(JSON.stringify(await MetaRepo.get('nearbyTerrain'))).not.toContain('52.1235');
  });

  it('twee zoektochten tegelijk met een wis ertussen: beide afgeronde plekken blijven, het punt niet', async () => {
    const point = { name: '', lat: 52.1235, lon: 5.6543 };
    const second = { name: '', lat: 48.5, lon: 7.5 };
    await refreshNearbyTerrain(point, { fetchImpl: as(ok()), exact: true });
    let clearing: Promise<void> | undefined;
    const withClear = vi.fn(async () => {
      clearing = clearExactTerrain();
      return new Response(JSON.stringify(answer), { status: 200 });
    });
    await Promise.all([
      refreshNearbyTerrain(place, { fetchImpl: as(withClear) }),
      refreshNearbyTerrain(second, { fetchImpl: as(ok()) }),
    ]);
    await clearing;
    expect(await getNearbyTerrain(place)).toBeDefined();
    expect(await getNearbyTerrain(second)).toBeDefined();
    expect(await getNearbyTerrain(point, true)).toBeUndefined();
  });

  it('een exacte zoektocht die loopt tijdens een niet afgewachte wis bewaart zijn punt niet', async () => {
    const point = { name: '', lat: 52.1235, lon: 5.6543 };
    let clearing: Promise<void> | undefined;
    const slow = vi.fn(async () => {
      clearing = clearExactTerrain();
      return new Response(JSON.stringify(answer), { status: 200 });
    });
    expect(await refreshNearbyTerrain(point, { fetchImpl: as(slow), exact: true })).toBeDefined();
    await clearing;
    expect(await getNearbyTerrain(point, true)).toBeUndefined();
  });

  it('de sleutel van een exact punt rondt zoals de plek die bewaard wordt', () => {
    for (const v of [52.12345, 52.123449999, 1.00005, -0.00005, 8.34565]) {
      const r = Math.round(v * 10_000) / 10_000;
      expect(terrainKey({ name: '', lat: v, lon: v }, true)).toBe(`${r.toFixed(4)},${r.toFixed(4)}`);
    }
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
