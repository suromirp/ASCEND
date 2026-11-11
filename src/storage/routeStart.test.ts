import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetaRepo, SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { createImportPlan, createPreImportSnapshot, applyImportPlan } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { cleanSettings } from './backupClean';
import { clearRouteStartPoint, getRouteStartPoint, saveRouteStartPoint, locateStartHere, startFromMap } from './routeStart';
import { resolveRouteStart, startFailureReason } from '../engine/routeStart';
import { LocateError } from '../utils/geolocation';
import { getNearbyTerrain, refreshNearbyTerrain } from './nearbyTerrain';

// Nagemaakt punt, geen echte plek.
const fake = { lat: 52.123456, lon: 5.654321 };
const noAsk = async () => undefined;

beforeEach(async () => {
  await wipeAllData();
});

describe('Wis startpunt en de heuvels rond dat punt', () => {
  const answer = { elements: [{ type: 'way', id: 2, center: { lat: 52.121, lon: 5.651 }, tags: { highway: 'steps' } }] };
  const fetchImpl = (async () => new Response(JSON.stringify(answer), { status: 200 })) as unknown as typeof fetch;
  // Nagemaakt punt.
  const point = { name: '', lat: 52.1235, lon: 5.6543 };

  it('wissen haalt ook de heuvels weg die rond het punt bewaard zijn', async () => {
    await wipeAllData();
    await saveRouteStartPoint(point);
    await refreshNearbyTerrain(point, { fetchImpl, exact: true });
    expect(await getNearbyTerrain(point, true)).toBeDefined();
    expect(await clearRouteStartPoint()).toBe(true);
    expect(await getNearbyTerrain(point, true)).toBeUndefined();
    expect(JSON.stringify(await MetaRepo.get('nearbyTerrain'))).not.toContain('52.1235');
  });

  it('een nieuw startpunt laat de heuvels rond het oude punt niet staan', async () => {
    await wipeAllData();
    await saveRouteStartPoint(point);
    await refreshNearbyTerrain(point, { fetchImpl, exact: true });
    await saveRouteStartPoint({ lat: 52.2, lon: 5.7 });
    expect(await getNearbyTerrain(point, true)).toBeUndefined();
  });
});

describe('het eigen startpunt op het toestel', () => {
  it('bewaart een punt op vijf decimalen en wist het met één tik', async () => {
    expect(await saveRouteStartPoint(fake)).toBe(true);
    expect(await getRouteStartPoint()).toEqual({ lat: 52.12346, lon: 5.65432 });
    expect(await clearRouteStartPoint()).toBe(true);
    expect(await getRouteStartPoint()).toBeUndefined();
    // Wissen zonder punt is ook goed.
    expect(await clearRouteStartPoint()).toBe(true);
  });

  it('bewaart geen kapot punt en leest een kapotte waarde als geen punt', async () => {
    expect(await saveRouteStartPoint({ lat: NaN, lon: 1 })).toBe(false);
    await MetaRepo.set('routeStartPoint', { lat: 'x', lon: 5 });
    expect(await getRouteStartPoint()).toBeUndefined();
  });

  // Was tot 11 november "staat niet in de export en niet in een back-up". Het vaste punt is nu de plek Thuis
  // en die gaat mee in de back-up (docs/beslissingen/2026-11-11-plekken-en-routes.md, onder Vervangt: het
  // niet-in-de-back-up voor Vast punt vervalt met de migratie naar Thuis). Wat blijft: de oude sleutel
  // `routeStartPoint` staat nergens in een back-up, en het punt staat er alleen als plek in, niet in de instellingen.
  it('gaat als de plek Thuis mee in een back-up, nooit onder de oude sleutel of in de instellingen', async () => {
    await saveRouteStartPoint(fake);
    const envelope = await buildBackupEnvelope();
    const backup = JSON.stringify(envelope);
    expect(backup).not.toContain('routeStartPoint');
    expect(JSON.stringify(envelope.payload.settings)).not.toContain('52.123');
    expect((envelope.payload as { places?: unknown }).places).toEqual([expect.objectContaining({ name: 'Thuis', home: true, lat: 52.12346, lon: 5.65432 })]);
  });

  it('een import neemt geen punt mee en wist het eigen punt niet', async () => {
    const envelope = await buildBackupEnvelope();
    await saveRouteStartPoint(fake);
    // Een oude of vreemde back-up met een punt erin: het punt komt nooit mee.
    const sneaky = JSON.parse(JSON.stringify(envelope));
    sneaky.payload.settings = { ...(sneaky.payload.settings ?? {}), routeStartPoint: { lat: 1, lon: 2 }, routeStart: 'exact' };
    const backup = normalizeBackupToCurrentModel(sneaky);
    const selections = defaultActionsForMode('full_restore');
    const policy = defaultPlanPolicyForMode('full_restore');
    const preview = await buildImportPreview(backup, selections, policy);
    const snapshot = await createPreImportSnapshot();
    const plan = createImportPlan(backup, 'full_restore', selections, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
    await applyImportPlan(backup, plan);
    expect(await getRouteStartPoint()).toEqual({ lat: 52.12346, lon: 5.65432 });
    expect(JSON.stringify(await SettingsRepo.get())).not.toContain('routeStartPoint');
    expect(JSON.stringify(await buildBackupEnvelope())).not.toContain('routeStartPoint');
  });

  it('een back-up met een onbekende waarde voor het startpunt laat die vallen', () => {
    const skipped = { n: 0 };
    const cleaned = cleanSettings({ routeStart: 'ergens', routeStartPoint: { lat: 1, lon: 2 } }, skipped) as Record<string, unknown>;
    expect(cleaned.routeStart).toBeUndefined();
    expect(cleaned.routeStartPoint).toBeUndefined();
  });

  it('een oude back-up houdt zijn eigen keuze; zonder veld geldt Waar je nu bent', () => {
    const clean = (v: Record<string, unknown>) => cleanSettings(v, { n: 0 }) as Record<string, unknown>;
    expect(clean({ routeStart: 'exact' }).routeStart).toBe('exact');
    expect(clean({ routeStart: 'approx' }).routeStart).toBe('approx');
    expect(clean({ routeStart: 'here' }).routeStart).toBe('here');
    expect(resolveRouteStart(clean({}).routeStart)).toBe('here');
    expect(resolveRouteStart(clean({ routeStart: 'ergens' }).routeStart)).toBe('here');
  });
});

describe('Gebruik waar ik nu ben', () => {
  it('bewaart een goede plek en geeft hem terug', async () => {
    const out = await locateStartHere({ askPermission: noAsk, locate: async () => ({ ...fake, accuracyM: 20 }) });
    expect(out).toEqual({ ok: true, point: { lat: 52.12346, lon: 5.65432 } });
    expect(await getRouteStartPoint()).toEqual({ lat: 52.12346, lon: 5.65432 });
  });

  it('geen toestemming: een reden en niets bewaard', async () => {
    const out = await locateStartHere({ askPermission: noAsk, locate: async () => { throw new LocateError('denied'); } });
    expect(out).toEqual({ ok: false, reason: 'denied' });
    expect(await getRouteStartPoint()).toBeUndefined();
  });

  it('geen antwoord binnen de tijdgrens: timeout, niets bewaard', async () => {
    const out = await locateStartHere({ askPermission: noAsk, locate: () => new Promise(() => undefined), limitMs: 20 });
    expect(out).toEqual({ ok: false, reason: 'timeout' });
    expect(await getRouteStartPoint()).toBeUndefined();
  });

  it('hangt het venster van Android, dan stopt het wachten na een eigen ruime grens', async () => {
    vi.useFakeTimers();
    try {
      const pending = locateStartHere({ askPermission: () => new Promise(() => undefined), locate: async () => ({ ...fake, accuracyM: 5 }) });
      await vi.advanceTimersByTimeAsync(61_000);
      expect((await pending).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('een ruwe plek telt niet als startpunt', async () => {
    const out = await locateStartHere({ askPermission: noAsk, locate: async () => ({ ...fake, accuracyM: 2000 }) });
    expect(out).toEqual({ ok: false, reason: 'coarse' });
    expect(await getRouteStartPoint()).toBeUndefined();
  });

  it('een plek die een paar straten naast je deur kan liggen telt ook niet: de grens is 50 m', async () => {
    expect(await locateStartHere({ askPermission: noAsk, locate: async () => ({ ...fake, accuracyM: 51 }) })).toEqual({ ok: false, reason: 'coarse' });
    expect(await getRouteStartPoint()).toBeUndefined();
    expect((await locateStartHere({ askPermission: noAsk, locate: async () => ({ ...fake, accuracyM: 50 }) })).ok).toBe(true);
  });

  it('een browser zonder locatie en een kapot antwoord geven een reden', async () => {
    expect(await locateStartHere({ askPermission: noAsk, locate: async () => { throw new LocateError('unsupported'); } })).toEqual({ ok: false, reason: 'unsupported' });
    expect(await locateStartHere({ askPermission: noAsk, locate: async () => ({ lat: NaN, lon: 1, accuracyM: 5 }) })).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('een fout bij de toestemming is geen fout van de plek', async () => {
    const out = await locateStartHere({ askPermission: async () => { throw new Error('plugin stuk'); }, locate: async () => ({ ...fake, accuracyM: 10 }) });
    expect(out.ok).toBe(true);
  });
});

describe('Gebruik waar ik nu ben, strenger', () => {
  it('een plek zonder nauwkeurigheid telt als ruw', async () => {
    expect(await locateStartHere({ askPermission: noAsk, locate: async () => fake })).toEqual({ ok: false, reason: 'coarse' });
  });
  it('geen fijne toestemming in de app: ruw, zonder plekvraag', async () => {
    const locate = vi.fn(async () => ({ ...fake, accuracyM: 5 }));
    expect(await locateStartHere({ askPermission: async () => 'denied', locate })).toEqual({ ok: false, reason: 'coarse' });
    expect(locate).not.toHaveBeenCalled();
  });
  it('paneel dicht tijdens het bepalen: niets bewaard', async () => {
    const stop = new AbortController();
    const out = await locateStartHere({ askPermission: noAsk, locate: async () => { stop.abort(); return { ...fake, accuracyM: 5 }; }, signal: stop.signal });
    expect(out.ok).toBe(false);
    expect(await getRouteStartPoint()).toBeUndefined();
  });
});

describe('een startpunt van de kaart', () => {
  it('Start hier: het getikte punt geldt alleen nu en bewaart niets (route-start, eis 8)', async () => {
    const r = await startFromMap({ tap: fake });
    expect(r).toEqual({ ok: true, point: { lat: 52.12346, lon: 5.65432 } });
    expect(await getRouteStartPoint()).toBeUndefined();
  });

  it('Start hier verschuift Thuis niet', async () => {
    expect(await saveRouteStartPoint({ lat: 51.5, lon: 4.5 })).toBe(true);
    const r = await startFromMap({ tap: fake });
    expect(r.ok).toBe(true);
    expect(await getRouteStartPoint()).toEqual({ lat: 51.5, lon: 4.5 });
  });

  it('Maak dit Thuis: bewust, dan verhuist Thuis naar het getikte punt', async () => {
    expect(await saveRouteStartPoint({ lat: 51.5, lon: 4.5 })).toBe(true);
    expect(await saveRouteStartPoint(fake, 'map')).toBe(true);
    expect(await getRouteStartPoint()).toEqual({ lat: 52.12346, lon: 5.65432 });
  });

  it('Gebruik waar ik nu ben: een grove plek (800 m) telt niet en bewaart niets', async () => {
    const r = await startFromMap('here', { askPermission: noAsk, locate: async () => ({ ...fake, accuracyM: 800 }) });
    expect(r).toEqual({ ok: false, reason: 'coarse' });
    expect(r.ok ? '' : startFailureReason(r.reason)).toBe('ASCEND krijgt je precieze plek niet.');
    expect(await getRouteStartPoint()).toBeUndefined();
  });

  it('Gebruik waar ik nu ben: een fijne plek wordt het startpunt', async () => {
    const r = await startFromMap('here', { askPermission: noAsk, locate: async () => ({ ...fake, accuracyM: 8 }) });
    expect(r.ok).toBe(true);
    expect(await getRouteStartPoint()).toBeDefined();
  });

  it('fijne toestemming geweigerd in de app: geen startpunt', async () => {
    expect(await startFromMap('here', { askPermission: async () => 'denied', locate: async () => ({ ...fake, accuracyM: 8 }) })).toEqual({ ok: false, reason: 'coarse' });
  });

  it('een kapot punt of een gesloten paneel bewaart niets', async () => {
    expect(await startFromMap({ tap: { lat: 99, lon: 0 } })).toEqual({ ok: false, reason: 'unavailable' });
    const stop = new AbortController();
    stop.abort();
    expect(await startFromMap({ tap: fake }, { signal: stop.signal })).toEqual({ ok: false, reason: 'timeout' });
    expect(await getRouteStartPoint()).toBeUndefined();
  });
});

describe('Ondergrond van de kaart in een back-up', () => {
  it('een oude of onbekende waarde (zoals het nooit gebouwde kaartje) valt weg', () => {
    const skipped = { n: 0 };
    const cleaned = cleanSettings({ routeMapBase: 'kaartje' }, skipped) as Record<string, unknown>;
    expect('routeMapBase' in cleaned).toBe(false);
    expect(skipped.n).toBe(1);
    expect((cleanSettings({ routeMapBase: 'light' }, { n: 0 }) as Record<string, unknown>).routeMapBase).toBe('light');
  });
});

describe('Waar je nu bent: de plek van nu wordt niet bewaard', () => {
  it('een goede plek komt terug zonder het vaste punt te raken', async () => {
    await saveRouteStartPoint(fake);
    const out = await locateStartHere({ persist: false, askPermission: noAsk, locate: async () => ({ lat: 52.2, lon: 5.2, accuracyM: 10 }) });
    expect(out).toEqual({ ok: true, point: { lat: 52.2, lon: 5.2 } });
    expect(await getRouteStartPoint()).toEqual({ lat: 52.12346, lon: 5.65432 });
  });

  it('een plek ruwer dan 50 m telt niet, ook niet bij Waar je nu bent', async () => {
    const out = await locateStartHere({ persist: false, askPermission: noAsk, locate: async () => ({ lat: 52.2, lon: 5.2, accuracyM: 51 }) });
    expect(out).toEqual({ ok: false, reason: 'coarse' });
    expect(await getRouteStartPoint()).toBeUndefined();
  });

  it('locatie geweigerd: een reden', async () => {
    const out = await locateStartHere({ persist: false, askPermission: noAsk, locate: async () => { throw new LocateError('denied'); } });
    expect(out).toEqual({ ok: false, reason: 'denied' });
  });
});

