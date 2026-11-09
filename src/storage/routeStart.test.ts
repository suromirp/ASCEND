import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MetaRepo, SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { createImportPlan, createPreImportSnapshot, applyImportPlan } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { cleanSettings } from './backupClean';
import { clearRouteStartPoint, getRouteStartPoint, saveRouteStartPoint, locateStartHere } from './routeStart';
import { LocateError } from '../utils/geolocation';

// Nagemaakt punt, geen echte plek.
const fake = { lat: 52.123456, lon: 5.654321 };
const noAsk = async () => undefined;

beforeEach(async () => {
  await wipeAllData();
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

  it('staat niet in de export en niet in een back-up', async () => {
    await saveRouteStartPoint(fake);
    const backup = JSON.stringify(await buildBackupEnvelope());
    expect(backup).not.toContain('routeStartPoint');
    expect(backup).not.toContain('52.123');
    expect(backup).not.toContain('5.654');
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
    expect((cleanSettings({ routeStart: 'exact' }, { n: 0 }) as Record<string, unknown>).routeStart).toBe('exact');
    expect((cleanSettings({ routeStart: 'approx' }, { n: 0 }) as Record<string, unknown>).routeStart).toBe('approx');
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

  it('hangt de vraag om toestemming, dan stopt ook die bij de tijdgrens', async () => {
    const locate = vi.fn(async () => fake);
    const out = await locateStartHere({ askPermission: () => new Promise(() => undefined), locate, limitMs: 20 });
    expect(out).toEqual({ ok: false, reason: 'timeout' });
  });

  it('een ruwe plek telt niet als startpunt', async () => {
    const out = await locateStartHere({ askPermission: noAsk, locate: async () => ({ ...fake, accuracyM: 2000 }) });
    expect(out).toEqual({ ok: false, reason: 'coarse' });
    expect(await getRouteStartPoint()).toBeUndefined();
  });

  it('een browser zonder locatie en een kapot antwoord geven een reden', async () => {
    expect(await locateStartHere({ askPermission: noAsk, locate: async () => { throw new LocateError('unsupported'); } })).toEqual({ ok: false, reason: 'unsupported' });
    expect(await locateStartHere({ askPermission: noAsk, locate: async () => ({ lat: NaN, lon: 1 }) })).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('een fout bij de toestemming is geen fout van de plek', async () => {
    const out = await locateStartHere({ askPermission: async () => { throw new Error('plugin stuk'); }, locate: async () => ({ ...fake, accuracyM: 10 }) });
    expect(out.ok).toBe(true);
  });
});
