import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionLogsRepo, SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { applyImportPlan, createImportPlan, createPreImportSnapshot } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { clearStandsNow, forgetStandNow, rememberStand, restoreStandsNow, saveStandsNow, seedStandsNow, type StandIo } from './machineStands';
import { exerciseById } from '../data/exercises';
import { DEFAULT_PROFILE, resolveStrengthSettings, type GymProfile, type StrengthSettings } from '../engine/strengthSettings';
import { ownWeightsFor } from '../engine/machineWeights';
import type { SessionLog } from '../models/training';

// Nagemaakte sportschool en training. Standen schrijven gaat alles of niets, raakt nooit een log, en reist
// mee in de back-up; een oude back-up zonder standen leest zoals vroeger.

const machine = exerciseById('leg-extension')!;
const gym = (patch: Partial<GymProfile> = {}): GymProfile => ({ ...DEFAULT_PROFILE, id: 'g', name: 'Proefzaal', stackStepKg: 2.5, ...patch });
const stored = async () => (await SettingsRepo.get()).strengthModel;
const standsNow = async () => resolveStrengthSettings(await stored()).profile.exerciseStandsKg?.[machine.id];

async function importEnvelope(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const categorySelections = defaultActionsForMode('full_restore');
  const planPolicy = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, categorySelections, planPolicy);
  const snapshot = await createPreImportSnapshot();
  const conflicts = preview.diffByCategory.flatMap((d) => d.conflicts);
  await applyImportPlan(backup, createImportPlan(backup, 'full_restore', categorySelections, planPolicy, conflicts, snapshot.id));
}

const strengthLog: SessionLog = {
  id: 'kracht-1', templateId: 'tpl', type: 'strength', completedDate: '2026-11-01', completedAt: '2026-11-01T10:00:00.000Z', variant: 'full', durationMinutes: 50, source: 'manual',
  gymProfileId: 'g',
  exercises: [{ exerciseName: 'Leg Extension', exerciseId: machine.id, sets: [{ reps: 10, weightKg: 77 }, { reps: 10, weightKg: 7 }] }],
} as SessionLog;

describe('standen wegschrijven', () => {
  beforeEach(async () => {
    await wipeAllData();
    await SettingsRepo.set({ strengthModel: { activeProfileId: 'g', profiles: [gym()] } });
  });

  it('onthoudt een stand, en een training die je sluit en opent heeft hem nog', async () => {
    expect(await rememberStand({ exercise: machine, weightKg: 20, remember: true })).toEqual({ kind: 'learned', kg: 20 });
    expect(await standsNow()).toEqual({ kg: [20] });
  });

  it('Terugdraaien haalt alleen die stand weg', async () => {
    await rememberStand({ exercise: machine, weightKg: 14, remember: true });
    await rememberStand({ exercise: machine, weightKg: 20, remember: true });
    expect(await forgetStandNow({ exercise: machine, weightKg: 20 })).toEqual({ kind: 'forgotten', kg: 20 });
    expect(await standsNow()).toEqual({ kg: [14] });
    expect(await forgetStandNow({ exercise: machine, weightKg: 20 })).toEqual({ kind: 'none', reason: 'gone' });
  });

  it('twee tikken kort na elkaar: geen stand gaat verloren', async () => {
    await Promise.all([rememberStand({ exercise: machine, weightKg: 14, remember: true }), rememberStand({ exercise: machine, weightKg: 23, remember: true })]);
    expect(await standsNow()).toEqual({ kg: [14, 23] });
  });

  it('een fout halverwege het schrijven laat alles zoals het was', async () => {
    await SettingsRepo.set({ strengthModel: { activeProfileId: 'g', profiles: [gym({ exerciseWeightsKg: { [machine.id]: [10, 20] } })] } });
    const before = await stored();
    const failing: StandIo = { read: stored, write: () => Promise.reject(new Error('schijf vol')) };
    expect(await rememberStand({ exercise: machine, weightKg: 25, remember: true }, failing)).toEqual({ kind: 'failed' });
    expect(await stored()).toEqual(before);
    expect(ownWeightsFor(resolveStrengthSettings(await stored()).profile, machine)).toEqual([10, 20]);
    // Daarna werkt het weer gewoon.
    expect(await rememberStand({ exercise: machine, weightKg: 25, remember: true })).toEqual({ kind: 'learned', kg: 25 });
  });

  it('een schrijfactie die blijft hangen heeft een grens in tijd', async () => {
    const hanging: StandIo = { read: stored, write: () => new Promise(() => undefined) };
    vi.useFakeTimers();
    try {
      const pending = rememberStand({ exercise: machine, weightKg: 30, remember: true }, hanging);
      await vi.advanceTimersByTimeAsync(5000);
      expect(await pending).toEqual({ kind: 'failed' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('inlezen uit je trainingen één keer; een weggestreepte stand komt niet terug; het log blijft gelijk', async () => {
    await SessionLogsRepo.put(strengthLog);
    const logBefore = JSON.stringify(await SessionLogsRepo.getAll());
    expect(await seedStandsNow({ exercise: machine, remember: true, usedKg: [77, 7] })).toEqual({ kind: 'seeded' });
    expect(await standsNow()).toEqual({ kg: [7, 77] });
    await forgetStandNow({ exercise: machine, weightKg: 77 });
    expect(await seedStandsNow({ exercise: machine, remember: true, usedKg: [77, 7] })).toEqual({ kind: 'none', reason: 'known' });
    expect(await standsNow()).toEqual({ kg: [7] });
    expect(JSON.stringify(await SessionLogsRepo.getAll())).toBe(logBefore);
  });

  it('een training zonder toestel en de instelling uit schrijven niets', async () => {
    const before = await stored();
    expect(await rememberStand({ exercise: exerciseById('back-squat'), weightKg: 60, remember: true })).toEqual({ kind: 'none', reason: 'no_stack' });
    expect(await rememberStand({ exercise: machine, weightKg: 20, remember: false, usedKg: [7] })).toEqual({ kind: 'none', reason: 'off' });
    expect(await stored()).toEqual(before);
  });
});

describe('standen in de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('gaan heen en terug', async () => {
    const mine: StrengthSettings = { activeProfileId: 'g', profiles: [gym({ exerciseStandsKg: { [machine.id]: { kg: [7, 14, 23, 32], only: true }, 'cable-fly': { kg: [] } } })] };
    await SettingsRepo.set({ strengthModel: mine });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    await importEnvelope(envelope);
    expect(resolveStrengthSettings(await stored()).profile.exerciseStandsKg).toEqual({ [machine.id]: { kg: [7, 14, 23, 32], only: true }, 'cable-fly': { kg: [] } });
  });

  it('een oude back-up zonder standen, met lijst en bereik (ook in pond), leest zoals vroeger', async () => {
    await SettingsRepo.set({ strengthModel: { activeProfileId: 'g', profiles: [gym()] } });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    const oldProfile = { id: 'g', name: 'Proefzaal', barsKg: [20], platesKg: [5], dumbbells: { startKg: 2, stepKg: 2, upToKg: 10, thenStepKg: 2.5, maxKg: 50 }, stackStepKg: 2.5,
      exerciseWeightsKg: { [machine.id]: [4.5, 9] }, exerciseWeightRanges: { 'cable-fly': [{ startKg: 10, endKg: 30, stepKg: 10, unit: 'lb' }] } };
    envelope.payload.settings.strengthModel = { activeProfileId: 'g', profiles: [oldProfile] };
    await wipeAllData();
    await importEnvelope(envelope);
    const profile = resolveStrengthSettings(await stored()).profile;
    expect(profile.exerciseStandsKg).toBeUndefined();
    expect(profile.stackStepKg).toBe(2.5);
    expect(ownWeightsFor(profile, machine)).toEqual([4.5, 9]);
    expect(ownWeightsFor(profile, exerciseById('cable-fly'))).toEqual([4.5, 9.1, 13.6]);
  });
});

describe('het blad: opslaan en wissen', () => {
  beforeEach(async () => {
    await wipeAllData();
    await SettingsRepo.set({ strengthModel: { activeProfileId: 'g', profiles: [gym()] } });
  });

  it('slaat de standen op en geeft de nieuwe instellingen mee', async () => {
    const out = await saveStandsNow({ exercise: machine, kg: [23, 7, 14], only: true });
    expect(out.kind).toBe('saved');
    expect(await standsNow()).toEqual({ kg: [7, 14, 23], only: true });
  });

  it('Standen wissen laat een lege lijst, en inlezen uit je logs komt niet terug', async () => {
    await saveStandsNow({ exercise: machine, kg: [7, 14], only: false });
    expect((await clearStandsNow({ exercise: machine })).kind).toBe('saved');
    expect(await standsNow()).toEqual({ kg: [] });
    expect(await seedStandsNow({ exercise: machine, remember: true, usedKg: [7, 77] })).toEqual({ kind: 'none', reason: 'known' });
  });

  it('Standen wissen en dan Terugdraaien zet de standen terug; een mislukte poging laat alles zoals het was', async () => {
    await saveStandsNow({ exercise: machine, kg: [7, 14], only: true });
    const out = await clearStandsNow({ exercise: machine });
    if (out.kind !== 'saved') throw new Error('wissen lukte niet');
    expect(await standsNow()).toEqual({ kg: [] });
    const wiped = await stored();
    const failing: StandIo = { read: stored, write: () => Promise.reject(new Error('schijf vol')) };
    expect(await restoreStandsNow({ before: out.before }, failing)).toEqual({ kind: 'failed' });
    expect(await stored()).toEqual(wiped);
    expect((await restoreStandsNow({ before: out.before })).kind).toBe('saved');
    expect(await standsNow()).toEqual({ kg: [7, 14], only: true });
  });

  it('meer dan 40 standen wordt niet opgeslagen', async () => {
    const before = await stored();
    expect(await saveStandsNow({ exercise: machine, kg: Array.from({ length: 41 }, (_, i) => i + 1), only: false })).toEqual({ kind: 'too_many' });
    expect(await stored()).toEqual(before);
  });

  it('een lezing die blijft hangen houdt de wachtrij niet vast: Opslaan en Standen wissen komen daarna aan de beurt', async () => {
    vi.useFakeTimers();
    try {
      const hangingRead: StandIo = { read: () => new Promise(() => undefined), write: () => Promise.resolve() };
      const first = rememberStand({ exercise: machine, weightKg: 20, remember: true }, hangingRead);
      const second = saveStandsNow({ exercise: machine, kg: [7, 14], only: false });
      await vi.advanceTimersByTimeAsync(5000);
      expect(await first).toEqual({ kind: 'failed' });
      await vi.advanceTimersByTimeAsync(100);
      expect((await second).kind).toBe('saved');
    } finally {
      vi.useRealTimers();
    }
    expect(await standsNow()).toEqual({ kg: [7, 14] });
  });

  it('een mislukte schrijfactie, of een schrijfactie die blijft hangen, geeft een duidelijke uitkomst en laat alles zoals het was', async () => {
    await saveStandsNow({ exercise: machine, kg: [7, 14], only: false });
    const before = await stored();
    const failing: StandIo = { read: stored, write: () => Promise.reject(new Error('schijf vol')) };
    expect(await saveStandsNow({ exercise: machine, kg: [7], only: false }, failing)).toEqual({ kind: 'failed' });
    expect(await clearStandsNow({ exercise: machine }, failing)).toEqual({ kind: 'failed' });
    vi.useFakeTimers();
    try {
      const hanging: StandIo = { read: stored, write: () => new Promise(() => undefined) };
      const pending = saveStandsNow({ exercise: machine, kg: [7], only: false }, hanging);
      await vi.advanceTimersByTimeAsync(5000);
      expect(await pending).toEqual({ kind: 'failed' });
    } finally {
      vi.useRealTimers();
    }
    expect(await stored()).toEqual(before);
  });
});
