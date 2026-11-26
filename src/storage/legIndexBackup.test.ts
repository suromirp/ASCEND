import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { createImportPlan, createPreImportSnapshot, applyImportPlan } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { migrateLegAnswers, migrateLegFactorLog } from './migrations';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { currentLegFactor, legIndexSafeFactor, legIndexShownFactor, resolveLegLearning } from '../engine/legIndexLearning';
import { legFatigueOn } from '../engine/legFatigue';
import type { LegAnswer, LegFactorEntry } from '../models/legIndex';
import type { MorningCheckIn } from '../models/checkIn';
import type { SessionLog } from '../models/training';
import { addDays, todayISO } from '../utils/dates';

// Je eigen beenindex in de back-up (docs/beslissingen/2026-11-26-beenindex-leert.md). Alle data is nagemaakt.

async function importEnvelope(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const categorySelections = defaultActionsForMode('full_restore');
  const planPolicy = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, categorySelections, planPolicy);
  const snapshot = await createPreImportSnapshot();
  const plan = createImportPlan(backup, 'full_restore', categorySelections, planPolicy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
  return backup;
}

const checks: MorningCheckIn[] = [
  { date: '2026-10-01', legs: 'stijf', energy: 'gewoon' },
  { date: '2026-10-02', allNormal: true },
  { date: '2026-10-03', legs: 'spierpijn', soreWhere: 'upper' },
];
const answers: LegAnswer[] = [{ date: '2026-08-01', legs: 'stijf', from: 'zelf' }, { date: '2026-08-02', legs: 'goed' }];
const log: LegFactorEntry[] = [{ at: '2026-09-01T07:00:00.000Z', factor: 1.15, source: 'akkoord' }];

// De standaardindex: wat de app zonder de nieuwe velden rekent, is precies het model van voor deze ronde.
const { templates } = buildDefaultProgramData();
const lowerA = (date: string): SessionLog => ({ id: `l-${date}`, templateId: 'tpl_lower_a', type: 'strength', completedDate: date, completedAt: `${date}T10:00:00Z`, variant: 'full', durationMinutes: 60, rpe: 8, source: 'manual' });
function standardIndex(factor: number) {
  const D = '2026-10-10';
  return legFatigueOn(addDays(D, 1), { logs: [lowerA(D)], plannedSessions: [], templates, today: D, factor }).index;
}

describe('je eigen beenindex in de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('een nagemaakte v5-back-up zonder de velden importeert zoals eerst en geeft de standaardindex', async () => {
    const v5 = { backupSchemaVersion: 5, createdAt: '2026-10-05T08:00:00.000Z', payload: { version: 5, program: null, templates: [], plannedSessions: [], sessionLogs: [], trainingGoals: [], goalMilestones: [], goalMilestoneProgress: [], capabilityEvidence: [], injuryNotes: [], settings: { morningCheckIns: checks, restDay: 3 } } };
    const backup = await importEnvelope(v5);
    expect(backup.skippedInvalid).toBe(0);
    const s = await SettingsRepo.get();
    expect(s.morningCheckIns).toEqual(checks);
    expect(s.legAnswers).toBeUndefined();
    expect(s.legFactorLog).toBeUndefined();
    expect(s.legIndexLearning).toBeUndefined();
    expect(resolveLegLearning(s.legIndexLearning)).toBe('aan');
    const k = currentLegFactor(s.legFactorLog, resolveLegLearning(s.legIndexLearning));
    expect(k).toBe(1);
    expect(standardIndex(legIndexSafeFactor(k))).toBe(standardIndex(1));
    expect(standardIndex(legIndexShownFactor(k))).toBe(legFatigueOn('2026-10-11', { logs: [lowerA('2026-10-10')], plannedSessions: [], templates, today: '2026-10-10' }).index);
  });

  it('een v6-back-up van voor deze ronde importeert zoals eerst en laat het toestel met rust', async () => {
    await SettingsRepo.set({ morningCheckIns: checks });
    const envelope = await buildBackupEnvelope();
    expect(envelope.backupSchemaVersion).toBe(6);
    expect(envelope.payload.settings.legAnswers).toBeUndefined();
    await SettingsRepo.set({ legAnswers: answers, legFactorLog: log });
    const backup = await importEnvelope(envelope);
    expect(backup.skippedInvalid).toBe(0);
    const s = await SettingsRepo.get();
    expect(s.legAnswers).toEqual(answers);
    expect(s.legFactorLog).toEqual(log);
  });

  it('gaat heen en terug door een export en een volledig terugzetten', async () => {
    await SettingsRepo.set({ legAnswers: answers, legFactorLog: log, legIndexLearning: 'uit', morningCheckIns: [{ ...checks[0], legsFrom: 'voorstel' }] });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    await wipeAllData();
    await importEnvelope(envelope);
    const s = await SettingsRepo.get();
    expect(s.legAnswers).toEqual(answers);
    expect(s.legFactorLog).toEqual(log);
    expect(s.legIndexLearning).toBe('uit');
    expect(s.morningCheckIns?.[0].legsFrom).toBe('voorstel');
  });

  it('terugzetten voegt samen; een nieuwer besluit op het toestel wint van een oud Akkoord in de back-up', async () => {
    await SettingsRepo.set({ legFactorLog: log, legAnswers: [answers[0]] });
    const envelope = await buildBackupEnvelope();
    const later: LegFactorEntry = { at: '2026-10-01T07:00:00.000Z', factor: 1, source: 'standaard' };
    await SettingsRepo.set({ legFactorLog: [...log, later], legAnswers: [{ ...answers[0], legs: 'fris' }, answers[1]] });
    await importEnvelope(envelope);
    const s = await SettingsRepo.get();
    expect(s.legFactorLog).toEqual([...log, later]);
    expect(currentLegFactor(s.legFactorLog)).toBe(1);
    expect(s.legAnswers).toEqual([{ ...answers[0], legs: 'fris' }, answers[1]]);
  });

  it('een kapotte rij valt weg en telt; een kapotte keuze ook', async () => {
    const a = migrateLegAnswers([answers[0], { date: 'nooit', legs: 'fris' }, { date: '2026-08-03', legs: 'heel erg' }, { date: '2026-08-04', legs: 'fris', upper: true, from: 'raar' }, { ...answers[0], legs: 'flink' }]);
    expect(a.list).toEqual([answers[0], { date: '2026-08-04', legs: 'fris' }]);
    expect(a.skipped).toBe(2);
    expect(migrateLegAnswers('oops')).toEqual({ list: undefined, skipped: 1 });
    expect(migrateLegAnswers(undefined)).toEqual({ list: undefined, skipped: 0 });
    const f = migrateLegFactorLog([log[0], { at: 'gisteren', factor: 1, source: 'akkoord' }, { at: log[0].at, factor: 'veel', source: 'akkoord' }, { at: log[0].at, factor: 1, source: 'misschien' }]);
    expect(f.list).toEqual(log);
    expect(f.skipped).toBe(3);
    const envelope = await buildBackupEnvelope();
    const backup = normalizeBackupToCurrentModel({ ...envelope, payload: { ...envelope.payload, settings: { legAnswers: [answers[0], 7], legFactorLog: [log[0], null], legIndexLearning: 'soms' } } });
    expect(backup.settings.legAnswers).toEqual([answers[0]]);
    expect(backup.settings.legFactorLog).toEqual(log);
    expect('legIndexLearning' in backup.settings).toBe(false);
    expect(backup.skippedInvalid).toBe(3);
  });
});

describe('het archief bij het opslaan van de ochtendchecks', () => {
  beforeEach(async () => {
    await wipeAllData();
  });
  const today = todayISO();
  const day = (i: number): MorningCheckIn => ({ date: addDays(today, -60 + i), legs: i % 2 ? 'fris' : 'stijf', ...(i % 3 === 0 ? { legsFrom: 'zelf' as const } : {}) });

  it('wat vooraan uit de 60 valt, komt in legAnswers; de rest blijft in de ochtendchecks', async () => {
    const sixty = Array.from({ length: 60 }, (_, i) => day(i));
    await SettingsRepo.set({ morningCheckIns: sixty });
    expect((await SettingsRepo.get()).legAnswers).toBeUndefined();
    await SettingsRepo.set({ morningCheckIns: [...sixty, day(60)].slice(-60) });
    const s = await SettingsRepo.get();
    expect(s.legAnswers).toEqual([{ date: day(0).date, legs: 'stijf', from: 'zelf' }]);
    expect(s.morningCheckIns).toHaveLength(60);
  });

  it('vandaag ongedaan maken laat het archief met rust', async () => {
    await SettingsRepo.set({ morningCheckIns: [day(58), day(59), day(60)] });
    await SettingsRepo.set({ morningCheckIns: [day(58), day(59)] });
    expect((await SettingsRepo.get()).legAnswers).toBeUndefined();
  });
});
