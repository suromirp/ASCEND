import { describe, it, expect, beforeEach } from 'vitest';
import { wipeAllData } from './database';
import { RoutePlanRepo, SoloPlanRepo } from './routePlan';
import { buildBackupEnvelope, normalizeBackupToCurrentModel, buildImportPreview, createImportPlan, createPreImportSnapshot, applyImportPlan, defaultActionsForMode, defaultPlanPolicyForMode } from './backup';
import { EMPTY_ROUTE_PLAN, EMPTY_SOLO_PLAN, type RoutePlan, type SoloPlan } from '../models/routePlan';

// Nagemaakte gegevens: niets hier hoort bij een echt persoon.
const plan: RoutePlan = { choices: { t1e1: { sleep: 'tent' }, t2e6: { sleep: 'bivak', restAfter: true } }, updatedAt: '2026-10-22T10:00:00.000Z' };
const solo: SoloPlan = { who: 'Sam', checkInTime: '20:00', ifMissing: 'bel na twee uur', satellite: 'nog-niet', satelliteNote: '', gear: 'groene tent', updatedAt: '2026-10-22T10:00:00.000Z' };

async function importEnvelope(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const selections = defaultActionsForMode('full_restore');
  const policy = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, selections, policy);
  const snapshot = await createPreImportSnapshot();
  const plan = createImportPlan(backup, 'full_restore', selections, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
}

describe('etappeplan en solokaart in opslag en back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('geeft een leeg plan als er niets is opgeslagen', async () => {
    expect(await RoutePlanRepo.get()).toEqual(EMPTY_ROUTE_PLAN);
    expect(await SoloPlanRepo.get()).toEqual(EMPTY_SOLO_PLAN);
  });

  it('bewaart beide en leest ze terug', async () => {
    await RoutePlanRepo.set(plan);
    await SoloPlanRepo.set(solo);
    expect(await RoutePlanRepo.get()).toEqual(plan);
    expect(await SoloPlanRepo.get()).toEqual(solo);
  });

  it('gaat mee in de export (schema v5) en komt terug na een volledig herstel', async () => {
    await RoutePlanRepo.set(plan);
    await SoloPlanRepo.set(solo);
    const envelope = await buildBackupEnvelope();
    expect(envelope.backupSchemaVersion).toBe(5);
    expect(envelope.payload).toMatchObject({ version: 5, routePlan: plan, soloPlan: solo });

    await wipeAllData();
    expect(await RoutePlanRepo.get()).toEqual(EMPTY_ROUTE_PLAN);
    await importEnvelope(envelope);
    expect(await RoutePlanRepo.get()).toEqual(plan);
    expect(await SoloPlanRepo.get()).toEqual(solo);
  });

  it('exporteert null als er nooit iets is ingevuld', async () => {
    const envelope = await buildBackupEnvelope();
    expect(envelope.payload).toMatchObject({ routePlan: null, soloPlan: null });
  });

  it('laat het plan op het toestel met rust bij een back-up van vóór schema v5', async () => {
    await RoutePlanRepo.set(plan);
    await SoloPlanRepo.set(solo);
    const v4 = { backupSchemaVersion: 4, createdAt: '2026-10-01T00:00:00.000Z', payload: { version: 4, program: null, templates: [], plannedSessions: [], sessionLogs: [], trainingGoals: [], goalMilestones: [], goalMilestoneProgress: [], capabilityEvidence: [], injuryNotes: [], settings: {}, goalEngineConfig: null, strengthProgramStrategies: [], strengthProgramRecommendations: [], planChangeProposals: [], adviceResponses: null } };
    const backup = normalizeBackupToCurrentModel(v4);
    expect(backup.routePlan).toBeUndefined();
    expect(backup.soloPlan).toBeUndefined();
    await importEnvelope(v4);
    expect(await RoutePlanRepo.get()).toEqual(plan);
    expect(await SoloPlanRepo.get()).toEqual(solo);
  });

  it('slaat een onleesbaar plan in een back-up over en telt het', () => {
    const backup = normalizeBackupToCurrentModel({ backupSchemaVersion: 5, createdAt: '2026-10-22T00:00:00.000Z', payload: { version: 5, routePlan: 'kapot', soloPlan: { who: 'Sam', checkInTime: '99:99' } } });
    expect(backup.routePlan).toBeUndefined();
    expect(backup.soloPlan).toMatchObject({ who: 'Sam', checkInTime: '' });
    expect(backup.skippedInvalid).toBe(1);
  });

  it('weigert een back-up van een nieuwere versie', () => {
    expect(() => normalizeBackupToCurrentModel({ backupSchemaVersion: 6, createdAt: 'x', payload: { version: 6 } })).toThrow(/nieuwere versie/);
  });

  it('wist beide bij het wissen van alle gegevens', async () => {
    await RoutePlanRepo.set(plan);
    await SoloPlanRepo.set(solo);
    await wipeAllData();
    expect(await RoutePlanRepo.get()).toEqual(EMPTY_ROUTE_PLAN);
    expect(await SoloPlanRepo.get()).toEqual(EMPTY_SOLO_PLAN);
  });
});
