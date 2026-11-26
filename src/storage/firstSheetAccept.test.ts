import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runBootMigrations } from './bootMigrations';
import { wipeAllData, seedIfEmpty, syncProgramHorizon, PlannedSessionsRepo, SettingsRepo, ProgramsRepo, MetaRepo } from './database';
import { applyHorizonPlanNow, computeHorizonPlan } from './horizonPlan';
import { REENTRY_TITLE, REENTRY_WHY } from '../engine/reentry';
import { FIRST_SHEET_FAILED_NOTE } from '../engine/adviceFirst';

// Belangrijk advies als blad (I-157): Akkoord in het blad past het plan van een rustiger instap meteen toe, via
// dezelfde weg als het voorstel (storage/horizonPlan.ts). Faalt het halverwege, dan staat alles weer zoals het was en
// is het advies niet beantwoord; het blad zegt dat er niets is aangepast. Testdata is nagemaakt.

const TODAY = '2026-11-26';
const rows = async () => JSON.stringify([...(await PlannedSessionsRepo.getAll())].sort((a, b) => a.id.localeCompare(b.id)));

describe('Akkoord in het blad dat halverwege faalt', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${TODAY}T08:00:00`));
    await wipeAllData();
    await seedIfEmpty();
    await runBootMigrations({ build: 'test-first-sheet' });
    await syncProgramHorizon();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('laat de planning, de instellingen en de antwoorden staan, en de uitkomst zegt niets aangepast', async () => {
    const week = { from: TODAY, until: '2026-12-02', factor: 0.75 };
    const plan = await computeHorizonPlan({
      title: REENTRY_TITLE, why: 'Rustiger instap na een pauze.', explanation: REENTRY_WHY, trigger: 'reentry_planned',
      settings: { reentryWeeks: [week] },
    });
    const planBefore = await rows();
    const programBefore = JSON.stringify(await ProgramsRepo.getAll());
    const settingsBefore = (await SettingsRepo.get()).reentryWeeks;
    const answersBefore = await MetaRepo.get('adviceResponses');
    let calls = 0;
    const sync: typeof syncProgramHorizon = async () => {
      calls++;
      // De instelling en de rijen staan al; dan faalt de ronde.
      throw new Error('de ronde faalt');
    };
    const result = await applyHorizonPlanNow(plan, { sync });
    expect(calls).toBe(1);
    expect(result.status).toBe('failed');
    expect(await rows()).toBe(planBefore);
    expect(JSON.stringify(await ProgramsRepo.getAll())).toBe(programBefore);
    expect((await SettingsRepo.get()).reentryWeeks).toEqual(settingsBefore);
    expect(await MetaRepo.get('adviceResponses')).toEqual(answersBefore);
    // De zin van het blad als het niet lukt is dezelfde als die van het voorstel (components/useHorizonChange.tsx).
    expect(FIRST_SHEET_FAILED_NOTE).toBe('Het lukte niet om je planning nu bij te werken. Er is niets aangepast; probeer het zo nog eens.');
  });
});
