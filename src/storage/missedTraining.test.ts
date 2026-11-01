import { describe, it, expect, beforeEach } from 'vitest';
import { MetaRepo, PlannedSessionsRepo, SessionLogsRepo, wipeAllData } from './database';
import { linkLogNow, unlinkLogsNow } from './missedTraining';
import { buildBackupEnvelope, normalizeBackupToCurrentModel, buildImportPreview, createImportPlan, createPreImportSnapshot, applyImportPlan, defaultActionsForMode, defaultPlanPolicyForMode } from './backup';
import type { PlannedSession, SessionLog } from '../models/training';

// Alles nagemaakt.
const planned = (id: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId: 'tpl_easy_run', scheduledDate: '2026-10-27', weekStartDate: '2026-10-26', status: 'planned', order: 0, ...over });
const watchRun = (id: string, over: Partial<SessionLog> = {}): SessionLog => ({
  id, templateId: 'tpl_easy_run', type: 'cardio', sport: 'running', completedDate: '2026-10-28', completedAt: '2026-10-28T08:00:00Z', variant: 'custom', durationMinutes: 42,
  externalId: `intervals.icu:i-${id}`, source: 'garmin', ...over,
} as SessionLog);

async function importEnvelope(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const selections = defaultActionsForMode('full_restore');
  const policy = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, selections, policy);
  const snapshot = await createPreImportSnapshot();
  const plan = createImportPlan(backup, 'full_restore', selections, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
}

describe('koppelen schrijven: het tweede vangnet', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('koppelt een losse horlogelog aan een open training, en Ongedaan maken haalt alleen dat weg', async () => {
    await PlannedSessionsRepo.put(planned('easy'));
    await SessionLogsRepo.put(watchRun('w1'));
    expect(await linkLogNow('w1', 'easy', '2026-10-28T09:00:00Z')).toBe(true);
    const linked = (await SessionLogsRepo.getAll())[0];
    expect(linked).toMatchObject({ plannedSessionId: 'easy', linkedLater: { at: '2026-10-28T09:00:00Z' }, durationMinutes: 42 });
    expect(await unlinkLogsNow(['w1'])).toBe(1);
    expect((await SessionLogsRepo.getAll())[0]).toEqual(watchRun('w1'));
  });

  it('niet als de training er niet meer is of overgeslagen is', async () => {
    await SessionLogsRepo.put(watchRun('w1'));
    expect(await linkLogNow('w1', 'weg', '2026-10-28T09:00:00Z')).toBe(false);
    await PlannedSessionsRepo.put(planned('skip', { status: 'skipped' }));
    expect(await linkLogNow('w1', 'skip', '2026-10-28T09:00:00Z')).toBe(false);
    expect((await SessionLogsRepo.getAll())[0].plannedSessionId).toBeUndefined();
  });

  it('niet bij een log die je zelf invulde', async () => {
    await PlannedSessionsRepo.put(planned('easy'));
    await SessionLogsRepo.put(watchRun('h1', { externalId: undefined, source: 'manual' }));
    expect(await linkLogNow('h1', 'easy', '2026-10-28T09:00:00Z')).toBe(false);
    expect((await SessionLogsRepo.getAll())[0].plannedSessionId).toBeUndefined();
  });
});

describe('het geheugen van Training die niet doorging in de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('gaat mee bij exporteren en komt terug bij importeren', async () => {
    await MetaRepo.set('missedTraining', { notNow: ['a'], notNowOn: '2026-10-28', auto: ['b'], declined: ['w1|c'] });
    const envelope = await buildBackupEnvelope();
    expect(envelope.payload).toMatchObject({ missedTraining: { notNow: ['a'], auto: ['b'], declined: ['w1|c'] } });
    await wipeAllData();
    await importEnvelope(envelope);
    expect(await MetaRepo.get('missedTraining')).toEqual({ notNow: ['a'], notNowOn: '2026-10-28', auto: ['b'], declined: ['w1|c'] });
  });

  it('wordt bij importeren gecontroleerd: alleen wat te lezen is blijft', async () => {
    const envelope = await buildBackupEnvelope();
    const edited = { ...envelope, payload: { ...envelope.payload, missedTraining: { notNow: ['a', 7], auto: 'x', declined: [] } } };
    await importEnvelope(edited);
    expect(await MetaRepo.get('missedTraining')).toEqual({ notNow: ['a'], auto: [], declined: [] });
  });

  it('een oud bestand zonder het veld laat het geheugen van het toestel staan', async () => {
    const envelope = await buildBackupEnvelope();
    expect('missedTraining' in envelope.payload).toBe(false);
    await MetaRepo.set('missedTraining', { notNow: ['eigen'] });
    await importEnvelope(envelope);
    expect(await MetaRepo.get('missedTraining')).toEqual({ notNow: ['eigen'] });
  });
});
