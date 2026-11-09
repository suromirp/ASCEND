import { describe, it, expect, beforeEach } from 'vitest';
import { MetaRepo, SessionLogsRepo, TrainingGoalsRepo, GoalMilestoneProgressRepo, wipeAllData } from './database';
import { buildBackupEnvelope } from './backupExport';
import { normalizeBackupToCurrentModel } from './backupNormalize';
import { buildImportPreview } from './backupPreview';
import { createImportPlan, createPreImportSnapshot, applyImportPlan } from './backupApply';
import { defaultActionsForMode, defaultPlanPolicyForMode } from './backupMerge';
import { migrateSkillGoals, readSkillGoalStore } from './migrations';
import { resetToDemoData } from './databaseSeed';
import { skillGoalImportNote } from './backupPreview';
import { liveSkillGoals } from '../engine/skillGoal';
import { SKILL_GOALS_KEY, addSkillGoal, loadSkillGoals, recordSkillSteps, removeSkillGoal, type SkillGoalsMeta } from './skillGoals';
import type { SessionLog, SetLog } from '../models/training';
import type { SkillGoal, SkillGoalStore } from '../models/skillGoals';

// Alles nagemaakt.
const reps = (...r: number[]): SetLog[] => r.map((x) => ({ reps: x }));
const log = (id: string, date: string, exerciseId: string, sets: SetLog[]): SessionLog => ({
  id, templateId: 'tpl_test', type: 'strength', completedDate: date, completedAt: `${date}T10:00:00.000Z`, variant: 'full', durationMinutes: 40, source: 'manual',
  strengthData: [{ exerciseId, exerciseName: exerciseId, sets }],
});
const goal = (over: Partial<SkillGoal> = {}): SkillGoal => ({ id: 'skill_a', name: 'Pull-Up', ladderId: 'pull-up', targetStep: 4, createdAt: '2026-11-01T08:00:00.000Z', updatedAt: '2026-11-01T08:00:00.000Z', ...over });
const TODAY = '2026-11-09';

async function importEnvelope(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const selections = defaultActionsForMode('full_restore');
  const policy = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, selections, policy);
  const snapshot = await createPreImportSnapshot();
  const plan = createImportPlan(backup, 'full_restore', selections, policy, preview.diffByCategory.flatMap((d) => d.conflicts), snapshot.id);
  await applyImportPlan(backup, plan);
  return backup;
}

describe('migrateSkillGoals: defensief lezen', () => {
  it('een oude back-up zonder het veld leest gelijk: niets, en niets overgeslagen', () => {
    expect(migrateSkillGoals(undefined)).toEqual({ store: undefined, skipped: 0 });
    expect(migrateSkillGoals(null)).toEqual({ store: undefined, skipped: 0 });
    expect(readSkillGoalStore(undefined)).toEqual({ goals: [], progress: [] });
  });

  it('een kapotte waarde valt weg zonder fout, de rest blijft', () => {
    expect(migrateSkillGoals('rommel')).toEqual({ store: undefined, skipped: 1 });
    const read = migrateSkillGoals({
      goals: [goal(), goal({ id: 'b', ladderId: 'planche' }), goal({ id: 'c', targetStep: 9 }), { id: 'd' }, 7, goal(), goal({ id: 'e', targetStep: 0 }), goal({ id: 'f', targetStep: 2.5 })],
      progress: [
        { id: 'p1', goalId: 'skill_a', ladderId: 'pull-up', step: 1, exerciseId: 'dead-hang', clearedDate: '2026-11-02' },
        { id: 'p2', goalId: 'skill_a', ladderId: 'pull-up', step: 1, exerciseId: 'dead-hang', clearedDate: '2026-11-03' },
        { id: 'p3', goalId: 'skill_a', ladderId: 'pull-up', step: 'twee', exerciseId: 'x', clearedDate: '2026-11-02' },
        { id: 'p4', goalId: 'skill_a', ladderId: 'pull-up', step: 2, exerciseId: 'x', clearedDate: 'gisteren' },
        { id: 'p5', goalId: 'weg', ladderId: 'pull-up', step: 2, exerciseId: 'x', clearedDate: '2026-11-02' },
      ],
    });
    // Een ladder die deze versie niet kent of een doelstap boven de ladder blijft ongewijzigd staan (verborgen bij het tonen).
    expect(read.store!.goals.map((g) => g.id)).toEqual(['skill_a', 'b', 'c']);
    expect(read.store!.goals[1]).toEqual(goal({ id: 'b', ladderId: 'planche' }));
    // Een rij van een doel dat er niet meer is blijft: gehaalde stappen gaan nooit weg.
    expect(read.store!.progress.map((p) => p.id)).toEqual(['p1', 'p5']);
    expect(read.skipped).toBe(8);
  });

  it('een doel van een nieuwere versie blijft ongewijzigd, ook met velden die deze versie niet kent', () => {
    const newer = { ...goal({ id: 'n', ladderId: 'planche', targetStep: 6 }), level: 'tuck' };
    expect(migrateSkillGoals({ goals: [newer], progress: [] }).store!.goals).toEqual([newer]);
  });

  it('een lijst die geen lijst is, is leeg', () => {
    expect(migrateSkillGoals({ goals: 'x', progress: {} })).toEqual({ store: { goals: [], progress: [] }, skipped: 0 });
  });
});

describe('de opslag: alles of niets, alleen toevoegen', () => {
  function memory(failOnSet = false): SkillGoalsMeta & { value: unknown } {
    const m = {
      value: undefined as unknown,
      get: async () => m.value,
      set: async (_k: string, v: unknown) => { if (failOnSet) throw new Error('schijf vol'); m.value = JSON.parse(JSON.stringify(v)); },
    };
    return m;
  }

  it('een nieuw doel neemt de stappen mee die je al haalde, in één keer', async () => {
    const m = memory();
    const logs = [log('l1', '2026-11-02', 'negative-chin-up', reps(5, 5, 5))];
    const store = await addSkillGoal(goal(), logs, TODAY, m);
    expect(store.goals).toHaveLength(1);
    expect(store.progress.map((p) => [p.step, p.clearedDate])).toEqual([[1, '2026-11-02'], [2, '2026-11-02']]);
  });

  it('een fout halverwege het schrijven laat alles zoals het was', async () => {
    const m = memory();
    await addSkillGoal(goal(), [], TODAY, m);
    const before = JSON.stringify(m.value);
    const failing = { ...m, set: async () => { throw new Error('schijf vol'); } };
    await expect(addSkillGoal(goal({ id: 'b', ladderId: 'dip', targetStep: 3 }), [log('l1', '2026-11-02', 'dip', reps(8, 8, 8))], TODAY, failing)).rejects.toThrow();
    await expect(recordSkillSteps([log('l2', '2026-11-03', 'pull-up', reps(8, 8, 8))], TODAY, failing)).rejects.toThrow();
    expect(JSON.stringify(m.value)).toBe(before);
    const empty = memory(true);
    await expect(addSkillGoal(goal(), [], TODAY, empty)).rejects.toThrow();
    expect(empty.value).toBeUndefined();
  });

  it('recordSkillSteps voegt alleen toe en schrijft niets als er niets bij komt', async () => {
    const m = memory();
    await addSkillGoal(goal(), [], TODAY, m);
    let writes = 0;
    const counting = { ...m, set: async (k: string, v: unknown) => { writes++; return m.set(k, v); } };
    await recordSkillSteps([], TODAY, counting);
    expect(writes).toBe(0);
    const logs = [log('l1', '2026-11-02', 'scapular-pull-up', reps(5, 5, 5))];
    const first = await recordSkillSteps(logs, TODAY, counting);
    expect(first.progress.map((p) => p.step)).toEqual([1]);
    // Een latere training op een lichtere stap haalt een gehaalde stap niet weg.
    const second = await recordSkillSteps([...logs, log('l2', '2026-11-05', 'pull-up', reps(8, 8, 8))], TODAY, counting);
    expect(second.progress.map((p) => p.step)).toEqual([1, 2, 3, 4]);
    expect(second.progress[0]).toEqual(first.progress[0]);
  });

  it('een doel dat deze versie niet kent overleeft een schrijfactie op een ander doel', async () => {
    const m = memory();
    const unknown = { ...goal({ id: 'onbekend', ladderId: 'planche', targetStep: 3 }), extra: true };
    m.value = { goals: [goal(), unknown, goal({ id: 'hoog', targetStep: 9 })], progress: [] };
    await removeSkillGoal('skill_a', '2026-11-09T09:00:00.000Z', m);
    await addSkillGoal(goal({ id: 'nieuw', ladderId: 'dip', targetStep: 2 }), [], TODAY, m);
    await recordSkillSteps([log('l1', '2026-11-02', 'pull-up', reps(8, 8, 8))], TODAY, m);
    const stored = (m.value as SkillGoalStore).goals;
    expect(stored.find((g) => g.id === 'onbekend')).toEqual(unknown);
    expect(stored.find((g) => g.id === 'hoog')).toMatchObject({ targetStep: 9 });
  });

  it('twee gelijktijdige schrijfacties lopen achter elkaar: geen van beide valt weg', async () => {
    const m = memory();
    // Een trage opslag: elke get en set wacht even, zodat twee aanroepen zonder keten elkaars stand zouden overschrijven.
    const slow: SkillGoalsMeta = {
      get: async (k) => { const v = await m.get(k); await new Promise((r) => setTimeout(r, 15)); return v; },
      set: async (k, v) => { await new Promise((r) => setTimeout(r, 15)); return m.set(k, v); },
    };
    const logs = [log('l1', '2026-11-02', 'scapular-pull-up', reps(5, 5, 5))];
    await addSkillGoal(goal(), [], TODAY, slow);
    await Promise.all([
      addSkillGoal(goal({ id: 'tweede', ladderId: 'dip', targetStep: 2 }), [], TODAY, slow),
      recordSkillSteps(logs, TODAY, slow),
    ]);
    const after = m.value as SkillGoalStore;
    expect(after.goals.map((g) => g.id)).toEqual(['skill_a', 'tweede']);
    expect(after.progress.map((p) => p.step)).toEqual([1]);
    // Een mislukte schrijfactie houdt de keten niet tegen.
    const failing: SkillGoalsMeta = { get: slow.get, set: async () => { throw new Error('schijf vol'); } };
    await expect(addSkillGoal(goal({ id: 'mis' }), [], TODAY, failing)).rejects.toThrow();
    await removeSkillGoal('tweede', '2026-11-09T10:00:00.000Z', slow);
    expect((m.value as SkillGoalStore).goals.find((g) => g.id === 'tweede')!.removedAt).toBeDefined();
  });

  it('een doel weghalen laat de gehaalde stappen en de logs ongemoeid', async () => {
    await wipeAllData();
    const logs = [log('l1', '2026-11-02', 'pull-up', reps(8, 8, 8))];
    for (const l of logs) await SessionLogsRepo.put(l);
    await addSkillGoal(goal(), logs, TODAY);
    const before = await loadSkillGoals();
    const after = await removeSkillGoal('skill_a', '2026-11-09T09:00:00.000Z');
    expect(after.goals[0].removedAt).toBe('2026-11-09T09:00:00.000Z');
    expect(after.progress).toEqual(before.progress);
    expect(await SessionLogsRepo.getAll()).toEqual(logs);
    // Een vaardigheid is geen TrainingGoal en schrijft geen GoalMilestoneProgress: de planning ziet er niets van.
    expect(await TrainingGoalsRepo.getAll()).toEqual([]);
    expect(await GoalMilestoneProgressRepo.getAll()).toEqual([]);
  });
});

describe('het doel Vaardigheid in de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('round trip: gaat mee bij exporteren en komt gelijk terug bij importeren', async () => {
    await addSkillGoal(goal(), [log('l1', '2026-11-02', 'negative-chin-up', reps(5, 5, 5))], TODAY);
    const saved = await loadSkillGoals();
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    expect(envelope.payload.skillGoals).toEqual(saved);
    expect(envelope.payload.version).toBe(5);
    await wipeAllData();
    await importEnvelope(envelope);
    expect(await loadSkillGoals()).toEqual(saved);
  });

  it('een oud bestand zonder het veld laat de vaardigheden van het toestel staan', async () => {
    const envelope = await buildBackupEnvelope();
    expect('skillGoals' in envelope.payload).toBe(false);
    await addSkillGoal(goal(), [], TODAY);
    const own = await loadSkillGoals();
    await importEnvelope(envelope);
    expect(await loadSkillGoals()).toEqual(own);
  });

  it('een kapotte waarde in het bestand valt weg, een onbekende ladder blijft (verborgen), het importeren gaat door', async () => {
    const envelope = await buildBackupEnvelope();
    const edited = { ...envelope, payload: { ...envelope.payload, skillGoals: { goals: [goal(), goal({ id: 'x', ladderId: 'onbekend' }), { id: 'y', ladderId: 'dip', targetStep: 'twee' }], progress: [{ id: 'p', step: -1 }] } } };
    const backup = await importEnvelope(edited);
    expect(backup.skippedInvalid).toBe(2);
    const after = await loadSkillGoals();
    expect(after.goals.map((g) => g.id)).toEqual(['skill_a', 'x']);
    expect(liveSkillGoals(after).map((g) => g.id)).toEqual(['skill_a']);
  });

  it('de importpreview noemt de vaardigheden en zegt dat die op het toestel blijven', () => {
    const store: SkillGoalStore = { goals: [goal(), goal({ id: 'b' })], progress: [] };
    expect(skillGoalImportNote(store, 'merge')).toBe('Deze back-up heeft 2 vaardigheden. Ze komen erbij; vaardigheden en gehaalde stappen op dit toestel blijven staan.');
    expect(skillGoalImportNote({ goals: [goal()], progress: [] }, 'replace')).toBe('Deze back-up heeft één vaardigheid. Ze komt erbij; vaardigheden en gehaalde stappen op dit toestel blijven staan.');
    expect(skillGoalImportNote(store, 'keep_current')).toBeUndefined();
    expect(skillGoalImportNote(undefined, 'merge')).toBeUndefined();
  });

  it('Alles wissen neemt de vaardigheden en de gehaalde stappen mee', async () => {
    await addSkillGoal(goal(), [log('l1', '2026-11-02', 'pull-up', reps(8, 8, 8))], TODAY);
    expect((await loadSkillGoals()).goals).toHaveLength(1);
    await resetToDemoData();
    expect(await MetaRepo.get(SKILL_GOALS_KEY)).toBeUndefined();
    expect(await loadSkillGoals()).toEqual({ goals: [], progress: [] });
  });

  it('gehaalde stappen op het toestel gaan bij importeren nooit weg', async () => {
    await addSkillGoal(goal(), [log('l1', '2026-11-02', 'pull-up', reps(8, 8, 8))], TODAY);
    const own = await loadSkillGoals();
    const incoming: SkillGoalStore = { goals: [goal({ name: 'Anders' })], progress: [] };
    const envelope = await buildBackupEnvelope();
    await importEnvelope({ ...envelope, payload: { ...envelope.payload, skillGoals: incoming } });
    const after = await loadSkillGoals();
    expect(after.progress).toEqual(own.progress);
    expect(await MetaRepo.get(SKILL_GOALS_KEY)).toBeDefined();
  });
});
