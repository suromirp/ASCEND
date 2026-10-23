import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import {
  wipeAllData, seedIfEmpty, syncProgramHorizon, previewProgramHorizon, PlannedSessionsRepo, TrainingGoalsRepo, SettingsRepo,
} from './database';
import type { TrainingGoal } from '../models/goals';

// Warden Logica, punten 1 en 2: een andere doeldatum of "De lange zondag" zette de
// planning stil om, ook wat je zelf had vastgezet. Nu: de sync laat vastgezette
// trainingen staan, zegt wat hij omzette, en de planning met een andere instelling
// is vooraf uit te rekenen zonder iets op te slaan (het voorstel met Akkoord).

const TODAY = '2026-10-21';
const lock = { by: 'user' as const, at: '2026-10-21T08:00:00.000Z' };

async function withGoal(date: string): Promise<TrainingGoal> {
  const g0 = (await TrainingGoalsRepo.getAll())[0];
  const goal = { ...g0, status: 'active', targetDate: date } as TrainingGoal;
  await TrainingGoalsRepo.put(goal);
  return goal;
}

describe('de planningssync en het voorbeeld vooraf', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-horizon' });
  });
  afterEach(() => vi.useRealTimers());

  it('haalt een training die je zelf vastzette nooit weg, ook niet als de doeldatum ervoor komt te liggen', async () => {
    const goal = await withGoal('2027-08-01');
    await syncProgramHorizon();
    const mine = (await PlannedSessionsRepo.getAll()).find((s) => s.scheduledDate > '2027-03-01' && s.status !== 'skipped')!;
    await PlannedSessionsRepo.put({ ...mine, lock });
    await TrainingGoalsRepo.put({ ...goal, targetDate: '2027-01-15' });
    await syncProgramHorizon();
    const after = await PlannedSessionsRepo.getAll();
    expect(after.find((s) => s.id === mine.id)).toBeTruthy();
    // Wat het systeem plande na de nieuwe doeldag is wel weg.
    expect(after.filter((s) => s.scheduledDate >= '2027-01-15' && !s.lock).length).toBe(0);
  });

  it('zet een vastgezette bergtocht niet om naar een lange duurloop', async () => {
    await withGoal('2027-08-01');
    await syncProgramHorizon();
    const hikes = (await PlannedSessionsRepo.getAll()).filter((s) => s.templateId === 'tpl_mountain_hike' && s.scheduledDate >= TODAY);
    expect(hikes.length).toBeGreaterThan(1);
    await PlannedSessionsRepo.put({ ...hikes[0], lock });
    await SettingsRepo.set({ longSundaySession: 'run' });
    const result = await syncProgramHorizon();
    const all = await PlannedSessionsRepo.getAll();
    expect(all.find((s) => s.id === hikes[0].id)?.templateId).toBe('tpl_mountain_hike');
    expect(all.find((s) => s.id === hikes[1].id)?.templateId).not.toBe('tpl_mountain_hike');
    // Niet stil: wat de sync zelf omzette staat in de melding.
    expect(result.repairs?.lines.some((l) => l.includes('Bergtocht'))).toBe(true);
  });

  it('rekent een andere instelling of doeldatum vooraf uit zonder iets op te slaan', async () => {
    const goal = await withGoal('2027-08-01');
    await syncProgramHorizon();
    const before = JSON.stringify(await PlannedSessionsRepo.getAll());
    const settingsBefore = JSON.stringify(await SettingsRepo.get());
    const run = await previewProgramHorizon({ settings: { longSundaySession: 'run' } });
    expect(run.after.filter((s) => s.templateId === 'tpl_mountain_hike' && s.scheduledDate >= TODAY).length).toBe(0);
    const earlier = await previewProgramHorizon({ goals: [{ ...goal, targetDate: '2027-01-15' }] });
    expect(earlier.after.filter((s) => s.scheduledDate >= '2027-01-15').length).toBe(0);
    expect(earlier.before.length).toBeGreaterThan(earlier.after.length);
    expect(JSON.stringify(await PlannedSessionsRepo.getAll())).toBe(before);
    expect(JSON.stringify(await SettingsRepo.get())).toBe(settingsBefore);
  });

  // Warden Planning punt 10: een overgeslagen rij na de doeldag ging stil weg,
  // buiten de melding om. Wat je zelf oversloeg blijft; een overgeslagen rij van
  // het systeem gaat, maar ongedaan maken zet hem terug.
  it('laat een rij die je zelf oversloeg staan, en zet een overgeslagen rij van het systeem in de melding voor ongedaan maken', async () => {
    const goal = await withGoal('2027-08-01');
    await syncProgramHorizon();
    const late = (await PlannedSessionsRepo.getAll()).filter((s) => s.scheduledDate > '2027-03-01' && s.status !== 'skipped');
    const mine = { ...late[0], status: 'skipped' as const, lock };
    const systems = { ...late[1], status: 'skipped' as const };
    await PlannedSessionsRepo.put(mine);
    await PlannedSessionsRepo.put(systems);
    await TrainingGoalsRepo.put({ ...goal, targetDate: '2027-01-15' });
    const result = await syncProgramHorizon();
    const after = await PlannedSessionsRepo.getAll();
    expect(after.find((s) => s.id === mine.id)).toEqual(mine);
    expect(after.find((s) => s.id === systems.id)).toBeUndefined();
    expect(result.repairs?.stored.find((s) => s.id === systems.id)).toEqual(systems);
  });
});
