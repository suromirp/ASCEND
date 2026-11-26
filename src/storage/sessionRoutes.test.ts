// Route per geplande training (I-160): de opslag, een fout halverwege, en export en import heen en terug.
// Alle punten en ids zijn nagemaakt.

import { beforeEach, describe, expect, it } from 'vitest';
import { MetaRepo, PlannedSessionsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { createImportPlan, createPreImportSnapshot, applyImportPlan } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { migrateSessionRoutes } from './migrations';
import { SESSION_ROUTES_KEY, loadSessionRoutes, peekSessionRoutes, removeSessionRoute, saveSessionRoute, type SessionRoutesStore } from './sessionRoutes';
import { sessionRouteFrom } from '../engine/sessionRoute';
import type { PlannedSession } from '../models/training';
import type { RoutePoint } from '../models/route';
import type { SessionRoute } from '../models/sessionRoute';

const points: RoutePoint[] = Array.from({ length: 40 }, (_, i) => ({ lat: 51.9 + i * 0.0007, lon: 5.9 + Math.sin(i / 4) * 0.002, ele: 40 + (i % 10) * 6 }));
const session = (id: string, date: string, extra: Partial<PlannedSession> = {}): PlannedSession => ({
  id, templateId: 'tpl_long_run', scheduledDate: date, weekStartDate: '2026-11-23', status: 'planned', order: 0, ...extra,
});
const routeFor = (id: string): SessionRoute => sessionRouteFrom(id, { style: 'simple', source: 'brouter', points, distanceM: 10200, ascentM: 300, repeats: 4 }, '2026-11-25');

async function restore(file: unknown, mode: 'full_restore' | 'merge' = 'full_restore') {
  const backup = normalizeBackupToCurrentModel(file);
  const selections = defaultActionsForMode(mode);
  const policy = defaultPlanPolicyForMode(mode);
  const preview = await buildImportPreview(backup, selections, policy);
  const snapshot = await createPreImportSnapshot();
  const plan = createImportPlan(backup, mode, selections, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
  return backup;
}

// Een opslag in het geheugen die bij het schrijven kan falen.
function fakeStore(start: SessionRoute[] = [], sessions: PlannedSession[] = []): SessionRoutesStore & { fail: boolean; data: unknown } {
  const s = {
    fail: false,
    data: start as unknown,
    get: async () => s.data,
    put: async (routes: SessionRoute[]) => {
      if (s.fail) throw new Error('schijf vol');
      s.data = routes;
    },
    sessions: async () => sessions,
  };
  return s;
}

beforeEach(async () => {
  await wipeAllData();
});

describe('opslag', () => {
  it('kiezen, wijzigen en weggooien op het toestel; Week en Vandaag lezen dezelfde stand', async () => {
    const ps = session('ps1', '2026-11-28');
    await PlannedSessionsRepo.put(ps);
    expect(await saveSessionRoute(ps, routeFor('ps1'))).toBe(true);
    expect(await loadSessionRoutes()).toEqual([routeFor('ps1')]);
    expect(peekSessionRoutes()).toEqual([routeFor('ps1')]);
    const other = { ...routeFor('ps1'), style: 'adventure' as const };
    expect(await saveSessionRoute(ps, other)).toBe(true);
    expect((await loadSessionRoutes()).map((r) => r.style)).toEqual(['adventure']);
    expect(await removeSessionRoute(ps)).toBe(true);
    expect(await loadSessionRoutes()).toEqual([]);
  });

  it('de training zelf verandert niet door een route: zelfde minuten, zelfde dag', async () => {
    const ps = session('ps1', '2026-11-28', { plannedMinutes: 75 });
    await PlannedSessionsRepo.put(ps);
    await saveSessionRoute(ps, routeFor('ps1'));
    expect(await PlannedSessionsRepo.getAll()).toEqual([ps]);
  });

  it('een fout halverwege het opslaan: alles of niets, de oude route blijft', async () => {
    const ps = session('ps1', '2026-11-28');
    const store = fakeStore([routeFor('ps1')], [ps]);
    store.fail = true;
    expect(await saveSessionRoute(ps, { ...routeFor('ps1'), style: 'adventure' }, store)).toBe(false);
    expect(await removeSessionRoute(ps, store)).toBe(false);
    expect(store.data).toEqual([routeFor('ps1')]);
  });

  it('een training die de planning weghaalde: zijn route gaat bij de volgende schrijfactie mee weg', async () => {
    const a = session('psA', '2026-11-26');
    const b = session('psB', '2026-11-28');
    const store = fakeStore([routeFor('psA')], [b]);
    expect(await saveSessionRoute(b, routeFor('psB'), store)).toBe(true);
    expect((store.data as SessionRoute[]).map((r) => r.plannedSessionId)).toEqual(['psB']);
    expect(a.id).toBe('psA');
  });

  it('een wees (route van een rij die weg is) staat bij het lezen niet meer in de stand; de opslag volgt bij de volgende schrijfactie', async () => {
    const b = session('psB', '2026-11-28');
    const store = fakeStore([routeFor('psA'), routeFor('psB')], [b]);
    expect((await loadSessionRoutes(store)).map((r) => r.plannedSessionId)).toEqual(['psB']);
    // Lezen schrijft niets; de wees staat nog in de opslag tot de volgende schrijfactie.
    expect((store.data as SessionRoute[]).map((r) => r.plannedSessionId)).toEqual(['psA', 'psB']);
    expect(await saveSessionRoute(b, routeFor('psB'), store)).toBe(true);
    expect((store.data as SessionRoute[]).map((r) => r.plannedSessionId)).toEqual(['psB']);
    // Kan de lijst van trainingen niet gelezen worden, dan blijft alles staan.
    const blind = { ...fakeStore([routeFor('psA')]), sessions: async () => { throw new Error('weg'); } };
    expect((await loadSessionRoutes(blind)).map((r) => r.plannedSessionId)).toEqual(['psA']);
  });

  it('een log wordt door opruimen nooit aangeraakt', async () => {
    const { SessionLogsRepo } = await import('./database');
    const before = await SessionLogsRepo.getAll();
    await loadSessionRoutes();
    expect(await SessionLogsRepo.getAll()).toEqual(before);
  });

  it('een kapotte route wordt niet bewaard', async () => {
    const ps = session('ps1', '2026-11-28');
    const store = fakeStore([], [ps]);
    expect(await saveSessionRoute(ps, { ...routeFor('ps1'), points: [points[0]] }, store)).toBe(false);
    expect(await saveSessionRoute(ps, { ...routeFor('ps1'), points: Array.from({ length: 801 }, () => points[0]) }, store)).toBe(false);
    expect(store.data).toEqual([]);
  });
});

describe('migratie', () => {
  it('zonder veld: niets gelezen, niets overgeslagen; een kapotte route valt weg en telt', () => {
    expect(migrateSessionRoutes(undefined)).toEqual({ list: undefined, skipped: 0 });
    expect(migrateSessionRoutes({ a: 1 })).toEqual({ list: undefined, skipped: 1 });
    const good = routeFor('ps1');
    const read = migrateSessionRoutes([good, { ...good, plannedSessionId: '' }, { ...good, source: 'garmin' }, { ...good }]);
    expect(read.list).toEqual([good]);
    expect(read.skipped).toBe(3);
  });
});

describe('export en import', () => {
  it('heen en terug gelijk: de route komt terug bij dezelfde training', async () => {
    const ps = session('ps1', '2026-11-28');
    await PlannedSessionsRepo.put(ps);
    await saveSessionRoute(ps, routeFor('ps1'));
    const file = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(file.payload.sessionRoutes).toEqual([routeFor('ps1')]);
    await wipeAllData();
    const backup = await restore(file);
    expect(backup.skippedInvalid).toBe(0);
    expect(await loadSessionRoutes()).toEqual([routeFor('ps1')]);
    expect(await PlannedSessionsRepo.getAll()).toEqual([ps]);
    // Nog een keer heen en terug: precies hetzelfde bestand.
    const again = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(again.payload.sessionRoutes).toEqual(file.payload.sessionRoutes);
    expect(again.payload.plannedSessions).toEqual(file.payload.plannedSessions);
  });

  it('een oude back-up zonder het veld leest gelijk en laat de routes van het toestel staan', async () => {
    const ps = session('ps1', '2026-11-28');
    await PlannedSessionsRepo.put(ps);
    const old = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect('sessionRoutes' in old.payload).toBe(false);
    const read = normalizeBackupToCurrentModel(old);
    expect('sessionRoutes' in read).toBe(false);
    expect(read.skippedInvalid).toBe(0);
    await saveSessionRoute(ps, routeFor('ps1'));
    await restore(old);
    expect(await loadSessionRoutes()).toEqual([routeFor('ps1')]);
  });

  it('een import met een planning zonder die training: de route gaat mee weg', async () => {
    const other = session('ps9', '2026-11-29');
    await PlannedSessionsRepo.put(other);
    const file = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    const ps = session('ps1', '2026-11-28');
    await PlannedSessionsRepo.put(ps);
    await saveSessionRoute(ps, routeFor('ps1'));
    await restore(file);
    expect(await PlannedSessionsRepo.getAll()).toEqual([other]);
    expect(await MetaRepo.get(SESSION_ROUTES_KEY)).toEqual([]);
  });
});
