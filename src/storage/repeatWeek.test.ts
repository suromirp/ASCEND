// "Deze week nog een keer": de opgeslagen vorm (Program.repeatedWeeks) en de
// planningsronde erna, op nagemaakte gegevens.
//
// Akkoord zet een maandag op het programma. De planningsronde mag daarna aanpassen
// wat het systeem plande, maar nooit wat vastgezet of historie is, en een tweede
// opstart schrijft niets. De vorm reist mee in de export en een oude back-up zonder
// het veld blijft importeerbaar (een optioneel, toegevoegd veld op Program, net als
// skippedRestWeeks: geen omzetting nodig).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { runWeeklyPrescriptionStep } from './weeklyPrescriptionStep';
import {
  wipeAllData, syncProgramHorizon, SettingsRepo, TrainingGoalsRepo, PlannedSessionsRepo, ProgramsRepo, SessionLogsRepo,
} from './database';
import {
  buildBackupEnvelope, normalizeBackupToCurrentModel, buildImportPreview, createImportPlan, createPreImportSnapshot, applyImportPlan,
  defaultActionsForMode, defaultPlanPolicyForMode, parseBackupText,
} from './backup';
import { addDays, mondayOfWeek } from '../utils/dates';
import { canRepeatWeek, withWeekRepeated } from '../engine/repeatWeek';
import type { PlannedSession } from '../models/training';

const NOW = '2026-10-21T08:00:00';
const TODAY = '2026-10-21';

async function countWrites<T>(fn: () => Promise<T>): Promise<{ result: T; writes: string[] }> {
  const writes: string[] = [];
  const spies = (['put', 'add', 'delete', 'clear'] as const).map((method) => {
    const original = IDBObjectStore.prototype[method] as (...args: unknown[]) => unknown;
    return vi.spyOn(IDBObjectStore.prototype, method).mockImplementation(function (this: IDBObjectStore, ...args: unknown[]) {
      writes.push(`${method} ${this.name}`);
      return original.apply(this, args);
    } as never);
  });
  try {
    return { result: await fn(), writes };
  } finally {
    spies.forEach((s) => s.mockRestore());
  }
}

async function boot() {
  await runBootMigrations({ seedProgram: true });
  await syncProgramHorizon();
  return runWeeklyPrescriptionStep(TODAY);
}

async function importEnvelope(payload: unknown) {
  const backup = normalizeBackupToCurrentModel(payload);
  const categorySelections = defaultActionsForMode('full_restore');
  const planPolicy = defaultPlanPolicyForMode('full_restore');
  const preview = await buildImportPreview(backup, categorySelections, planPolicy);
  const snapshot = await createPreImportSnapshot();
  const conflicts = preview.diffByCategory.flatMap((d) => d.conflicts);
  await applyImportPlan(backup, createImportPlan(backup, 'full_restore', categorySelections, planPolicy, conflicts, snapshot.id));
}

describe('een herhaalde week in de opslag', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    await wipeAllData();
    await SettingsRepo.set({ marathonRaceType: 'half', marathonTargetDate: '2027-03-20' });
    await runBootMigrations({ seedProgram: true });
    const gr5 = (await TrainingGoalsRepo.getAll()).find((g) => g.id === 'obj_gr5');
    await TrainingGoalsRepo.put({ ...gr5!, status: 'active', targetDate: '2027-08-01' });
  });
  afterEach(() => vi.useRealTimers());

  // De eerstvolgende week waarin een herhaling kan, zoals Akkoord hem zou kiezen.
  async function repeatableMonday() {
    const [program] = await ProgramsRepo.getAll();
    const monday = Array.from({ length: 12 }, (_, i) => addDays(mondayOfWeek(TODAY), 7 * (i + 1))).find((m) => canRepeatWeek(program, m))!;
    expect(monday).toBeDefined();
    return { program, monday };
  }

  async function accept() {
    await boot();
    const { program, monday } = await repeatableMonday();
    await ProgramsRepo.put(withWeekRepeated(program, monday, true));
    return monday;
  }

  it('blijft op het programma staan door de planningsrondes, en de tweede opstart schrijft niets', async () => {
    const monday = await accept();
    await boot();
    expect((await ProgramsRepo.getAll())[0].repeatedWeeks).toEqual([monday]);
    const before = await PlannedSessionsRepo.getAll();
    const { writes } = await countWrites(boot);
    expect(writes).toEqual([]);
    expect(await PlannedSessionsRepo.getAll()).toEqual(before);
  });

  it('raakt geen vastgezette sessie en geen sessie met een log aan', async () => {
    await boot();
    const { program, monday } = await repeatableMonday();
    // Sessions without a leg-swap marker: pinning one of a swapped pair drops
    // its marker on purpose (engine/raceBlock.ts#restoreLegSwaps), and the ids
    // are random, so picking one of those made this test flaky.
    const inWeek = (await PlannedSessionsRepo.getAll()).filter((s) => s.weekStartDate === monday && s.status === 'planned' && !s.raceBlock);
    const pinned = { ...inWeek[0], lock: { by: 'user' as const, at: '2026-10-21T08:00:00Z' } } as PlannedSession;
    const logged = inWeek[1];
    await PlannedSessionsRepo.put(pinned);
    await SessionLogsRepo.put({ id: 'fake_log', plannedSessionId: logged.id, templateId: logged.templateId, type: 'cardio', completedDate: logged.scheduledDate, completedAt: `${logged.scheduledDate}T18:00:00`, variant: 'full', durationMinutes: 40, source: 'manual' });
    await ProgramsRepo.put(withWeekRepeated(program, monday, true));
    await boot();
    await boot();
    const now = await PlannedSessionsRepo.getAll();
    expect(now.find((s) => s.id === pinned.id)).toEqual(pinned);
    expect(now.find((s) => s.id === logged.id)).toEqual(logged);
    expect(await SessionLogsRepo.getAll()).toHaveLength(1);
  });

  it('reist mee in de export, ook via het bestand', async () => {
    const monday = await accept();
    const envelope = await buildBackupEnvelope();
    expect(envelope.payload.program?.repeatedWeeks).toEqual([monday]);
    const file = parseBackupText(JSON.stringify(envelope));
    await wipeAllData();
    await importEnvelope(file);
    expect((await ProgramsRepo.getAll())[0].repeatedWeeks).toEqual([monday]);
  });

  it('een oude back-up zonder het veld importeert gewoon, zonder herhaalde week', async () => {
    await boot();
    const envelope = await buildBackupEnvelope();
    expect(envelope.payload.program?.repeatedWeeks).toBeUndefined();
    await wipeAllData();
    await importEnvelope(JSON.parse(JSON.stringify(envelope)));
    const [program] = await ProgramsRepo.getAll();
    expect(program).toBeDefined();
    expect(program.repeatedWeeks).toBeUndefined();
  });
});
