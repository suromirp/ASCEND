import { describe, it, expect, beforeEach } from 'vitest';
import { PlannedSessionsRepo, SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import { applyImportPlan, buildBackupEnvelope, buildImportPreview, createImportPlan, createPreImportSnapshot, defaultActionsForMode, defaultPlanPolicyForMode, normalizeBackupToCurrentModel } from './backup';
import type { SessionLog } from '../models/training';

// Sporten die meetellen stap 3 en 4: de rol per sport, hoe sporten meetellen en de sport van een log reizen
// mee in de back-up. Nagemaakte data.
const padelLog: SessionLog = {
  id: 'log-padel', templateId: 'sport_padel', type: 'cardio', countedSport: 'padel', completedDate: '2026-11-03', completedAt: '2026-11-03T21:30:00Z',
  variant: 'custom', durationMinutes: 90, rpe: 5, source: 'garmin', externalId: 'test:padel:1',
};

async function importEnvelope(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const selections = defaultActionsForMode('full_restore');
  const policy = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, selections, policy);
  const snapshot = await createPreImportSnapshot();
  await applyImportPlan(backup, createImportPlan(backup, 'full_restore', selections, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id));
}

describe('sportHandling in de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reist mee in de instellingen', async () => {
    await SettingsRepo.set({ sportHandling: { football: { role: 'fixed', fixed: [{ day: 6, minutes: 90, intensity: 'high' }] }, swimming: { role: 'off' } } });
    const back = normalizeBackupToCurrentModel(JSON.parse(JSON.stringify(await buildBackupEnvelope())));
    expect(back.settings?.sportHandling).toEqual({ football: { role: 'fixed', fixed: [{ day: 6, minutes: 90, intensity: 'high' }] }, swimming: { role: 'off' } });
  });

  it('een oudere back-up zonder dit veld importeert zoals eerst, onzin valt weg', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(normalizeBackupToCurrentModel(envelope).settings?.sportHandling).toBeUndefined();
    envelope.payload.settings = { ...envelope.payload.settings, sportHandling: { tennis: { role: 'count' } } };
    expect(normalizeBackupToCurrentModel(envelope).settings?.sportHandling).toBeUndefined();
  });

  it('hoe sporten meetellen reist mee, een onbekende waarde valt weg', async () => {
    await SettingsRepo.set({ sportCounting: { askFelt: false, rest: 'korter' } });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(normalizeBackupToCurrentModel(envelope).settings?.sportCounting).toEqual({ askFelt: false, rest: 'korter' });
    envelope.payload.settings = { ...envelope.payload.settings, sportCounting: { askNew: 'ja', rest: 'kort' } };
    expect(normalizeBackupToCurrentModel(envelope).settings?.sportCounting).toBeUndefined();
  });

  it('de sport van een log reist mee; een onbekende sport valt weg en het log blijft verder zoals het was', async () => {
    await SessionLogsRepo.put(padelLog);
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(normalizeBackupToCurrentModel(envelope).sessionLogs?.find((l) => l.id === 'log-padel')).toEqual(padelLog);
    envelope.payload.sessionLogs = envelope.payload.sessionLogs.map((l: SessionLog) => ({ ...l, countedSport: 'tennis' }));
    const { countedSport: _gone, ...rest } = padelLog;
    void _gone;
    expect(normalizeBackupToCurrentModel(envelope).sessionLogs?.find((l) => l.id === 'log-padel')).toEqual(rest);
  });

  it('een oude back-up zonder deze velden importeert zoals hij was', async () => {
    const old: SessionLog = { id: 'log-run', templateId: 'tpl_easy_run', type: 'cardio', completedDate: '2026-10-01', completedAt: '2026-10-01T08:00:00Z', variant: 'full', durationMinutes: 40, source: 'manual' };
    await SessionLogsRepo.put(old);
    await SettingsRepo.set({ enabledSports: { running: true, hiking: true, cycling: false } });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    await importEnvelope(envelope);
    expect((await SessionLogsRepo.getAll()).find((l) => l.id === 'log-run')).toEqual(old);
    const s = await SettingsRepo.get();
    expect(s.sportHandling).toBeUndefined();
    expect(s.sportCounting).toBeUndefined();
  });

  it('hoeveel per soort en de markering op een rij reizen mee; onzin valt weg en de rij blijft', async () => {
    await SettingsRepo.set({ kindAmount: { strength: 'more' } });
    await PlannedSessionsRepo.put({ id: 'p-extra', templateId: 'tpl_easy_run', scheduledDate: '2026-11-06', weekStartDate: '2026-11-02', status: 'planned', order: 9, amount: { kind: 'easy', change: 'extra' } });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    const back = normalizeBackupToCurrentModel(envelope);
    expect(back.settings?.kindAmount).toEqual({ strength: 'more' });
    expect(back.plannedSessions?.find((s) => s.id === 'p-extra')?.amount).toEqual({ kind: 'easy', change: 'extra' });
    envelope.payload.settings = { ...envelope.payload.settings, kindAmount: { strength: 'veel' } };
    envelope.payload.plannedSessions = envelope.payload.plannedSessions.map((s: { id: string }) => (s.id === 'p-extra' ? { ...s, amount: { kind: 'yoga' } } : s));
    const broken = normalizeBackupToCurrentModel(envelope);
    expect(broken.settings?.kindAmount).toBeUndefined();
    const row = broken.plannedSessions?.find((s) => s.id === 'p-extra');
    expect(row).toBeDefined();
    expect(row?.amount).toBeUndefined();
  });

  it('bij terugzetten wordt per sport samengevoegd, de keuze op dit toestel gaat voor', async () => {
    await SettingsRepo.set({ sportHandling: { padel: { role: 'count' }, swimming: { role: 'count' } } });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await SettingsRepo.set({ sportHandling: { swimming: { role: 'off' } } });
    await importEnvelope(envelope);
    expect((await SettingsRepo.get()).sportHandling).toEqual({ padel: { role: 'count' }, swimming: { role: 'off' } });
  });
});
